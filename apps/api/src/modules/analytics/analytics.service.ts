import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildBuckets, bucketIndex, pctChange, resolveWindow, TimeBucket } from './analytics.range';

/**
 * Pupbox sells through two channels that behave nothing alike:
 *
 *   • SUBSCRIPTION — recurring box plans (OrderItem.subscriptionPlanId)
 *   • ECOMMERCE    — one-off standalone products (OrderItem.productId)
 *
 * Order.type records SUBSCRIPTION / PRODUCT / MIXED, but MIXED orders contain
 * both kinds of line, so `type` alone cannot split revenue. Everything below
 * attributes at the OrderItem level instead, and splits each order's collected
 * payment between the channels in proportion to its line totals.
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

interface ChannelAccumulator {
  revenue: number;
  /** Every order touching this channel, whatever its payment outcome. */
  orders: Set<string>;
  /** Only orders that actually paid — the denominator for average order value. */
  paidOrders: Set<string>;
  units: number;
  payments: {
    paidCount: number;
    failedCount: number;
    refundedCount: number;
    pendingCount: number;
    paidAmount: number;
    failedAmount: number;
    refundedAmount: number;
  };
}

const newChannel = (): ChannelAccumulator => ({
  revenue: 0,
  orders: new Set(),
  paidOrders: new Set(),
  units: 0,
  payments: { paidCount: 0, failedCount: 0, refundedCount: 0, pendingCount: 0, paidAmount: 0, failedAmount: 0, refundedAmount: 0 },
});

type OrderRow = {
  id: string;
  createdAt: Date;
  type: string;
  status: string;
  total: unknown;
  items: { productId: string | null; subscriptionPlanId: string | null; quantity: number; total: unknown }[];
  payments: { status: string; amount: unknown; refunds: { amount: unknown }[] }[];
};

const COLLECTED = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];

/**
 * The payment that decides an order's money outcome: the one that collected
 * money if any did (a failed retry later doesn't undo it), else the latest.
 * Payments arrive oldest first.
 */
function decidingPayment(o: OrderRow) {
  const collected = o.payments.filter((p) => COLLECTED.includes(p.status));
  return collected[collected.length - 1] ?? o.payments[o.payments.length - 1];
}

