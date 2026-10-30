import { Injectable, NotFoundException } from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';
import { allowedNext, wasPaid } from './order-lifecycle';
import { PrismaService } from '../prisma/prisma.service';
import { LINE_PRODUCT } from '../products/product-include';

/**
 * Finding orders: a customer's own, and the admin list and full view (with
 * what admin may do next). Changing them lives next door: order-status
 * (moving along), order-refunds (money back), order-edit (contents, address).
 */
@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          // Product and plan for their Georgian names.
          items: { include: { product: LINE_PRODUCT, subscriptionPlan: { select: { name: true, translations: true } } } },
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
        items: { include: { product: LINE_PRODUCT, subscriptionPlan: true } },
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
          items: { include: { product: LINE_PRODUCT, subscriptionPlan: true } },
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
            product: LINE_PRODUCT,
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
    const { passwordHash: _p, ...user } = order.user;
    return { ...this.withFlow({ ...order, user }), customerStats };
  }

  /** What admin may do next with an order, and whether money is owed back. */
  withFlow<T extends { status: OrderStatus; payments: { status: string; amount?: any }[]; refundDueAmount?: any }>(o: T) {
    const paid = wasPaid(o.payments);
    // Owed back: what a cancellation set aside, or the whole payment of a paid order cancelled outright.
    const set = Number(o.refundDueAmount ?? 0);
    const full = o.status === 'CANCELLED' && paid ? Number(o.payments.find((p) => p.status === 'PAID')?.amount ?? 0) : 0;
    const refundDueValue = set > 0 ? set : full;
    return { ...o, allowedNext: allowedNext(o.status, paid), refundDue: refundDueValue > 0 && paid, refundDueValue };
  }

  async adminUpdateTracking(id: string, trackingNumber: string, internalNotes?: string) {
    return this.prisma.order.update({ where: { id }, data: { trackingNumber, ...(internalNotes !== undefined ? { internalNotes } : {}) } });
  }
}
