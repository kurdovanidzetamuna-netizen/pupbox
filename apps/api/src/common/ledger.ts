import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../modules/prisma/prisma.service';
import { r2 } from './money';

/**
 * One way of counting money and customers, shared by every admin screen that
 * shows them (Dashboard, Reports, Orders, Customers), so the same period
 * gives the same numbers everywhere:
 *
 * - Money in: every payment that took money, on the day it was paid (the
 *   day it was recorded, for the few without a paid time). A payment later
 *   refunded still came in that day.
 * - Refunds: on the day they were made.
 * - Revenue: money in less refunds, like a bank statement.
 * - Orders placed: on the day the order was made.
 * - Customers: every account that hasn't been deleted.
 *
 * An order's money is split between subscription boxes and shop products by
 * the value of its lines; an order without lines goes by its kind.
 */
export const COLLECTED = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;

export type Range = { gte: Date; lt?: Date; lte?: Date };

/** Every moment up to now. */
export const ALL_TIME = (): Range => ({ gte: new Date(0), lte: new Date() });

export const CUSTOMER: Prisma.UserWhereInput = { deletedAt: null };

/** A paid order: one that money came in for (even if some or all went back later). */
export const PAID_ORDER: Prisma.OrderWhereInput = { payments: { some: { status: { in: [...COLLECTED] } } } };

/** Payments that took money in the period. */
export const takenIn = (range: Range): Prisma.PaymentWhereInput => ({
  status: { in: [...COLLECTED] },
  OR: [{ paidAt: range }, { paidAt: null, createdAt: range }],
});

/** When a payment that took money counts. */
export const takenAt = (p: { paidAt: Date | null; createdAt: Date }) => p.paidAt ?? p.createdAt;

export const LEDGER_ORDER = {
  id: true, type: true, status: true, userId: true, createdAt: true,
  address: { select: { city: true } },
  items: {
    select: {
      name: true, quantity: true, total: true, productId: true,
      product: { select: { category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } } } },
      subscriptionPlanId: true,
      subscriptionPlan: { select: { id: true, name: true, tier: { select: { id: true, name: true, emoji: true } } } },
    },
  },
} satisfies Prisma.OrderSelect;

export type LedgerOrder = Prisma.OrderGetPayload<{ select: typeof LEDGER_ORDER }>;

/** How much of an order is subscription boxes and how much shop products (0–1 each, adding up to 1). */
export function channelShare(o: Pick<LedgerOrder, 'type' | 'items'>) {
  let box = 0, shop = 0;
  for (const i of o.items) {
    const v = Number(i.total);
    if (i.subscriptionPlanId) box += v;
    else if (i.productId) shop += v;
  }
  if (box + shop > 0) return { box: box / (box + shop), shop: shop / (box + shop) };
  return ['SUBSCRIPTION', 'RENEWAL'].includes(o.type) ? { box: 1, shop: 0 } : { box: 0, shop: 1 };
}

/** Units of shop products in an order. */
export const shopUnits = (o: Pick<LedgerOrder, 'items'>) => o.items.reduce((n, i) => n + (i.productId ? i.quantity : 0), 0);

/**
 * Money in and refunds for a period, for the orders `orderWhere` picks
 * (every order when empty), with the totals every screen shows.
 */
export async function ledger(prisma: PrismaService, range: Range, orderWhere: Prisma.OrderWhereInput = {}) {
  const [payments, refunds] = await Promise.all([
    prisma.payment.findMany({
      where: { ...takenIn(range), order: orderWhere },
      select: { id: true, amount: true, paidAt: true, createdAt: true, attempt: true, order: { select: LEDGER_ORDER } },
    }),
    prisma.refund.findMany({
      where: { createdAt: range, payment: { order: orderWhere } },
      select: { amount: true, createdAt: true, reason: true, payment: { select: { order: { select: LEDGER_ORDER } } } },
    }),
  ]);

  const box = { collected: 0, refunded: 0, orders: new Set<string>(), refundCount: 0 };
  const shop = { collected: 0, refunded: 0, orders: new Set<string>(), refundCount: 0, units: 0 };
  const orders = new Map<string, LedgerOrder>();
  for (const p of payments) {
    const s = channelShare(p.order), v = Number(p.amount);
    box.collected += v * s.box;
    shop.collected += v * s.shop;
    if (s.box > 0) box.orders.add(p.order.id);
    if (s.shop > 0) shop.orders.add(p.order.id);
    orders.set(p.order.id, p.order);
  }
  for (const o of orders.values()) shop.units += shopUnits(o);
  for (const r of refunds) {
    const s = channelShare(r.payment.order), v = Number(r.amount);
    box.refunded += v * s.box;
    shop.refunded += v * s.shop;
    if (s.box > 0) box.refundCount++;
    if (s.shop > 0) shop.refundCount++;
  }

  const collected = payments.reduce((n, p) => n + Number(p.amount), 0);
  const refunded = refunds.reduce((n, r) => n + Number(r.amount), 0);
  return {
    payments, refunds, orders,
    collected: r2(collected), refunded: r2(refunded), net: r2(collected - refunded),
    /** Orders that money came in for. */
    paidOrders: orders.size,
    units: shop.units,
    box: { ...box, net: r2(box.collected - box.refunded) },
    shop: { ...shop, net: r2(shop.collected - shop.refunded) },
  };
}

export type Ledger = Awaited<ReturnType<typeof ledger>>;

/** Just the totals of `ledger`, summed in the database (for lists that only show them). */
export async function ledgerTotals(prisma: PrismaService, range: Range, orderWhere: Prisma.OrderWhereInput = {}) {
  const [paid, back] = await Promise.all([
    prisma.payment.aggregate({ where: { ...takenIn(range), order: orderWhere }, _sum: { amount: true } }),
    prisma.refund.aggregate({ where: { createdAt: range, payment: { order: orderWhere } }, _sum: { amount: true } }),
  ]);
  const collected = Number(paid._sum.amount ?? 0), refunded = Number(back._sum.amount ?? 0);
  return { collected: r2(collected), refunded: r2(refunded), net: r2(collected - refunded) };
}
