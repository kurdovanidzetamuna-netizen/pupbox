import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SmsNotify } from '../sms/sms-notify';
import { notify } from '../notifications/notify';
import { reserveStock, releaseStock } from '../products/stock';
import { couponDiscount } from '../coupons/coupon-discount';
import { wasPaid } from './order-lifecycle';
import { OrdersService } from './orders.service';

/** Admin changes what's in an order, where it goes and for which dog — before it ships. */
@Injectable()
export class OrderEditService {
  constructor(private prisma: PrismaService, private audit: AuditService, private smsNotify: SmsNotify, private orders: OrdersService) {}

  /**
   * Admin edits an order that hasn't left yet: where it goes, which dog it's
   * for, the gift card, and its shop products. Stock and money follow:
   * - Unpaid: products can be added, changed or removed; held stock and the
   *   amount to pay move with them.
   * - Paid (not shipped): products can only be reduced or removed — the
   *   customer can't be charged more from here — and what comes off the total
   *   is added to "refund due", with the stock going back on the shelf.
   * Plans and built boxes are left as they are (they drive subscriptions).
   */
  async adminEdit(id: string, input: AdminOrderEdit, adminUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payments: true, items: { include: { subscriptionPlan: { select: { durationValue: true, durationUnit: true, tierId: true } } } }, coupon: true, address: true, subscription: { select: { id: true, addressId: true, dogId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (['SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(order.status)) {
      throw new BadRequestException(`An order that is ${order.status.toLowerCase()} can't be edited — only its notes and tracking.`);
    }
    const paid = wasPaid(order.payments);
    const changes: string[] = [];
    const data: Prisma.OrderUncheckedUpdateInput = {};

    // ── Products ──
    let lineOps: (() => Promise<unknown>)[] = [];
    let stockHold: { productId: string; quantity: number; name: string }[] = [];
    let stockFree: { productId: string; quantity: number }[] = [];
    let stockBack: { productId: string; quantity: number }[] = [];
    let newSubtotal = Number(order.subtotal);
    let extraLines: { productId: string; quantity: number }[] = [];
    if (input.items) {
      const editable = order.items.filter((i) => i.productId && !i.customBoxId && !i.payoutId);
      const fixed = order.items.filter((i) => !editable.includes(i));
      const wanted = new Map<string, number>();
      const added: { productId: string; quantity: number }[] = [];
      for (const l of input.items) {
        const q = Math.floor(Number(l.quantity));
        if (!(q >= 0) || q > 999) throw new BadRequestException('Quantities must be between 0 and 999.');
        if (l.id) {
          if (!editable.some((i) => i.id === l.id)) throw new BadRequestException('One of the lines can\u2019t be changed here.');
          wanted.set(l.id, q);
        } else if (l.productId && q > 0) {
          added.push({ productId: l.productId, quantity: q });
        }
      }
      // Paid: anything added (or more of something) can't be charged on this
      // payment — it becomes an extra order the customer pays by link.
      const extras: { productId: string; quantity: number }[] = paid ? [...added] : [];
      if (paid) added.length = 0;

      let subtotal = fixed.reduce((n, i) => n + Number(i.total), 0);
      // The order's lines after the edit, so the coupon prices what it covers.
      const after: { price: any; quantity: number; productId?: string | null; subscriptionPlanId?: string | null; customBoxId?: string | null }[] = [...fixed];
      for (const line of editable) {
        const q = wanted.has(line.id) ? wanted.get(line.id)! : 0;
        const delta = q - line.quantity;
        if (paid && delta > 0) {
          extras.push({ productId: line.productId!, quantity: delta });
          subtotal += Number(line.price) * line.quantity;
          after.push(line);
          continue;
        }
        if (delta !== 0) {
          changes.push(q === 0 ? `removed ${line.name} ×${line.quantity}` : `${line.name} ${line.quantity} → ${q}`);
          if (paid) stockBack.push({ productId: line.productId!, quantity: -delta });
          else if (delta > 0) stockHold.push({ productId: line.productId!, quantity: delta, name: line.name });
          else stockFree.push({ productId: line.productId!, quantity: -delta });
          lineOps.push(() => (q === 0
            ? this.prisma.orderItem.delete({ where: { id: line.id } })
            : this.prisma.orderItem.update({ where: { id: line.id }, data: { quantity: q, total: +(Number(line.price) * q).toFixed(2) } })));
        }
        subtotal += Number(line.price) * q;
        if (q) after.push({ ...line, quantity: q });
      }
      if (added.length) {
        const products = await this.prisma.product.findMany({ where: { id: { in: added.map((a) => a.productId) }, deletedAt: null }, include: { supply: { select: { sellerPrice: true } } } });
        for (const a of added) {
          const p: any = products.find((x) => x.id === a.productId);
          if (!p) throw new BadRequestException('A product you added no longer exists.');
          const price = Number(p.salePrice ?? p.price);
          subtotal += price * a.quantity;
          after.push({ price, quantity: a.quantity, productId: p.id });
          stockHold.push({ productId: p.id, quantity: a.quantity, name: p.name });
          changes.push(`added ${p.name} ×${a.quantity}`);
          lineOps.push(() => this.prisma.orderItem.create({ data: {
            orderId: id, productId: p.id, name: p.name, sku: p.sku, price, quantity: a.quantity, total: +(price * a.quantity).toFixed(2),
            sellerId: p.sellerId ?? null, sellerPrice: p.supply?.sellerPrice ?? null,
          } }));
        }
      }
      extraLines = extras;
      const linesLeft = fixed.length + editable.filter((l) => (wanted.get(l.id) ?? 0) > 0).length + added.length;
      if (!linesLeft) throw new BadRequestException('An order needs at least one item. To drop everything, cancel the order instead.');

      if (lineOps.length) {
        newSubtotal = +subtotal.toFixed(2);
        const off = order.coupon ? couponDiscount(order.coupon, after, Number(order.deliveryCost), { gift: order.isGift }) : null;
        const discount = off ? off.items + off.delivery : Math.min(Number(order.discountAmount), newSubtotal);
        const total = +(off
          ? Math.max(0, newSubtotal - off.items) + Number(order.deliveryCost) - off.delivery
          : Math.max(0, newSubtotal - discount) + Number(order.deliveryCost)).toFixed(2);
        data.subtotal = newSubtotal;
        data.discountAmount = +discount.toFixed(2);
        data.total = total;
        if (paid && total < Number(order.total)) {
          data.refundDueAmount = +(Number(order.refundDueAmount ?? 0) + Number(order.total) - total).toFixed(2);
          changes.push(`refund due +₾${(Number(order.total) - total).toFixed(2)}`);
        }
        const productsLeft = editable.some((l) => (wanted.get(l.id) ?? 0) > 0) || added.length > 0;
        if (order.type === 'MIXED' && !productsLeft && fixed.some((i) => i.subscriptionPlanId)) data.type = 'SUBSCRIPTION';
        if (order.type === 'SUBSCRIPTION' && productsLeft) data.type = 'MIXED';
      }
    }

    // ── Where it goes ──
    let addressOp: (() => Promise<unknown>) | null = null;
    const show = (a: any) => (a ? [a.addressLine1, a.addressLine2, a.city].filter(Boolean).join(', ') : '—');
    if (input.addressId && input.addressId !== order.addressId) {
      // One of the customer's saved addresses.
      const a = await this.prisma.address.findFirst({ where: { id: input.addressId, userId: order.userId, deletedAt: null } });
      if (!a) throw new BadRequestException('That address isn’t on this customer’s account.');
      changes.push(`address: ${show(order.address)} → ${show(a)}`);
      const followPlan = !!input.addressForPlan && !!order.subscription;
      addressOp = async () => {
        await this.prisma.order.update({ where: { id }, data: { addressId: a.id } });
        if (followPlan) {
          await this.prisma.customerSubscription.update({ where: { id: order.subscription!.id }, data: { addressId: a.id } });
          await this.prisma.boxShipment.updateMany({ where: { subscriptionId: order.subscription!.id, status: 'TO_PACK' }, data: { addressId: a.id } });
        }
      };
    } else if (input.address) {
      const a = input.address;
      for (const k of ['firstName', 'lastName', 'phone', 'city', 'addressLine1'] as const) {
        if (!String(a[k] ?? '').trim()) throw new BadRequestException('Name, phone, city and street are needed.');
      }
      const fields = {
        firstName: a.firstName.trim(), lastName: a.lastName.trim(), phone: a.phone.trim(), city: a.city.trim(),
        addressLine1: a.addressLine1.trim(), addressLine2: a.addressLine2?.trim() || null, postalCode: a.postalCode?.trim() || null,
      };
      const same = order.address && (Object.keys(fields) as (keyof typeof fields)[]).every((k) => (order.address as any)[k] === fields[k]);
      if (!same) {
        changes.push(`address: ${show(order.address)} → ${show(fields)}${input.newAddress ? ' (new, saved to the customer’s addresses)' : ''}`);
        const followPlan = !!input.addressForPlan && !!order.subscription;
        addressOp = async () => {
          // A new address is added to the customer's book (they see it in their account).
          // Otherwise: changed in place only when nothing else uses it; else this order gets its own copy.
          const shared = input.newAddress ? 1 : order.addressId ? (await this.prisma.order.count({ where: { addressId: order.addressId, id: { not: id } } }))
            + (await this.prisma.customerSubscription.count({ where: { addressId: order.addressId, ...(followPlan ? { id: { not: order.subscription!.id } } : {}) } })) : 1;
          let addressId = order.addressId;
          if (order.addressId && !shared) await this.prisma.address.update({ where: { id: order.addressId }, data: { ...fields, latitude: null, longitude: null } });
          else addressId = (await this.prisma.address.create({ data: { userId: order.userId, ...fields, ...(order.isGift ? { isGift: true, label: `Gift · ${order.giftRecipientName || 'friend'}`.slice(0, 40) } : {}) } })).id;
          if (addressId !== order.addressId) await this.prisma.order.update({ where: { id }, data: { addressId } });
          if (followPlan && addressId) {
            await this.prisma.customerSubscription.update({ where: { id: order.subscription!.id }, data: { addressId } });
            await this.prisma.boxShipment.updateMany({ where: { subscriptionId: order.subscription!.id, status: 'TO_PACK' }, data: { addressId } });
          }
        };
      }
    }

    // ── Which dog ──
    if (input.dogId !== undefined && input.dogId !== order.dogId) {
      if (input.dogId) {
        const dog = await this.prisma.dog.findFirst({ where: { id: input.dogId, userId: order.userId, deletedAt: null } });
        if (!dog) throw new BadRequestException('That dog isn\u2019t on this customer\u2019s account.');
        const was = order.dogId ? (await this.prisma.dog.findUnique({ where: { id: order.dogId }, select: { name: true } }))?.name : null;
        changes.push(`dog: ${was ?? '—'} → ${dog.name}`);
      } else changes.push('dog removed');
      data.dogId = input.dogId;
    }

    // ── Gift card ──
    if (order.isGift) {
      if (input.giftRecipientName !== undefined && input.giftRecipientName.trim() !== (order.giftRecipientName ?? '')) {
        if (!input.giftRecipientName.trim()) throw new BadRequestException('The gift needs the recipient\u2019s name.');
        data.giftRecipientName = input.giftRecipientName.trim(); changes.push('gift recipient');
      }
      if (input.giftMessage !== undefined && input.giftMessage.trim() !== (order.giftMessage ?? '')) {
        data.giftMessage = input.giftMessage.trim() || null; changes.push('gift message');
      }
    }

    if (!changes.length && !extraLines.length) return this.orders.adminGetOne(id);

    // Stock first: if a product ran out, nothing else changes.
    if (stockHold.length) await reserveStock(this.prisma, stockHold, 'admin');
    try {
      for (const op of lineOps) await op();
    } catch (e) {
      if (stockHold.length) await releaseStock(this.prisma, stockHold);
      throw e;
    }
    if (stockFree.length) await releaseStock(this.prisma, stockFree);
    for (const b of stockBack) {
      const inv = await this.prisma.inventory.update({ where: { productId: b.productId }, data: { quantity: { increment: b.quantity } } });
      if (inv.quantity > 0) await this.prisma.product.updateMany({ where: { id: b.productId, status: 'OUT_OF_STOCK' }, data: { status: 'ACTIVE' } });
    }
    if (addressOp) await addressOp();

    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const line = `Edited by admin ${stamp}: ${changes.join('; ')}${input.reason?.trim() ? ` — ${input.reason.trim()}` : ''}`;
    await this.prisma.order.update({ where: { id }, data: { ...data, internalNotes: [order.internalNotes, line].filter(Boolean).join('\n') } });
    if (data.total !== undefined && !paid) {
      // What the customer will be asked to pay follows the new total.
      await this.prisma.payment.updateMany({ where: { orderId: id, status: 'PENDING' }, data: { amount: data.total as number } });
    }
    if (data.dogId !== undefined && order.subscription) {
      await this.prisma.customerSubscription.update({ where: { id: order.subscription.id }, data: { dogId: data.dogId as string | null } });
    }
    let extra: { id: string; total: number } | null = null;
    if (extraLines.length) extra = await this.createExtraCharge(order, extraLines, input.reason);
    if (extra) changes.push(`extra payment of ₾${extra.total.toFixed(2)} sent to the customer (order #${extra.id.slice(-8).toUpperCase()})`);
    await this.audit.log({ adminUserId, action: 'UPDATE', module: 'orders', entityType: 'Order', entityId: id, before: { total: Number(order.total) }, after: { total: data.total ?? Number(order.total), changes } });
    return { ...(await this.orders.adminGetOne(id)), changes };
  }

  /**
   * Things added to a paid order: a separate order for just those, linked to
   * it, that the customer pays by link (text + account). Stock is held for a
   * week; once paid, it ships with the original. Each order is one payment,
   * so the books stay simple.
   */
  private async createExtraCharge(order: { id: string; userId: string; addressId: string | null; dogId: string | null; internalNotes: string | null; orderNumber: string }, lines: { productId: string; quantity: number }[], reason?: string) {
    const products = await this.prisma.product.findMany({ where: { id: { in: lines.map((l) => l.productId) }, deletedAt: null }, include: { supply: { select: { sellerPrice: true } } } });
    const rows = lines.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      if (!p) throw new BadRequestException('A product you added no longer exists.');
      const price = Number(p.salePrice ?? p.price);
      return { productId: p.id, name: p.name, sku: p.sku, price, quantity: l.quantity, total: +(price * l.quantity).toFixed(2), sellerId: p.sellerId ?? null, sellerPrice: p.supply?.sellerPrice ?? null };
    });
    const total = +rows.reduce((n, r) => n + r.total, 0).toFixed(2);
    await reserveStock(this.prisma, rows.map((r) => ({ productId: r.productId, quantity: r.quantity, name: r.name })), 'admin');
    const extra = await this.prisma.order.create({
      data: {
        userId: order.userId, parentOrderId: order.id, addressId: order.addressId, dogId: order.dogId, type: 'PRODUCT', status: 'PENDING',
        subtotal: total, deliveryCost: 0, discountAmount: 0, total,
        internalNotes: `Extra payment for order #${order.orderNumber.slice(-8).toUpperCase()}${reason?.trim() ? ` — ${reason.trim()}` : ''}. Ships with it once paid.`,
        items: { create: rows },
      },
      select: { id: true },
    });
    notify(this.prisma, order.userId, 'EXTRA_CHARGE', { orderId: extra.id, parentOrderId: order.id, total }, '/account/orders');
    this.smsNotify.extraCharge(extra.id, total, order.orderNumber);
    return { id: extra.id, total };
  }
}

export type AdminOrderEdit = {
  address?: { firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2?: string; postalCode?: string };
  /** One of the customer's saved addresses instead of typing one. */
  addressId?: string;
  /** The typed address is a new one: add it to the customer's addresses. */
  newAddress?: boolean;
  /** Also send the plan's next boxes to the new address. */
  addressForPlan?: boolean;
  dogId?: string | null;
  /** Every shop product line wanted: existing ones by id (0 removes), new ones by productId. */
  items?: { id?: string; productId?: string; quantity: number }[];
  giftRecipientName?: string;
  giftMessage?: string;
  reason?: string;
};
