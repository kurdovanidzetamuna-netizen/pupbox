import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { r2 as round } from '../../common/money';

export type InsightFilters = {
  from?: string; to?: string;
  groupBy?: 'day' | 'week' | 'month';
  /** Comma lists; several in one filter = any of them. */
  types?: string; tierIds?: string; planIds?: string; categoryIds?: string; cities?: string; statuses?: string;
};

const DAY = 86400_000;
const TZ = 4 * 3600_000; // Tbilisi, no daylight saving
const list = (v?: string) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);
const PAID = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;

/** Start of the day / ISO week (Monday) / month a moment falls in, in Tbilisi time, as "YYYY-MM-DD". */
function bucket(d: Date, by: 'day' | 'week' | 'month') {
  const t = new Date(d.getTime() + TZ);
  if (by === 'month') return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-01`;
  if (by === 'week') t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

/**
 * The numbers behind admin → Reports → Insights, for one period and the one
 * before it (same length) to compare. Money counts when it was actually
 * taken (payment date), refunds when they were made — the way a bank
 * statement would show them. Every filter narrows the orders counted;
 * several values in one filter mean "any of these".
 */
export async function insights(prisma: PrismaService, f: InsightFilters) {
  const to = f.to ? new Date(`${f.to}T00:00:00+04:00`).getTime() + DAY : Date.now();
  const from = f.from ? new Date(`${f.from}T00:00:00+04:00`).getTime() : to - 30 * DAY;
  if (!(from < to)) throw new BadRequestException('"from" must be before "to"');
  if (to - from > 800 * DAY) throw new BadRequestException('Choose at most about two years.');
  const span = to - from;
  const by = f.groupBy ?? (span > 120 * DAY ? 'month' : span > 31 * DAY ? 'week' : 'day');

  // Which orders count.
  const cats = list(f.categoryIds);
  const kids = cats.length ? await prisma.productCategory.findMany({ where: { parentId: { in: cats }, deletedAt: null }, select: { id: true } }) : [];
  const and: Prisma.OrderWhereInput[] = [];
  if (list(f.types).length) and.push({ type: { in: list(f.types) as any } });
  if (list(f.statuses).length) and.push({ status: { in: list(f.statuses) as any } });
  if (list(f.cities).length) and.push({ address: { city: { in: list(f.cities), mode: 'insensitive' } } });
  if (list(f.planIds).length) and.push({ items: { some: { subscriptionPlanId: { in: list(f.planIds) } } } });
  if (list(f.tierIds).length) and.push({ items: { some: { subscriptionPlan: { tierId: { in: list(f.tierIds) } } } } });
  if (cats.length) and.push({ items: { some: { product: { categoryId: { in: [...cats, ...kids.map((k) => k.id)] } } } } });
  const orderWhere: Prisma.OrderWhereInput = and.length ? { AND: and } : {};

  async function period(a: number, b: number) {
    const range = { gte: new Date(a), lt: new Date(b) };
    const [payments, refunds, newCustomers, created] = await Promise.all([
      prisma.payment.findMany({
        where: { status: { in: [...PAID] }, paidAt: range, order: orderWhere },
        select: {
          amount: true, paidAt: true, attempt: true,
          order: {
            select: {
              id: true, type: true, status: true, userId: true, address: { select: { city: true } },
              items: { select: { name: true, quantity: true, total: true, productId: true, product: { select: { category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } } } }, subscriptionPlan: { select: { id: true, name: true, tier: { select: { id: true, name: true, emoji: true } } } } } },
            },
          },
        },
      }),
      prisma.refund.findMany({ where: { createdAt: range, payment: { order: orderWhere } }, select: { amount: true, createdAt: true, reason: true } }),
      prisma.user.count({ where: { createdAt: range, deletedAt: null, NOT: { email: { endsWith: '@pupbox.dev' } } } }),
      prisma.order.groupBy({ by: ['status'], where: { ...orderWhere, createdAt: range }, _count: { _all: true } }),
    ]);
    const collected = payments.reduce((n, p) => n + Number(p.amount), 0);
    const refunded = refunds.reduce((n, r) => n + Number(r.amount), 0);
    const orders = new Set(payments.map((p) => p.order.id)).size;
    const buyers = new Map<string, number>();
    for (const p of payments) buyers.set(p.order.userId, (buyers.get(p.order.userId) ?? 0) + 1);
    const items = payments.reduce((n, p) => n + p.order.items.reduce((m, i) => m + (i.productId ? i.quantity : 0), 0), 0);
    const renewals = payments.filter((p) => p.order.type === 'RENEWAL').length;
    const recovered = payments.filter((p) => (p.attempt ?? 1) > 1).length;
    return { payments, refunds, created, kpi: {
      collected: round(collected), refunded: round(refunded), net: round(collected - refunded), orders,
      aov: orders ? round(collected / orders) : 0, items, newCustomers, buyers: buyers.size,
      returning: [...buyers.values()].filter((n) => n > 1).length, refundCount: refunds.length,
      refundRate: collected ? round((refunded / collected) * 100) : 0, renewalsPaid: renewals, recoveredCharges: recovered,
    } };
  }

  const [now, before] = await Promise.all([period(from, to), period(from - span, from)]);

  // Over time.
  const series = new Map<string, { date: string; collected: number; refunded: number; orders: number }>();
  for (let t = from; t < to; t += DAY) { const k = bucket(new Date(t), by); if (!series.has(k)) series.set(k, { date: k, collected: 0, refunded: 0, orders: 0 }); }
  const seen = new Set<string>();
  for (const p of now.payments) {
    const row = series.get(bucket(p.paidAt!, by)); if (!row) continue;
    row.collected += Number(p.amount);
    if (!seen.has(p.order.id)) { seen.add(p.order.id); row.orders++; }
  }
  for (const r of now.refunds) { const row = series.get(bucket(r.createdAt, by)); if (row) row.refunded += Number(r.amount); }

  // Breakdowns (money taken, by what the order was).
  const add = (m: Map<string, { key: string; label: string; value: number; count: number }>, key: string, label: string, value: number, count = 1) => {
    const row = m.get(key) ?? { key, label, value: 0, count: 0 }; row.value += value; row.count += count; m.set(key, row);
  };
  const byType = new Map(), byTier = new Map(), byPlan = new Map(), byCategory = new Map(), byCity = new Map(), byProduct = new Map();
  for (const p of now.payments) {
    const o = p.order, amount = Number(p.amount);
    add(byType, o.type, o.type, amount);
    // "tbilisi" and "Tbilisi " are the same city.
    const city = (o.address?.city || '—').trim().replace(/\s+/g, ' ');
    add(byCity, city.toLowerCase(), city.charAt(0).toUpperCase() + city.slice(1), amount);
    for (const i of o.items) {
      const v = Number(i.total);
      if (i.subscriptionPlan) {
        add(byPlan, i.subscriptionPlan.id, i.subscriptionPlan.name, v);
        const t = i.subscriptionPlan.tier;
        add(byTier, t?.id ?? 'none', t ? `${t.emoji ?? ''} ${t.name}`.trim() : 'No box type', v);
      }
      if (i.productId) {
        const c = i.product?.category, main = c?.parent ?? c;
        add(byCategory, main?.id ?? 'none', main?.name ?? 'Uncategorised', v, i.quantity);
        add(byProduct, i.productId, i.name, v, i.quantity);
      }
    }
  }
  const top = (m: Map<string, any>, n = 12) => [...m.values()].sort((a, b) => b.value - a.value).slice(0, n).map((r) => ({ ...r, value: round(r.value) }));
  const reasons = new Map();
  // Codes from the customer's cancel form ("damaged_item") read as words.
  for (const r of now.refunds) {
    const text = (r.reason || 'No reason given').trim().replace(/_/g, ' ').slice(0, 60);
    add(reasons, text.toLowerCase(), text.charAt(0).toUpperCase() + text.slice(1), Number(r.amount));
  }

  // Plans right now (not tied to the period).
  const active = await prisma.customerSubscription.findMany({ where: { status: 'ACTIVE' }, select: { plan: { select: { price: true, durationValue: true, durationUnit: true, monthlyEquivPrice: true } } } });
  const months = (p: { durationValue: number; durationUnit: string }) => (p.durationUnit === 'YEAR' ? p.durationValue * 12 : p.durationUnit === 'MONTH' ? p.durationValue : 1);
  const mrr = active.reduce((n, s) => n + Number(s.plan.monthlyEquivPrice ?? Number(s.plan.price) / months(s.plan)), 0);
  const [failedNow, churned] = await Promise.all([
    prisma.customerSubscription.count({ where: { status: 'PAYMENT_FAILED' } }),
    prisma.customerSubscription.count({ where: { status: { in: ['CANCELLED', 'EXPIRED'] }, updatedAt: { gte: new Date(from), lt: new Date(to) } } }),
  ]);

  const delta = (a: number, b: number) => (b ? round(((a - b) / b) * 100) : a ? 100 : 0);
  return {
    range: { from: new Date(from).toISOString(), to: new Date(to).toISOString(), groupBy: by },
    kpi: now.kpi, previous: before.kpi,
    change: Object.fromEntries(Object.entries(now.kpi).map(([k, v]) => [k, delta(v as number, (before.kpi as any)[k])])),
    plans: { active: active.length, mrr: round(mrr), paymentFailed: failedNow, ended: churned },
    series: [...series.values()].map((r) => ({ ...r, collected: round(r.collected), refunded: round(r.refunded) })),
    byType: top(byType), byTier: top(byTier), byPlan: top(byPlan), byCategory: top(byCategory), byCity: top(byCity), topProducts: top(byProduct, 10),
    refundReasons: top(reasons, 8),
    ordersByStatus: Object.fromEntries(now.created.map((r) => [r.status, r._count._all])),
  };
}
