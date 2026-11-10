import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildBuckets, bucketIndex, pctChange, resolveWindow, TimeBucket } from './analytics.range';
import { channelShare, CUSTOMER, ledger, takenAt, takenIn, type Ledger, type Range } from '../../common/ledger';

/**
 * Pupbox sells through two channels that behave nothing alike:
 *
 *   • SUBSCRIPTION — recurring box plans (OrderItem.subscriptionPlanId)
 *   • ECOMMERCE    — one-off standalone products (OrderItem.productId)
 *
 * Money and customers are counted the one way every admin screen counts
 * them (common/ledger.ts): money on the day it was paid, refunds on the day
 * they were made, orders on the day they were placed. A MIXED order's money
 * is split between the channels by the value of its lines.
 */

const n = (v: unknown): number => (v == null ? 0 : Number(v));
const round2 = (v: number): number => Math.round(v * 100) / 100;

export interface ChannelPayments {
  paidCount: number;
  failedCount: number;
  refundedCount: number;
  pendingCount: number;
  paidAmount: number;
  failedAmount: number;
  refundedAmount: number;
  successRate: number;
}

const PLACED_ORDER = { id: true, type: true, status: true, createdAt: true, items: { select: { subscriptionPlanId: true, productId: true, quantity: true, total: true } } } as const;
type PlacedOrder = { id: string; type: string; status: string; createdAt: Date; items: { subscriptionPlanId: string | null; productId: string | null; quantity: number; total: unknown }[] };

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** Every headline card plus the time series, for one period and the one before it. */
  async getOverview(range?: string) {
    const w = resolveWindow(range);
    const cur: Range = { gte: w.from, lte: w.to };
    const prv: Range = { gte: w.prevFrom, lt: w.prevTo };

    const [money, prevMoney, placed, prevPlaced, attempts] = await Promise.all([
      ledger(this.prisma, cur),
      ledger(this.prisma, prv),
      this.prisma.order.findMany({ where: { createdAt: cur }, select: PLACED_ORDER }) as Promise<PlacedOrder[]>,
      this.prisma.order.findMany({ where: { createdAt: prv }, select: PLACED_ORDER }) as Promise<PlacedOrder[]>,
      // Card tries that didn't take money: failed, or still waiting for the bank.
      this.prisma.payment.findMany({ where: { status: { in: ['FAILED', 'PENDING'] }, createdAt: cur }, select: { status: true, amount: true, order: { select: { type: true, items: { select: { subscriptionPlanId: true, productId: true, total: true, quantity: true } } } } } }),
    ]);

    const mix = this.composition(placed);
    const prevMix = this.composition(prevPlaced);

    // ── Customers ──────────────────────────────────────────────────────────
    // `converted` is a true cohort measure: of the people who registered inside
    // this window, how many took a subscription.
    const [totalUsers, newUsers, prevNewUsers, convertedNewUsers, subscribedUsers, activeUsers] = await Promise.all([
      this.prisma.user.count({ where: CUSTOMER }),
      this.prisma.user.count({ where: { ...CUSTOMER, createdAt: cur } }),
      this.prisma.user.count({ where: { ...CUSTOMER, createdAt: prv } }),
      this.prisma.user.count({ where: { ...CUSTOMER, createdAt: cur, subscriptions: { some: {} } } }),
      // All-time: how much of the customer base has ever taken a subscription.
      this.prisma.user.count({ where: { ...CUSTOMER, subscriptions: { some: {} } } }),
      this.prisma.user.count({ where: { ...CUSTOMER, status: 'ACTIVE' } }),
    ]);

    // ── Subscriptions (state, not flow — counted as of now) ────────────────
    const subsByStatus = await this.prisma.customerSubscription.groupBy({ by: ['status'], _count: { id: true } });
    const statusCount = (s: string) => subsByStatus.find((r) => r.status === s)?._count.id ?? 0;

    // A cancelled plan stays ACTIVE until its last box goes out, so churn goes by
    // when the customer cancelled, whatever the status says now.
    const [newSubs, prevNewSubs, cancelledInRange, activeNotLeaving] = await Promise.all([
      this.prisma.customerSubscription.count({ where: { createdAt: cur } }),
      this.prisma.customerSubscription.count({ where: { createdAt: prv } }),
      this.prisma.customerSubscription.count({ where: { cancelledAt: cur } }),
      this.prisma.customerSubscription.count({ where: { status: 'ACTIVE', cancelledAt: null } }),
    ]);
    const churnBase = activeNotLeaving + cancelledInRange;
    const churnRate = churnBase > 0 ? +((cancelledInRange / churnBase) * 100).toFixed(1) : 0;

    const buckets = buildBuckets(w.from, w.to, w.spec.bucket);
    const [series] = await Promise.all([this.buildSeries(buckets, money, placed, cur)]);

    const payments = (ch: 'box' | 'shop'): ChannelPayments => {
      const c = money[ch];
      let failedCount = 0, failedAmount = 0, pendingCount = 0;
      for (const a of attempts) {
        const share = channelShare(a.order as any)[ch];
        if (share <= 0) continue;
        if (a.status === 'FAILED') { failedCount++; failedAmount += n(a.amount) * share; } else pendingCount++;
      }
      const paidCount = money.payments.filter((p) => channelShare(p.order)[ch] > 0).length;
      return {
        paidCount, failedCount, refundedCount: c.refundCount, pendingCount,
        paidAmount: round2(c.collected), failedAmount: round2(failedAmount), refundedAmount: round2(c.refunded),
        successRate: paidCount + failedCount > 0 ? +((paidCount / (paidCount + failedCount)) * 100).toFixed(1) : 0,
      };
    };
    const aov = (collected: number, orders: number) => (orders > 0 ? round2(collected / orders) : 0);

    return {
      range: w.spec.key,
      rangeLabel: w.spec.label,
      bucket: w.spec.bucket,
      from: w.from.toISOString(),
      to: w.to.toISOString(),
      comparedTo: { from: w.prevFrom.toISOString(), to: w.prevTo.toISOString() },

      subscription: {
        revenue: money.box.net,
        revenueChange: pctChange(money.box.net, prevMoney.box.net),
        orders: mix.box,
        ordersChange: pctChange(mix.box, prevMix.box),
        paidOrders: money.box.orders.size,
        // Average paid order: money in divided by the orders it came in for.
        aov: aov(money.box.collected, money.box.orders.size),
        activeSubs: statusCount('ACTIVE'),
        pausedSubs: statusCount('PAUSED'),
        expiredSubs: statusCount('EXPIRED'),
        newSubs,
        newSubsChange: pctChange(newSubs, prevNewSubs),
        cancelled: cancelledInRange,
        churnRate,
        payments: payments('box'),
      },

      ecommerce: {
        revenue: money.shop.net,
        revenueChange: pctChange(money.shop.net, prevMoney.shop.net),
        orders: mix.shop,
        ordersChange: pctChange(mix.shop, prevMix.shop),
        paidOrders: money.shop.orders.size,
        aov: aov(money.shop.collected, money.shop.orders.size),
        unitsSold: money.units,
        unitsChange: pctChange(money.units, prevMoney.units),
        payments: payments('shop'),
      },

      combined: {
        revenue: money.net,
        revenueChange: pctChange(money.net, prevMoney.net),
        collected: money.collected,
        refunded: money.refunded,
        orders: placed.length,
        ordersChange: pctChange(placed.length, prevPlaced.length),
        // Mutually exclusive and summing to `orders`.
        boxOnlyOrders: mix.boxOnly,
        mixedOrders: mix.mixed,
        shopOnlyOrders: mix.shopOnly,
        paidOrders: money.paidOrders,
        failedOrders: placed.filter((o) => o.status === 'FAILED').length,
        pendingOrders: placed.filter((o) => o.status === 'PENDING').length,
        aov: aov(money.collected, money.paidOrders),
      },

      users: {
        total: totalUsers,
        new: newUsers,
        newChange: pctChange(newUsers, prevNewUsers),
        converted: convertedNewUsers,
        conversionRate: newUsers > 0 ? +((convertedNewUsers / newUsers) * 100).toFixed(1) : 0,
        subscribedTotal: subscribedUsers,
        subscribedRate: totalUsers > 0 ? +((subscribedUsers / totalUsers) * 100).toFixed(1) : 0,
        activeTotal: activeUsers,
      },

      series,
    };
  }

  /** Orders placed, by what they hold: boxes only, both, shop only. */
  private composition(orders: PlacedOrder[]) {
    let boxOnly = 0, mixed = 0, shopOnly = 0;
    for (const o of orders) {
      const s = channelShare(o as any);
      if (s.box > 0 && s.shop > 0) mixed++;
      else if (s.box > 0) boxOnly++;
      else shopOnly++;
    }
    return { boxOnly, mixed, shopOnly, box: boxOnly + mixed, shop: shopOnly + mixed };
  }

  /** Per-bucket revenue (money in less refunds), orders placed, and new customers. */
  private async buildSeries(buckets: TimeBucket[], money: Ledger, placed: PlacedOrder[], range: Range) {
    const rows = buckets.map((b) => ({
      label: b.label,
      start: b.start.toISOString(),
      subscriptionRevenue: 0,
      ecommerceRevenue: 0,
      subscriptionOrders: 0,
      ecommerceOrders: 0,
      registrations: 0,
    }));

    for (const p of money.payments) {
      const idx = bucketIndex(buckets, takenAt(p));
      if (idx < 0) continue;
      const s = channelShare(p.order);
      rows[idx].subscriptionRevenue += n(p.amount) * s.box;
      rows[idx].ecommerceRevenue += n(p.amount) * s.shop;
    }
    for (const r of money.refunds) {
      const idx = bucketIndex(buckets, r.createdAt);
      if (idx < 0) continue;
      const s = channelShare(r.payment.order);
      rows[idx].subscriptionRevenue -= n(r.amount) * s.box;
      rows[idx].ecommerceRevenue -= n(r.amount) * s.shop;
    }
    for (const o of placed) {
      const idx = bucketIndex(buckets, o.createdAt);
      if (idx < 0) continue;
      const s = channelShare(o as any);
      if (s.box > 0) rows[idx].subscriptionOrders++;
      if (s.shop > 0) rows[idx].ecommerceOrders++;
    }

    const newUsers = await this.prisma.user.findMany({ where: { ...CUSTOMER, createdAt: range }, select: { createdAt: true } });
    for (const u of newUsers) {
      const idx = bucketIndex(buckets, u.createdAt);
      if (idx >= 0) rows[idx].registrations++;
    }

    return rows.map((r) => ({
      ...r,
      subscriptionRevenue: round2(r.subscriptionRevenue),
      ecommerceRevenue: round2(r.ecommerceRevenue),
    }));
  }

  // ── Ecommerce: standalone product performance ────────────────────────────

  async getTopProducts(range?: string, limit = 8) {
    const w = resolveWindow(range);

    const items = await this.prisma.orderItem.findMany({
      where: {
        productId: { not: null },
        // Sold: orders money came in for in the period, as in Reports.
        order: { payments: { some: takenIn({ gte: w.from, lte: w.to }) } },
      },
      select: { productId: true, quantity: true, total: true, orderId: true },
    });

    // Group by product id, never by name — a renamed product must not split.
    const byProduct = new Map<string, { units: number; revenue: number; orders: Set<string> }>();
    for (const it of items) {
      if (!it.productId) continue;
      const acc = byProduct.get(it.productId) ?? { units: 0, revenue: 0, orders: new Set<string>() };
      acc.units += it.quantity;
      acc.revenue += n(it.total);
      acc.orders.add(it.orderId);
      byProduct.set(it.productId, acc);
    }

    if (byProduct.size === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...byProduct.keys()] } },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        salePrice: true,
        status: true,
        standaloneSale: true,
        includedInBox: true,
        category: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        inventory: { select: { quantity: true, lowStockAlert: true } },
      },
    });

    const totalRevenue = [...byProduct.values()].reduce((s, v) => s + v.revenue, 0);

    return products
      .map((p) => {
        const acc = byProduct.get(p.id)!;
        const stock = p.inventory?.quantity ?? 0;
        const threshold = p.inventory?.lowStockAlert ?? 0;
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category?.name ?? null,
          imageUrl: p.images[0]?.url ?? null,
          status: p.status,
          price: n(p.salePrice ?? p.price),
          unitsSold: acc.units,
          revenue: round2(acc.revenue),
          orderCount: acc.orders.size,
          revenueShare: totalRevenue > 0 ? +((acc.revenue / totalRevenue) * 100).toFixed(1) : 0,
          stock,
          lowStock: stock <= threshold,
          outOfStock: stock <= 0,
          includedInBox: p.includedInBox,
          standaloneSale: p.standaloneSale,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // ── Subscriptions: which plans people actually buy ───────────────────────

  async getTopPlans(range?: string, limit = 6) {
    const w = resolveWindow(range);

    const items = await this.prisma.orderItem.findMany({
      where: {
        subscriptionPlanId: { not: null },
        // Sold: orders money came in for in the period, as in Reports.
        order: { payments: { some: takenIn({ gte: w.from, lte: w.to }) } },
      },
      select: { subscriptionPlanId: true, total: true, orderId: true },
    });

    const byPlan = new Map<string, { revenue: number; orders: Set<string> }>();
    for (const it of items) {
      if (!it.subscriptionPlanId) continue;
      const acc = byPlan.get(it.subscriptionPlanId) ?? { revenue: 0, orders: new Set<string>() };
      acc.revenue += n(it.total);
      acc.orders.add(it.orderId);
      byPlan.set(it.subscriptionPlanId, acc);
    }

    if (byPlan.size === 0) return [];

    const planIds = [...byPlan.keys()];
    const [plans, activeByPlan] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true, slug: true, price: true, boxCount: true, durationValue: true, durationUnit: true, badge: true, isActive: true },
      }),
      this.prisma.customerSubscription.groupBy({
        by: ['planId'],
        where: { planId: { in: planIds }, status: 'ACTIVE' },
        _count: { id: true },
      }),
    ]);

    const totalSubs = [...byPlan.values()].reduce((s, v) => s + v.orders.size, 0);
    const totalRevenue = [...byPlan.values()].reduce((s, v) => s + v.revenue, 0);

    return plans
      .map((p) => {
        const acc = byPlan.get(p.id)!;
        return {
          planId: p.id,
          // Some plans were created with a blank name; the slug is the fallback identity.
          name: p.name?.trim() || p.slug,
          slug: p.slug,
          badge: p.badge,
          isActive: p.isActive,
          price: n(p.price),
          boxCount: p.boxCount,
          duration: `${p.durationValue} ${p.durationUnit.toLowerCase()}${p.durationValue > 1 ? 's' : ''}`,
          newSubscriptions: acc.orders.size,
          activeSubscriptions: activeByPlan.find((a) => a.planId === p.id)?._count.id ?? 0,
          revenue: round2(acc.revenue),
          subscriberShare: totalSubs > 0 ? +((acc.orders.size / totalSubs) * 100).toFixed(1) : 0,
          revenueShare: totalRevenue > 0 ? +((acc.revenue / totalRevenue) * 100).toFixed(1) : 0,
        };
      })
      .sort((a, b) => b.newSubscriptions - a.newSubscriptions || b.revenue - a.revenue)
      .slice(0, limit);
  }

  // ── Inventory health ─────────────────────────────────────────────────────

  async getInventoryAlerts(limit = 10) {
    const rows = await this.prisma.inventory.findMany({
      where: { product: { deletedAt: null, status: { not: 'DRAFT' } } },
      select: {
        quantity: true,
        reservedQty: true,
        lowStockAlert: true,
        product: { select: { id: true, name: true, sku: true, status: true, standaloneSale: true, includedInBox: true } },
      },
    });

    const alerts = rows
      .filter((r) => r.quantity <= r.lowStockAlert)
      .map((r) => ({
        productId: r.product.id,
        name: r.product.name,
        sku: r.product.sku,
        status: r.product.status,
        quantity: r.quantity,
        reservedQty: r.reservedQty,
        // What can actually be sold right now.
        available: Math.max(0, r.quantity - r.reservedQty),
        lowStockAlert: r.lowStockAlert,
        severity: r.quantity <= 0 ? ('out' as const) : ('low' as const),
        standaloneSale: r.product.standaloneSale,
        includedInBox: r.product.includedInBox,
      }))
      .sort((a, b) => a.quantity - b.quantity);

    return {
      outOfStock: alerts.filter((a) => a.severity === 'out').length,
      lowStock: alerts.filter((a) => a.severity === 'low').length,
      items: alerts.slice(0, limit),
    };
  }

  // ── Box campaigns: what is going into this period's boxes ────────────────

  async getBoxItems() {
    const now = new Date();
    const campaigns = await this.prisma.boxCampaign.findMany({
      where: { isActive: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 4,
      select: {
        id: true,
        name: true,
        month: true,
        year: true,
        dogSize: true,
        products: {
          select: {
            quantity: true,
            product: {
              select: { id: true, name: true, sku: true, price: true, inventory: { select: { quantity: true, lowStockAlert: true } } },
            },
          },
        },
      },
    });

    return campaigns.map((c) => {
      const items = c.products.map((bp) => {
        const stock = bp.product.inventory?.quantity ?? 0;
        return {
          productId: bp.product.id,
          name: bp.product.name,
          sku: bp.product.sku,
          quantityPerBox: bp.quantity,
          unitPrice: n(bp.product.price),
          stock,
          lowStock: stock <= (bp.product.inventory?.lowStockAlert ?? 0),
        };
      });
      return {
        campaignId: c.id,
        name: c.name,
        month: c.month,
        year: c.year,
        dogSize: c.dogSize,
        isCurrent: c.month === now.getMonth() + 1 && c.year === now.getFullYear(),
        itemCount: items.length,
        boxCost: round2(items.reduce((s, i) => s + i.unitPrice * i.quantityPerBox, 0)),
        lowStockCount: items.filter((i) => i.lowStock).length,
        items,
      };
    });
  }

  // ── Legacy endpoints kept so nothing else in the app breaks ──────────────

  async getOrderStatusBreakdown(range?: string) {
    const w = resolveWindow(range);
    const statuses = await this.prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: w.from, lte: w.to } },
      _count: { id: true },
    });
    return statuses.map((s) => ({ status: s.status, count: s._count.id }));
  }
}
