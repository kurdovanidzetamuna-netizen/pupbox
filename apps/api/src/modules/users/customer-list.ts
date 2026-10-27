import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/** Filters and sorting for admin → Customers (the list and its CSV export). */
export interface CustomerQuery {
  search?: string;
  status?: string;
  /** active: on a plan now · ended: had one, not now · none: never. */
  plan?: string;
  /** email / sms: agreed to offers on that channel · none: neither. */
  consent?: string;
  language?: string;
  city?: string;
  tag?: string;
  joinedFrom?: string;
  joinedTo?: string;
  /** Customers who paid at least once (yes) or never (no). */
  buyer?: string;
  sort?: string;
  dir?: string;
  page?: number;
  limit?: number;
}

const PAID_ORDER = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'REFUNDED'] as const;
const RUNNING = ['ACTIVE', 'PAUSED', 'PAYMENT_FAILED'];

export type CustomerRow = Awaited<ReturnType<typeof customerRows>>['rows'][number];

/**
 * Every customer matching the filters, with what the team needs at a glance:
 * money in (less refunds), paid orders, last order, plan, city, last sign-in.
 * Sorted and paged here: the shop's customer base is small enough to rank in
 * memory, and "most spent" or "last order" can't be sorted in one query.
 */
export async function customerRows(prisma: PrismaService, q: CustomerQuery, all = false) {
  const search = q.search?.trim();
  const day = (s?: string, end = false) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T${end ? '23:59:59.999' : '00:00:00'}Z`) : undefined);
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(q.status ? { status: q.status as any } : {}),
    ...(q.language === 'en' || q.language === 'ka' ? { language: q.language } : {}),
    ...(q.tag ? { crmTags: { has: q.tag } } : {}),
    ...(q.consent === 'email' ? { marketingEmail: true } : q.consent === 'sms' ? { marketingSms: true } : q.consent === 'none' ? { marketingEmail: false, marketingSms: false } : {}),
    ...(day(q.joinedFrom) || day(q.joinedTo, true) ? { createdAt: { ...(day(q.joinedFrom) ? { gte: day(q.joinedFrom) } : {}), ...(day(q.joinedTo, true) ? { lte: day(q.joinedTo, true) } : {}) } } : {}),
    ...(q.city ? { addresses: { some: { deletedAt: null, isGift: false, city: { equals: q.city, mode: 'insensitive' } } } } : {}),
    ...(search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search.replace(/\s/g, '') } },
        ...(search.includes(' ') ? [{ AND: [{ firstName: { contains: search.split(' ')[0], mode: 'insensitive' as const } }, { lastName: { contains: search.split(' ').slice(1).join(' '), mode: 'insensitive' as const } }] }] : []),
      ],
    } : {}),
  };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true, status: true, language: true, createdAt: true, lastLoginAt: true,
      emailVerified: true, phoneVerified: true, phoneVerifiedAt: true, phoneVerifiedVia: true,
      marketingConsent: true, marketingEmail: true, marketingSms: true, crmTags: true, referralCode: true,
      addresses: { where: { deletedAt: null, isGift: false }, select: { city: true, isDefault: true }, orderBy: { createdAt: 'asc' } },
      subscriptions: { where: { isGift: false }, select: { status: true, plan: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      referralsReceived: { select: { inviter: { select: { email: true } } }, take: 1 },
      _count: { select: { dogs: { where: { deletedAt: null, forGift: false } } } },
    },
  });
  const ids = users.map((u) => u.id);

  const [money, orders] = ids.length ? await Promise.all([
    prisma.$queryRaw<{ userId: string; paid: number; refunded: number }[]>`
      SELECT p."userId", SUM(p.amount)::float AS paid, COALESCE(SUM(r.refunded), 0)::float AS refunded
      FROM "Payment" p
      LEFT JOIN (SELECT "paymentId", SUM(amount) AS refunded FROM "Refund" GROUP BY "paymentId") r ON r."paymentId" = p.id
      WHERE p.status IN ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED') AND p."userId" IN (${Prisma.join(ids)})
      GROUP BY p."userId"`,
    prisma.order.groupBy({ by: ['userId'], where: { userId: { in: ids }, status: { in: [...PAID_ORDER] } }, _count: { _all: true }, _max: { createdAt: true } }),
  ]) : [[], []];
  const moneyBy = new Map(money.map((m) => [m.userId, m]));
  const ordersBy = new Map(orders.map((o) => [o.userId, o]));

  let rows = users.map((u) => {
    const m = moneyBy.get(u.id), o = ordersBy.get(u.id);
    const running = u.subscriptions.find((s) => RUNNING.includes(s.status));
    const had = u.subscriptions.some((s) => s.status !== 'PENDING');
    const home = u.addresses.find((a) => a.isDefault) ?? u.addresses[0];
    return {
      id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone, status: u.status, language: u.language,
      createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
      emailVerified: u.emailVerified, phoneVerified: u.phoneVerified, phoneVerifiedAt: u.phoneVerifiedAt, phoneVerifiedVia: u.phoneVerifiedVia,
      marketingConsent: u.marketingConsent, marketingEmail: u.marketingEmail, marketingSms: u.marketingSms,
      tags: u.crmTags, referralCode: u.referralCode, invitedBy: u.referralsReceived[0]?.inviter.email ?? null,
      city: home?.city ?? null, dogs: u._count.dogs,
      orders: o?._count._all ?? 0, lastOrderAt: o?._max.createdAt ?? null,
      spent: +((m?.paid ?? 0) - (m?.refunded ?? 0)).toFixed(2), refunded: +(m?.refunded ?? 0).toFixed(2),
      plan: running ? 'active' : had ? 'ended' : 'none', planName: (running ?? u.subscriptions.find((s) => s.status !== 'PENDING'))?.plan.name ?? null,
    };
  });

  if (q.plan === 'active' || q.plan === 'ended' || q.plan === 'none') rows = rows.filter((r) => r.plan === q.plan);
  if (q.buyer === 'yes') rows = rows.filter((r) => r.orders > 0);
  if (q.buyer === 'no') rows = rows.filter((r) => r.orders === 0);

  const dir = q.dir === 'asc' ? 1 : -1;
  const time = (d: Date | null) => (d ? d.getTime() : 0);
  const by: Record<string, (r: (typeof rows)[number]) => number | string> = {
    joined: (r) => time(r.createdAt), spent: (r) => r.spent, orders: (r) => r.orders,
    lastOrder: (r) => time(r.lastOrderAt), lastLogin: (r) => time(r.lastLoginAt),
    name: (r) => `${r.firstName} ${r.lastName}`.toLowerCase(),
  };
  const key = by[q.sort ?? ''] ?? by.joined;
  rows.sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });

  // What the whole filtered group adds up to, for the cards above the list.
  const totals = {
    customers: rows.length,
    onPlan: rows.filter((r) => r.plan === 'active').length,
    buyers: rows.filter((r) => r.orders > 0).length,
    spent: +rows.reduce((n, r) => n + r.spent, 0).toFixed(2),
  };
  const cities = [...new Set(users.flatMap((u) => u.addresses.map((a) => a.city.trim())).filter(Boolean))].sort();
  const tags = [...new Set(users.flatMap((u) => u.crmTags))].sort();

  if (all) return { rows, total: rows.length, page: 1, pages: 1, totals, cities, tags };
  const limit = Math.min(200, Math.max(5, Number(q.limit) || 25));
  const pages = Math.max(1, Math.ceil(rows.length / limit));
  const page = Math.min(pages, Math.max(1, Number(q.page) || 1));
  return { rows: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, pages, totals, cities, tags };
}

const cell = (v: unknown) => {
  const s = v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The list as a spreadsheet (opens in Excel and Google Sheets, Georgian included). */
export function customersCsv(rows: CustomerRow[]) {
  const head = ['First name', 'Last name', 'Email', 'Phone', 'Phone confirmed', 'Email confirmed', 'City', 'Language', 'Status', 'Plan', 'Plan name', 'Paid orders', 'Spent (GEL)', 'Refunded (GEL)', 'Last order', 'Dogs', 'Email offers', 'SMS offers', 'Tags', 'Invited by', 'Referral code', 'Joined', 'Last sign-in'];
  const lines = rows.map((r) => [
    r.firstName, r.lastName, r.email, r.phone, r.phoneVerified ? 'yes' : 'no', r.emailVerified ? 'yes' : 'no', r.city, r.language, r.status,
    r.plan, r.planName, r.orders, r.spent.toFixed(2), r.refunded.toFixed(2), r.lastOrderAt, r.dogs,
    r.marketingEmail ? 'yes' : 'no', r.marketingSms ? 'yes' : 'no', r.tags.join('; '), r.invitedBy, r.referralCode, r.createdAt, r.lastLoginAt,
  ].map(cell).join(','));
  return '﻿' + [head.join(','), ...lines].join('\n');
}