/** Money the shop kept from a payment: what was collected minus what went back. */
function kept(p: { status: string; amount: unknown; refunds: { amount: unknown }[] }) {
  if (!COLLECTED.includes(p.status)) return { kept: 0, refunded: 0 };
  const refunded = p.refunds.reduce((s, r) => s + n(r.amount), 0);
  return { kept: Math.max(0, n(p.amount) - refunded), refunded };
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Every headline card plus the time series, derived from a single order query
   * spanning both the current and previous window.
   */
  async getOverview(range?: string) {
    const w = resolveWindow(range);

    const orders = (await this.prisma.order.findMany({
      where: { createdAt: { gte: w.prevFrom, lte: w.to } },
      select: {
        id: true,
        createdAt: true,
        type: true,
        status: true,
        total: true,
        items: { select: { productId: true, subscriptionPlanId: true, quantity: true, total: true } },
        payments: { select: { status: true, amount: true, refunds: { select: { amount: true } } }, orderBy: { createdAt: 'asc' } },
      },
    })) as unknown as OrderRow[];

    const current = orders.filter((o) => o.createdAt >= w.from);
    const previous = orders.filter((o) => o.createdAt < w.from);

    const cur = this.aggregate(current);
    const prev = this.aggregate(previous);

    // ── Users ──────────────────────────────────────────────────────────────
    // `converted` is a true cohort measure: of the people who registered inside
    // this window, how many took a subscription. Comparing new subscriptions to
    // new sign-ups would be nonsense — most subscriptions come from customers
    // who registered in an earlier period, so the ratio can exceed 100%.
    const [totalUsers, newUsers, prevNewUsers, convertedNewUsers, subscribedUsers, activeUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: w.from, lte: w.to } } }),
      this.prisma.user.count({ where: { createdAt: { gte: w.prevFrom, lt: w.from } } }),
      this.prisma.user.count({ where: { createdAt: { gte: w.from, lte: w.to }, subscriptions: { some: {} } } }),
      // All-time: how much of the customer base has ever taken a subscription.
      this.prisma.user.count({ where: { subscriptions: { some: {} } } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
    ]);

    // ── Subscriptions (state, not flow — counted as of now) ────────────────
    const subsByStatus = await this.prisma.customerSubscription.groupBy({ by: ['status'], _count: { id: true } });
    const statusCount = (s: string) => subsByStatus.find((r) => r.status === s)?._count.id ?? 0;

    // A cancelled plan stays ACTIVE until its last box goes out, so churn goes by
    // when the customer cancelled, whatever the status says now.
    const [newSubs, prevNewSubs, cancelledInRange, activeNotLeaving] = await Promise.all([
      this.prisma.customerSubscription.count({ where: { createdAt: { gte: w.from, lte: w.to } } }),
      this.prisma.customerSubscription.count({ where: { createdAt: { gte: w.prevFrom, lt: w.from } } }),
      this.prisma.customerSubscription.count({ where: { cancelledAt: { gte: w.from, lte: w.to } } }),
      this.prisma.customerSubscription.count({ where: { status: 'ACTIVE', cancelledAt: null } }),
    ]);

    const activeSubs = statusCount('ACTIVE');
    // Churn against the base that could have churned (active + those that did).
    const churnBase = activeNotLeaving + cancelledInRange;
    const churnRate = churnBase > 0 ? +((cancelledInRange / churnBase) * 100).toFixed(1) : 0;

    // ── Registration + revenue time series ─────────────────────────────────
    const buckets = buildBuckets(w.from, w.to, w.spec.bucket);
    const series = await this.buildSeries(buckets, current, w.from, w.to);

    const subOrders = cur.subscription.orders.size;
    const ecomOrders = cur.ecommerce.orders.size;

    return {
      range: w.spec.key,
      rangeLabel: w.spec.label,
      bucket: w.spec.bucket,
      from: w.from.toISOString(),
      to: w.to.toISOString(),
      comparedTo: { from: w.prevFrom.toISOString(), to: w.prevTo.toISOString() },

      subscription: {
        revenue: round2(cur.subscription.revenue),
        revenueChange: pctChange(cur.subscription.revenue, prev.subscription.revenue),
        orders: subOrders,
        ordersChange: pctChange(subOrders, prev.subscription.orders.size),
        paidOrders: cur.subscription.paidOrders.size,
        // Average order value must divide collected revenue by the orders that
        // actually paid — dividing by all orders understates it by the failure rate.
        aov: cur.subscription.paidOrders.size > 0 ? round2(cur.subscription.revenue / cur.subscription.paidOrders.size) : 0,
        activeSubs,
        pausedSubs: statusCount('PAUSED'),
        expiredSubs: statusCount('EXPIRED'),
        newSubs,
        newSubsChange: pctChange(newSubs, prevNewSubs),
        cancelled: cancelledInRange,
        churnRate,
        payments: this.finalisePayments(cur.subscription),
      },

      ecommerce: {
        revenue: round2(cur.ecommerce.revenue),
        revenueChange: pctChange(cur.ecommerce.revenue, prev.ecommerce.revenue),
        orders: ecomOrders,
        ordersChange: pctChange(ecomOrders, prev.ecommerce.orders.size),
        paidOrders: cur.ecommerce.paidOrders.size,
        aov: cur.ecommerce.paidOrders.size > 0 ? round2(cur.ecommerce.revenue / cur.ecommerce.paidOrders.size) : 0,
        unitsSold: cur.ecommerce.units,
        unitsChange: pctChange(cur.ecommerce.units, prev.ecommerce.units),
        payments: this.finalisePayments(cur.ecommerce),
      },

      combined: {
        revenue: round2(cur.subscription.revenue + cur.ecommerce.revenue),
        revenueChange: pctChange(
          cur.subscription.revenue + cur.ecommerce.revenue,
          prev.subscription.revenue + prev.ecommerce.revenue,
        ),
        orders: cur.totalOrders,
        ordersChange: pctChange(cur.totalOrders, prev.totalOrders),
        // Mutually exclusive and summing to `orders` — safe to render as a
        // composition bar, unlike the per-channel counts which share MIXED.
        boxOnlyOrders: cur.boxOnlyOrders,
        mixedOrders: cur.mixedOrders,
        shopOnlyOrders: cur.shopOnlyOrders,
        paidOrders: cur.paidOrders,
        failedOrders: cur.failedOrders,
        pendingOrders: cur.pendingOrders,
        aov: cur.paidOrders > 0 ? round2((cur.subscription.revenue + cur.ecommerce.revenue) / cur.paidOrders) : 0,
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

  /** Fold orders into per-channel totals, splitting MIXED orders by line value. */
  private aggregate(orders: OrderRow[]) {
    const subscription = newChannel();
    const ecommerce = newChannel();
    // Composition of the period's orders — these three are mutually exclusive
    // and sum to the total, unlike the per-channel counts which double-count MIXED.
    let boxOnlyOrders = 0;
    let mixedOrders = 0;
    let shopOnlyOrders = 0;
    let pendingOrders = 0;
    let failedOrders = 0;
    let paidOrders = 0;
    let countedOrders = 0;

    for (const o of orders) {
      if (o.status === 'PENDING') pendingOrders++;
      if (o.status === 'FAILED') failedOrders++;

      let subItems = 0;
      let prodItems = 0;
      let prodUnits = 0;
      for (const it of o.items) {
        const t = n(it.total);
        if (it.subscriptionPlanId) subItems += t;
        else if (it.productId) {
          prodItems += t;
          prodUnits += it.quantity;
        }
      }
      const lineTotal = subItems + prodItems;
      // An order with no priced lines can't be attributed to either channel.
      if (lineTotal <= 0) continue;
      countedOrders++;

      const hasSub = subItems > 0;
      const hasProd = prodItems > 0;
      if (hasSub && hasProd) mixedOrders++;
      else if (hasSub) boxOnlyOrders++;
      else shopOnlyOrders++;

      if (hasSub) subscription.orders.add(o.id);
      if (hasProd) {
        ecommerce.orders.add(o.id);
        ecommerce.units += prodUnits;
      }

      const payment = decidingPayment(o);
      if (!payment) continue;

      const money = kept(payment);
      if (COLLECTED.includes(payment.status)) paidOrders++;

      const subShare = subItems / lineTotal;
      const prodShare = prodItems / lineTotal;

      const apply = (ch: ChannelAccumulator, share: number, present: boolean) => {
        if (!present) return;
        switch (payment.status) {
          case 'PAID':
          case 'PARTIALLY_REFUNDED':
          case 'REFUNDED':
            // Revenue is money the shop kept: collected, less anything given back
            // (a plan cancelled after the free window keeps its first month).
            ch.revenue += money.kept * share;
            ch.paidOrders.add(o.id);
            if (money.refunded > 0) {
              ch.payments.refundedCount++;
              ch.payments.refundedAmount += money.refunded * share;
            } else {
              ch.payments.paidCount++;
              ch.payments.paidAmount += money.kept * share;
            }
            break;
          case 'FAILED':
            ch.payments.failedCount++;
            ch.payments.failedAmount += n(payment.amount) * share;
            break;
          default:
            ch.payments.pendingCount++;
        }
      };

      apply(subscription, subShare, hasSub);
      apply(ecommerce, prodShare, hasProd);
    }

    return {
      subscription, ecommerce,
      boxOnlyOrders, mixedOrders, shopOnlyOrders,
      pendingOrders, failedOrders, paidOrders,
      totalOrders: countedOrders,
    };
  }

  private finalisePayments(ch: ChannelAccumulator): ChannelPayments {
    const p = ch.payments;
    const attempts = p.paidCount + p.failedCount + p.refundedCount + p.pendingCount;
    return {
      paidCount: p.paidCount,
      failedCount: p.failedCount,
      refundedCount: p.refundedCount,
      pendingCount: p.pendingCount,
      paidAmount: round2(p.paidAmount),
      failedAmount: round2(p.failedAmount),
      refundedAmount: round2(p.refundedAmount),
      // A refunded payment still went through, so it counts as a success.
      successRate: attempts > 0 ? +(((p.paidCount + p.refundedCount) / attempts) * 100).toFixed(1) : 0,
    };
  }

  /** Per-bucket revenue split, order split, and new-user counts. */
  private async buildSeries(buckets: TimeBucket[], orders: OrderRow[], from: Date, to: Date) {
    const rows = buckets.map((b) => ({
      label: b.label,
      start: b.start.toISOString(),
      subscriptionRevenue: 0,
      ecommerceRevenue: 0,
      subscriptionOrders: 0,
      ecommerceOrders: 0,
      registrations: 0,
    }));

    for (const o of orders) {
      const idx = bucketIndex(buckets, o.createdAt);
      if (idx < 0) continue;

      let subItems = 0;
      let prodItems = 0;
      for (const it of o.items) {
        const t = n(it.total);
        if (it.subscriptionPlanId) subItems += t;
        else if (it.productId) prodItems += t;
      }
      const lineTotal = subItems + prodItems;
      if (lineTotal <= 0) continue;

      if (subItems > 0) rows[idx].subscriptionOrders++;
      if (prodItems > 0) rows[idx].ecommerceOrders++;

      const payment = decidingPayment(o);
      if (payment) {
        const amount = kept(payment).kept;
        rows[idx].subscriptionRevenue += amount * (subItems / lineTotal);
        rows[idx].ecommerceRevenue += amount * (prodItems / lineTotal);
      }
    }

    const newUsers = await this.prisma.user.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    });
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
        // Sold and kept: paid (or only partly refunded), not cancelled or refunded in full.
        order: { createdAt: { gte: w.from, lte: w.to }, status: { notIn: ['CANCELLED', 'REFUNDED'] }, payments: { some: { status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } } } },
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
        // Sold and kept: paid (or only partly refunded), not cancelled or refunded in full.
        order: { createdAt: { gte: w.from, lte: w.to }, status: { notIn: ['CANCELLED', 'REFUNDED'] }, payments: { some: { status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } } } },
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
