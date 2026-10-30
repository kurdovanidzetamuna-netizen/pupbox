import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FlittService } from '../payments/flitt.service';
import { SmsNotify } from '../sms/sms-notify';
import { notify } from '../notifications/notify';
import { OrdersService } from './orders.service';

/** Money back to a customer: sent through the bank, or recorded when done in its portal. */
@Injectable()
export class OrderRefundsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private flitt: FlittService, private smsNotify: SmsNotify, private orders: OrdersService) {}

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
    return this.orders.adminGetOne(id);
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
    // One refund per order at a time: a double click must not send the money twice.
    if (this.refunding.has(id)) throw new BadRequestException('A refund for this order is already being sent. Wait a moment, then refresh.');
    this.refunding.add(id);
    try { return await this.refundOnce(id, o, adminUserId); } finally { this.refunding.delete(id); }
  }
  private refunding = new Set<string>();

  private async refundOnce(id: string, o: RefundInput, adminUserId?: string) {
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
    return this.orders.adminGetOne(id);
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
