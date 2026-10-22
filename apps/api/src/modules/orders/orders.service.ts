import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { reserveStock, releaseStock } from '../products/stock';
import { couponDiscount } from '../coupons/coupon-discount';
import { AuditService } from '../audit/audit.service';
import { FlittService } from '../payments/flitt.service';
import { SmsNotify } from '../sms/sms-notify';
import { allowedNext, cancelUnpaidOrder, wasPaid } from './order-lifecycle';
import { PrismaService } from '../prisma/prisma.service';
import { notify } from '../notifications/notify';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService, private email: EmailService, private audit: AuditService, private flitt: FlittService, private smsNotify: SmsNotify) {}

  async findByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          // Product and plan for their Georgian names.
          items: { include: { product: { include: { images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 }, category: { select: { slug: true, name: true } } } }, subscriptionPlan: { select: { name: true, translations: true } } } },
          address: true,
          deliveryMethod: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1, include: { refunds: { orderBy: { createdAt: 'desc' } } } },
          // For "Manage or cancel plan" on the order.
          subscription: { select: { id: true, status: true, cancelledAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    // What the customer is owed and what has been paid back, so they aren't left wondering.
    const withRefunds = orders.map((o) => {
      const p = o.payments[0];
      const refunds = p?.refunds ?? [];
      const refunded = refunds.reduce((s, r) => s + Number(r.amount), 0);
      const paid = p && ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(p.status);
      const owed = Number(o.refundDueAmount ?? 0) || (o.status === 'CANCELLED' && p?.status === 'PAID' ? Number(p.amount) : 0);
      return { ...o, refund: paid && (owed > 0 || refunded > 0) ? { owed, refunded, refundedAt: refunds[0]?.createdAt ?? null } : null };
    });
    return { orders: withRefunds, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: { include: { product: { include: { images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 }, category: { select: { slug: true, name: true } } } }, subscriptionPlan: true } },
        address: true,
        deliveryMethod: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * The admin list. Filters combine (AND); inside one filter several choices
   * are "any of" (OR): plans, channels and categories take comma lists, and a
   * main category includes its subcategories. Alongside the page it returns
   * a summary of what matches, counts per status and per channel (each
   * without its own filter, so the tabs and pills keep their numbers), and
   * the same totals for all orders, for comparison.
   */
  async adminList(page = 1, limit = 20, status?: string, type?: string, search?: string, sortBy = 'createdAt', sortDir = 'desc', planId?: string, dateFrom?: string, dateTo?: string, categoryId?: string) {
    const skip = (page - 1) * limit;
    const list = (v?: string) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);
    const types = list(type), plans = list(planId), cats = list(categoryId), statuses = list(status);

    // Everything but status and channel; those two are added below.
    const base: any = {};
    const and: any[] = [];
    if (plans.length) and.push({ items: { some: { subscriptionPlanId: { in: plans } } } });
    if (cats.length) {
      const kids = await this.prisma.productCategory.findMany({ where: { parentId: { in: cats }, deletedAt: null }, select: { id: true } });
      and.push({ items: { some: { product: { categoryId: { in: [...cats, ...kids.map((k) => k.id)] } } } } });
    }
    if (and.length) base.AND = and;
    if (dateFrom || dateTo) {
      base.createdAt = {};
      if (dateFrom) base.createdAt.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); base.createdAt.lte = d; }
    }
    if (search) {
      base.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search } } },
        { items: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    const byStatusWhere = types.length ? { ...base, type: { in: types } } : base;
    // Built without `type` so the type breakdown stays stable while a type is
    // selected — otherwise picking one channel would hide the others' counts.
    const whereWithoutType: any = statuses.length ? { ...base, status: { in: statuses } } : base;

    const where: any = { ...whereWithoutType };
    if (types.length) where.type = { in: types };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          address: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
          items: { include: { product: { include: { images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 }, category: { select: { slug: true, name: true } } } }, subscriptionPlan: true } },
          dog: true,
          subscription: { include: { plan: true } },
          deliveryMethod: true,
          coupon: true,
        },
        orderBy: { [['createdAt', 'total'].includes(sortBy) ? sortBy : 'createdAt']: sortDir === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    // Summary spans the whole filtered set, not just this page — a stat card
    // that only described 20 rows would be worse than no stat card.
    const [byType, byStatus, valueAgg, paidAgg] = await Promise.all([
      this.prisma.order.groupBy({ by: ['type'], where: whereWithoutType, _count: { id: true }, _sum: { total: true } }),
      this.prisma.order.groupBy({ by: ['status'], where, _count: { id: true } }),
      this.prisma.order.aggregate({ where, _sum: { total: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID', order: where }, _sum: { amount: true } }),
    ]);
    // Money kept from partly refunded payments counts as collected too.
    const [partPaid, partRefunded] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'PARTIALLY_REFUNDED', order: where }, _sum: { amount: true } }),
      this.prisma.refund.aggregate({ where: { payment: { status: 'PARTIALLY_REFUNDED', order: where } }, _sum: { amount: true } }),
    ]);

    const [statusCounts, allAgg, allPaid, allPartPaid, allPartRefunded] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], where: byStatusWhere, _count: { id: true } }),
      this.prisma.order.aggregate({ _count: { id: true }, _sum: { total: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PARTIALLY_REFUNDED' }, _sum: { amount: true } }),
      this.prisma.refund.aggregate({ where: { payment: { status: 'PARTIALLY_REFUNDED' } }, _sum: { amount: true } }),
    ]);
    const num = (v: unknown) => (v == null ? 0 : Number(v));
    const statusCount = (s: string) => byStatus.find((r) => r.status === s)?._count.id ?? 0;

    const refundDueCount = await this.prisma.order.count({
      // AND, not a spread: the search filter is an OR of its own and would be replaced.
      where: { AND: [where, { OR: [{ status: 'CANCELLED', payments: { some: { status: 'PAID' } } }, { refundDueAmount: { gt: 0 } }] }] },
    });

    return {
      orders: orders.map((o) => this.withFlow(o)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      summary: {
        totalOrders: total,
        totalValue: num(valueAgg._sum.total),
        paidRevenue: num(paidAgg._sum.amount) + num(partPaid._sum.amount) - num(partRefunded._sum.amount),
        paidCount: statusCount('PAID') + statusCount('PROCESSING') + statusCount('PACKED') + statusCount('SHIPPED') + statusCount('DELIVERED'),
        pendingCount: statusCount('PENDING'),
        failedCount: statusCount('FAILED'),
        refundedCount: statusCount('REFUNDED') + statusCount('CANCELLED'),
        // Cancelled after payment, money not returned yet.
        refundDueCount,
        // Only types that actually occur — lets the UI hide filters that
        // could never match anything.
        // How many orders are in each status with the other filters on.
        byStatus: Object.fromEntries(statusCounts.map((r) => [r.status, r._count.id])),
        // Every order, no filters: the cards show filtered against all.
        all: {
          totalOrders: allAgg._count.id,
          totalValue: num(allAgg._sum.total),
          paidRevenue: num(allPaid._sum.amount) + num(allPartPaid._sum.amount) - num(allPartRefunded._sum.amount),
        },
        byType: byType
          .map((r) => ({ type: r.type, count: r._count.id, value: num(r._sum.total) }))
          .sort((a, b) => b.count - a.count),
      },
    };
  }

  async adminGetOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            dogs: { where: { deletedAt: null } },
            addresses: { where: { deletedAt: null }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
            _count: { select: { orders: true } },
          },
        },
        address: true,
        payments: { orderBy: { createdAt: 'desc' }, include: { refunds: { orderBy: { createdAt: 'desc' } } } },
        items: {
          include: {
            product: { include: { images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 }, category: { select: { slug: true, name: true } } } },
            subscriptionPlan: { include: { tier: { select: { name: true, emoji: true, itemCount: true, tagline: true } } } },
            // A built box: what the customer put in it.
            customBox: { select: { monthly: true, mysteryCount: true, items: { select: { quantity: true, product: { select: { name: true, images: { take: 1, select: { url: true } } } } } } } },
          },
        },
        dog: true,
        subscription: {
          include: {
            plan: { include: { tier: { select: { name: true, emoji: true, itemCount: true } } } },
            // The boxes of this plan: which month, where it is, and what's in it.
            shipments: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 6,
              include: { campaign: { select: { name: true, products: { select: { quantity: true, product: { select: { name: true } } } } } } },
            },
          },
        },
        deliveryMethod: true,
        coupon: true,
        extraCharges: { select: { id: true, orderNumber: true, status: true, total: true, createdAt: true, items: { select: { name: true, quantity: true } } } },
        parentOrder: { select: { id: true, orderNumber: true, status: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    // How much this customer has paid us in all (less refunds).
    const [paidSum, refundSum] = await Promise.all([
      this.prisma.payment.aggregate({ where: { userId: order.userId, status: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] } }, _sum: { amount: true } }),
      this.prisma.refund.aggregate({ where: { payment: { userId: order.userId } }, _sum: { amount: true } }),
    ]);
    const customerStats = { orders: order.user._count.orders, totalPaid: +(Number(paidSum._sum.amount ?? 0) - Number(refundSum._sum.amount ?? 0)).toFixed(2), since: order.user.createdAt };
    const { passwordHash: _p, ...user } = order.user as any;
    return { ...this.withFlow({ ...order, user }), customerStats };
  }

  /** What admin may do next with an order, and whether money is owed back. */
  private withFlow<T extends { status: OrderStatus; payments: { status: string; amount?: any }[]; refundDueAmount?: any }>(o: T) {
    const paid = wasPaid(o.payments);
    // Owed back: what a cancellation set aside, or the whole payment of a paid order cancelled outright.
    const set = Number(o.refundDueAmount ?? 0);
    const full = o.status === 'CANCELLED' && paid ? Number(o.payments.find((p) => p.status === 'PAID')?.amount ?? 0) : 0;
    const refundDueValue = set > 0 ? set : full;
    return { ...o, allowedNext: allowedNext(o.status, paid), refundDue: refundDueValue > 0 && paid, refundDueValue };
  }

  /**
   * Records a refund made in the payment provider's portal: a Refund row,
   * the payment marked (partially) refunded, and the amount owed cleared.
   * Nothing is sent to the bank from here.
   */
  async recordRefund(id: string, amount: number, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { payments: { where: { status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } }, include: { refunds: true }, orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!order) throw new NotFoundException('Order not found');
    const payment = order.payments[0];
    if (!payment) throw new BadRequestException('This order has no payment to refund.');
    const already = payment.refunds.reduce((s, r) => s + Number(r.amount), 0);
    const left = Number(payment.amount) - already;
    if (!(amount > 0) || amount > left + 0.001) throw new BadRequestException(`The refund must be between ₾0 and ₾${left.toFixed(2)}.`);
    const fully = amount >= left - 0.001;
    const owed = Math.max(0, Number(order.refundDueAmount ?? 0) - amount);
    await this.prisma.$transaction([
      this.prisma.refund.create({ data: { paymentId: payment.id, amount, reason: reason?.trim() || null } }),
      this.prisma.payment.update({ where: { id: payment.id }, data: { status: fully ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } }),
      this.prisma.order.update({
        where: { id },
        data: {
          refundDueAmount: owed > 0 ? owed : null,
          // A cancelled order refunded in full is finished; a live one keeps its status.
          ...(order.status === 'CANCELLED' || order.status === 'DELIVERED' ? { status: 'REFUNDED' } : {}),
        },
      }),
    ]);
    notify(this.prisma, order.userId, 'REFUNDED', { orderId: id, amount, full: fully }, '/account/orders');
    return this.adminGetOne(id);
  }

  /**
   * Moves an order along fulfilment. Only steps in allowedNext are accepted.
   * Cancelling puts stock back (held stock if unpaid, sold stock if paid and
   * not shipped) and, for a paid order, leaves it "refund due" until the
   * refund is recorded with REFUNDED.
   */
  async adminUpdateStatus(id: string, status: string, opts: { refundAmount?: number; reason?: string } = {}) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
        items: { where: { productId: { not: null } }, select: { productId: true, quantity: true } },
        user: { select: { email: true, firstName: true, language: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const paid = wasPaid(order.payments);
    const to = status as OrderStatus;
    if (!allowedNext(order.status, paid).includes(to)) {
      throw new BadRequestException(`An order that is ${order.status.toLowerCase()} can't be marked ${String(status).toLowerCase()}.`);
    }
    const note = opts.reason?.trim();

    if (to === 'CANCELLED' && !paid) {
      await cancelUnpaidOrder(this.prisma, id, note ? `Cancelled by admin: ${note}` : 'Cancelled by admin.');
      return this.adminGetOne(id);
    }

    if (to === 'CANCELLED') {
      // Paid, not shipped: what was sold goes back on the shelf.
      for (const i of order.items) {
        const inv = await this.prisma.inventory.update({ where: { productId: i.productId! }, data: { quantity: { increment: i.quantity } } });
        if (inv.quantity > 0) await this.prisma.product.updateMany({ where: { id: i.productId!, status: 'OUT_OF_STOCK' }, data: { status: 'ACTIVE' } });
      }
      if (order.subscriptionId) {
        await this.prisma.customerSubscription.update({ where: { id: order.subscriptionId }, data: { status: 'CANCELLED', cancelReason: note || 'Order cancelled by admin', nextRenewalAt: null } });
        await this.prisma.boxShipment.updateMany({ where: { subscriptionId: order.subscriptionId, status: { in: ['TO_PACK', 'PACKED'] } }, data: { status: 'CANCELLED' } });
      }
      await this.prisma.order.update({ where: { id }, data: { status: 'CANCELLED', internalNotes: [order.internalNotes, `Cancelled by admin after payment${note ? `: ${note}` : ''}. Refund due.`].filter(Boolean).join('\n') } });
      return this.adminGetOne(id);
    }

    if (to === 'REFUNDED') {
      const payment = order.payments.find((p) => p.status === 'PAID');
      if (!payment) throw new BadRequestException('This order has no payment to refund.');
      await this.recordRefund(id, opts.refundAmount ?? Number(payment.amount), note);
      // Even a partial refund ends a cancelled or delivered order.
      await this.prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } });
      return this.adminGetOne(id);
    }

    const now = new Date();
    await this.prisma.order.update({
      where: { id },
      data: {
        status: to,
        ...(to === 'SHIPPED' && !order.shippedAt ? { shippedAt: now } : {}),
        ...(to === 'DELIVERED' ? { deliveredAt: now } : {}),
      },
    });
    // Tell the customer once, when the order first leaves.
    if (to === 'SHIPPED' && !order.shippedAt) {
      this.email.sendOrderShipped({ ...order.user, orderId: order.id, trackingNumber: order.trackingNumber })
        .catch((e) => this.logger.error(`Order shipped email failed for ${id}: ${e.message}`));
      notify(this.prisma, order.userId, 'ORDER_SHIPPED', { orderId: order.id, tracking: order.trackingNumber ?? null }, '/account/orders');
    }
    if (to === 'DELIVERED' && order.status !== 'DELIVERED') notify(this.prisma, order.userId, 'ORDER_DELIVERED', { orderId: order.id }, '/account/orders');
    return this.adminGetOne(id);
  }

  async adminUpdateTracking(id: string, trackingNumber: string, internalNotes?: string) {
    return this.prisma.order.update({ where: { id }, data: { trackingNumber, ...(internalNotes !== undefined ? { internalNotes } : {}) } });
  }

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

    if (!changes.length && !extraLines.length) return this.adminGetOne(id);

    // Stock first: if a product ran out, nothing else changes.
    if (stockHold.length) await reserveStock(this.prisma, stockHold);
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
    return { ...(await this.adminGetOne(id)), changes };
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
    await reserveStock(this.prisma, rows.map((r) => ({ productId: r.productId, quantity: r.quantity, name: r.name })));
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

  /**
   * Gives money back: all of it, an amount, or chosen items.
   *
   * - Through the provider when it can (Flitt "reverse" for Flitt payments;
   *   test payments instantly), or only recorded when admin already did it
   *   in Flitt's portal (`recordOnly`).
   * - By items: priced as paid (an order discount is shared out fairly).
   *   On an order that hasn't shipped, those items come off it — nobody
   *   packs what was refunded — and go back on the shelf with `restock`.
   * - Everything left, before shipping: the order is cancelled too (stock
   *   back, its plan stopped) and ends as REFUNDED.
   * The customer gets a note and a text; the audit log keeps who did it.
   */
  async refund(id: string, o: RefundInput, adminUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: { where: { status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } }, include: { refunds: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order) throw new NotFoundException('Order not found');
    const payment = order.payments[0];
    if (!payment) throw new BadRequestException('This order has no payment to refund.');
    const already = payment.refunds.reduce((n, r) => n + Number(r.amount), 0);
    const left = +(Number(payment.amount) - already).toFixed(2);
    if (left <= 0) throw new BadRequestException('This payment is already refunded in full.');
    const shipped = ['SHIPPED', 'DELIVERED'].includes(order.status);

    // How much, and for what.
    let amount = 0;
    const lines: { itemId: string; name: string; quantity: number; amount: number; productId: string | null }[] = [];
    if (o.mode === 'FULL') amount = left;
    else if (o.mode === 'AMOUNT') amount = +Number(o.amount).toFixed(2);
    else {
      const subtotal = Number(order.subtotal) || 1;
      const share = 1 - Math.min(Number(order.discountAmount), subtotal) / subtotal;
      const refundedQty = (itemId: string) => payment.refunds.flatMap((r) => (Array.isArray(r.items) ? (r.items as any[]) : [])).filter((x) => x.itemId === itemId).reduce((n, x) => n + Number(x.quantity), 0);
      for (const want of o.items ?? []) {
        const line = order.items.find((i) => i.id === want.itemId);
        if (!line) throw new BadRequestException('One of the items isn’t on this order.');
        const q = Math.floor(Number(want.quantity));
        const most = shipped ? line.quantity - refundedQty(line.id) : line.quantity;
        if (!(q >= 1 && q <= most)) throw new BadRequestException(`${line.name}: choose 1 to ${most}.`);
        const value = +(Number(line.price) * q * share).toFixed(2);
        lines.push({ itemId: line.id, name: line.name, quantity: q, amount: value, productId: line.productId });
        amount += value;
      }
      if (!lines.length) throw new BadRequestException('Choose at least one item.');
      amount = +Math.min(amount, left).toFixed(2);
    }
    if (!(amount > 0) || amount > left + 0.001) throw new BadRequestException(`The refund must be between ₾0.01 and ₾${left.toFixed(2)}.`);
    const everything = amount >= left - 0.001;

    // Send it back (or just record it).
    let method = 'MANUAL';
    let providerRefundId: string | null = null;
    if (!o.recordOnly) {
      if (payment.provider === 'FLITT' && this.flitt.configured) {
        const flittOrderId = payment.attempt ? `${order.id}-r${payment.attempt}` : order.id;
        try {
          const r = await this.flitt.refund({ orderId: flittOrderId, amount, comment: o.reason });
          providerRefundId = r.id || null; method = 'PROVIDER';
        } catch (e: any) {
          throw new BadRequestException(`Flitt didn’t accept the refund: ${e.message}. Nothing was changed — try again, or refund in Flitt’s portal and choose “Already refunded”.`);
        }
      } else if (['DEV_SIMULATED', 'NONE'].includes(payment.provider)) {
        method = 'PROVIDER'; providerRefundId = `test-refund-${Date.now()}`;
      } else if (payment.provider === 'FLITT') {
        throw new BadRequestException('Flitt isn’t connected on this server, so the money can’t be sent from here. Refund in Flitt’s portal, then choose “Already refunded”.');
      }
    }

    const ops: Prisma.PrismaPromise<any>[] = [
      this.prisma.refund.create({ data: { paymentId: payment.id, amount, reason: o.reason?.trim() || null, providerRefundId, method, adminUserId: adminUserId ?? null, items: lines.length ? lines.map(({ productId, ...l }) => l) : Prisma.DbNull } }),
      this.prisma.payment.update({ where: { id: payment.id }, data: { status: everything ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } }),
    ];
    const owed = Math.max(0, Number(order.refundDueAmount ?? 0) - amount);
    const note = `${new Date().toISOString().slice(0, 16).replace('T', ' ')}: refunded ₾${amount.toFixed(2)}${lines.length ? ` for ${lines.map((l) => `${l.name} ×${l.quantity}`).join(', ')}` : ''}${method === 'MANUAL' ? ' (recorded; done in the provider’s portal)' : ''}${o.reason?.trim() ? ` — ${o.reason.trim()}` : ''}`;
    const data: Prisma.OrderUncheckedUpdateInput = { refundDueAmount: owed > 0 ? owed : null, internalNotes: [order.internalNotes, note].filter(Boolean).join('\n') };

    // Refunded items on an unshipped order come off it, so nobody packs them.
    if (lines.length && !shipped) {
      for (const l of lines) {
        const line = order.items.find((i) => i.id === l.itemId)!;
        const q = line.quantity - l.quantity;
        ops.push(q > 0 ? this.prisma.orderItem.update({ where: { id: line.id }, data: { quantity: q, total: +(Number(line.price) * q).toFixed(2) } }) : this.prisma.orderItem.delete({ where: { id: line.id } }));
      }
      const remaining = order.items.reduce((n, i) => n + Number(i.price) * (i.quantity - (lines.find((l) => l.itemId === i.id)?.quantity ?? 0)), 0);
      data.subtotal = +remaining.toFixed(2);
      data.discountAmount = +Math.min(Number(order.discountAmount), remaining).toFixed(2);
      data.total = +(Math.max(0, remaining - Number(data.discountAmount)) + Number(order.deliveryCost)).toFixed(2);
    }
    // Everything back before it shipped: the order is cancelled and closed as refunded.
    const closeUnshipped = everything && ['PAID', 'PROCESSING', 'PACKED'].includes(order.status);
    if (everything && (closeUnshipped || ['CANCELLED', 'DELIVERED', 'SHIPPED'].includes(order.status))) data.status = 'REFUNDED';
    ops.push(this.prisma.order.update({ where: { id }, data }));
    await this.prisma.$transaction(ops);

    // Stock: refunded lines go back with restock; a full refund before shipping puts everything back.
    const back = closeUnshipped
      ? order.items.filter((i) => i.productId).map((i) => ({ productId: i.productId!, quantity: i.quantity }))
      : o.restock ? lines.filter((l) => l.productId).map((l) => ({ productId: l.productId!, quantity: l.quantity })) : [];
    for (const b of back) {
      const inv = await this.prisma.inventory.update({ where: { productId: b.productId }, data: { quantity: { increment: b.quantity } } });
      if (inv.quantity > 0) await this.prisma.product.updateMany({ where: { id: b.productId, status: 'OUT_OF_STOCK' }, data: { status: 'ACTIVE' } });
    }
    if (closeUnshipped && order.subscriptionId) {
      await this.prisma.customerSubscription.update({ where: { id: order.subscriptionId }, data: { status: 'CANCELLED', cancelReason: o.reason?.trim() || 'Refunded by admin', nextRenewalAt: null } });
      await this.prisma.boxShipment.updateMany({ where: { subscriptionId: order.subscriptionId, status: { in: ['TO_PACK', 'PACKED'] } }, data: { status: 'CANCELLED' } });
    }

    notify(this.prisma, order.userId, 'REFUNDED', { orderId: id, amount, full: everything }, '/account/orders');
    this.smsNotify.refunded(id, amount, payment.cardMask);
    await this.audit.log({ adminUserId, action: 'REFUND', module: 'orders', entityType: 'Order', entityId: id, after: { amount, method, items: lines.map((l) => `${l.name} ×${l.quantity}`), restock: !!o.restock, closed: closeUnshipped } });
    return this.adminGetOne(id);
  }
}

export type RefundInput = {
  mode: 'FULL' | 'AMOUNT' | 'ITEMS';
  amount?: number;
  items?: { itemId: string; quantity: number }[];
  reason?: string;
  /** Items go back on the shelf (they were never sent, or came back unopened). */
  restock?: boolean;
  /** Already refunded in the provider's portal: only record it here. */
  recordOnly?: boolean;
};

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
