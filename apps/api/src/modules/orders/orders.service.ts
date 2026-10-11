import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { allowedNext, cancelUnpaidOrder, wasPaid } from './order-lifecycle';
import { PrismaService } from '../prisma/prisma.service';
import { notify } from '../notifications/notify';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService, private email: EmailService) {}

  async findByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          // Product and plan for their Georgian names.
          items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, subscriptionPlan: { select: { name: true, translations: true } } } },
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
        items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, subscriptionPlan: true } },
        address: true,
        deliveryMethod: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async adminList(page = 1, limit = 20, status?: string, type?: string, search?: string, sortBy = 'createdAt', sortDir = 'desc', planId?: string, dateFrom?: string, dateTo?: string) {
    const skip = (page - 1) * limit;

    // Built without `type` so the type breakdown stays stable while a type is
    // selected — otherwise picking one channel would hide the others' counts.
    const whereWithoutType: any = {};
    if (status) whereWithoutType.status = status;
    if (planId) whereWithoutType.items = { some: { subscriptionPlanId: planId } };
    if (dateFrom || dateTo) {
      whereWithoutType.createdAt = {};
      if (dateFrom) whereWithoutType.createdAt.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); whereWithoutType.createdAt.lte = d; }
    }
    if (search) {
      whereWithoutType.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const where: any = { ...whereWithoutType };
    if (type) where.type = type;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          address: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
          items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, subscriptionPlan: true } },
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

    const num = (v: unknown) => (v == null ? 0 : Number(v));
    const statusCount = (s: string) => byStatus.find((r) => r.status === s)?._count.id ?? 0;

    const refundDueCount = await this.prisma.order.count({
      where: { ...where, OR: [{ status: 'CANCELLED', payments: { some: { status: 'PAID' } } }, { refundDueAmount: { gt: 0 } }] },
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
        user: { include: { dogs: { where: { deletedAt: null } }, addresses: { where: { deletedAt: null } } } },
        address: true,
        payments: { orderBy: { createdAt: 'desc' }, include: { refunds: true } },
        items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, subscriptionPlan: true } },
        dog: true,
        subscription: { include: { plan: true } },
        deliveryMethod: true,
        coupon: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.withFlow(order);
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
}
