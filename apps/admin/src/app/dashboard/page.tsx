'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomSelect } from '../../components/Toolbar';
import {
  CHANNEL, card, money, MetricCard, InsightCard, SectionHeader, Panel, EmptyState,
  StackedChannelChart, SimpleBarChart, ChartLegend, PaymentsPanel, RankRow, StockBadge, Delta,
  type SeriesPoint, type PaymentsSummary,
} from '../../components/DashboardWidgets';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const RANGE_OPTIONS = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '1m', label: 'Last month' },
  { value: '2m', label: 'Last 2 months' },
  { value: '3m', label: 'Last 3 months' },
  { value: '1y', label: 'Last year' },
];

/** A `null` change means the previous period had no activity to compare against. */
type Change = number | null;

interface ChannelBlock {
  revenue: number; revenueChange: Change;
  orders: number; ordersChange: Change;
  paidOrders: number;
  aov: number;
  payments: PaymentsSummary;
}
interface SubscriptionBlock extends ChannelBlock {
  activeSubs: number; pausedSubs: number; expiredSubs: number;
  newSubs: number; newSubsChange: Change; cancelled: number; churnRate: number;
}
interface EcommerceBlock extends ChannelBlock {
  unitsSold: number; unitsChange: Change;
}
interface Overview {
  range: string; rangeLabel: string; bucket: string;
  subscription: SubscriptionBlock;
  ecommerce: EcommerceBlock;
  combined: {
    revenue: number; revenueChange: Change; orders: number; ordersChange: Change; aov: number;
    boxOnlyOrders: number; mixedOrders: number; shopOnlyOrders: number;
    paidOrders: number; failedOrders: number; pendingOrders: number;
  };
  users: {
    total: number; new: number; newChange: Change; converted: number; conversionRate: number;
    subscribedTotal: number; subscribedRate: number; activeTotal: number;
  };
  series: SeriesPoint[];
}
interface TopProduct {
  productId: string; name: string; sku: string; category: string | null;
  unitsSold: number; revenue: number; orderCount: number; revenueShare: number;
  stock: number; lowStock: boolean; outOfStock: boolean; standaloneSale: boolean;
}
interface TopPlan {
  planId: string; name: string; slug: string; duration: string; price: number; boxCount: number;
  newSubscriptions: number; activeSubscriptions: number; revenue: number; subscriberShare: number; isActive: boolean;
}
interface InventoryAlerts {
  outOfStock: number; lowStock: number;
  items: { productId: string; name: string; sku: string; quantity: number; reservedQty: number; available: number; lowStockAlert: number; severity: 'out' | 'low'; includedInBox: boolean }[];
}
interface GiftSummary {
  unclaimedCount: number;
  unclaimedValue: number;
  staleCount: number;
  claimedCount: number;
}
interface BoxCampaign {
  campaignId: string; name: string; month: number; year: number; isCurrent: boolean;
  itemCount: number; boxCost: number; lowStockCount: number;
  items: { productId: string; name: string; sku: string; quantityPerBox: number; stock: number; lowStock: boolean }[];
}

export default function DashboardPage() {
  const [range, setRange] = useState('1m');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [plans, setPlans] = useState<TopPlan[]>([]);
  const [inventory, setInventory] = useState<InventoryAlerts | null>(null);
  const [boxes, setBoxes] = useState<BoxCampaign[]>([]);
  const [gifts, setGifts] = useState<GiftSummary | null>(null);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` };
      const [oRes, pRes, plRes, iRes, bRes, gRes] = await Promise.all([
        fetch(`${API}/analytics/overview?range=${r}`, { headers }),
        fetch(`${API}/analytics/top-products?range=${r}&limit=6`, { headers }),
        fetch(`${API}/analytics/top-plans?range=${r}&limit=6`, { headers }),
        fetch(`${API}/analytics/inventory-alerts?limit=6`, { headers }),
        fetch(`${API}/analytics/box-items`, { headers }),
        fetch(`${API}/admin/gifts/summary`, { headers }),
      ]);
      setGifts(gRes.ok ? await gRes.json() : null);
      if (!oRes.ok) throw new Error(oRes.status === 401 ? 'Session expired — please sign in again.' : `Analytics request failed (${oRes.status})`);
      setOverview(await oRes.json());
      setProducts(pRes.ok ? await pRes.json() : []);
      setPlans(plRes.ok ? await plRes.json() : []);
      setInventory(iRes.ok ? await iRes.json() : null);
      setBoxes(bRes.ok ? await bRes.json() : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? '';
  const sub = overview?.subscription;
  const ecom = overview?.ecommerce;

  return (
    <div style={{ padding: 32 }}>
      {/* ── Header + period picker ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 13.5, color: 'var(--slate-400)', marginTop: 4 }}>
            Subscription boxes and shop products, measured separately.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Refreshing…</span>}
          <CustomSelect value={range} onChange={setRange} options={RANGE_OPTIONS} style={{ minWidth: 168 }} />
        </div>
      </div>

      {error && (
        <div style={{ ...card, padding: '14px 18px', marginBottom: 20, borderColor: 'var(--red-200)', background: 'var(--red-50)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, color: 'var(--red-700)', flex: 1 }}>{error}</span>
          <button onClick={() => load(range)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--red-700)', background: 'transparent', border: '1px solid var(--red-300)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {loading && !overview ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '90px 0', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', border: '4px solid var(--teal-100)', borderTopColor: 'var(--teal-600)', animation: 'spin 0.7s linear infinite' }} />
          <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>Loading metrics…</p>
        </div>
      ) : overview && sub && ecom ? (
        <>
          {/* ── Combined headline ────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(268px, 1fr))', gap: 14 }}>
            <InsightCard
              label="Total revenue" emoji="💰" bg="var(--green-50)" accent="var(--emerald-600)"
              value={money(overview.combined.revenue)} change={overview.combined.revenueChange}
              segments={[
                { label: 'boxes', value: Math.round(sub.revenue), color: CHANNEL.subscription.accent },
                { label: 'shop', value: Math.round(ecom.revenue), color: CHANNEL.ecommerce.accent },
              ]}
              segmentTotal={Math.round(overview.combined.revenue)}
              segmentFormat={money}
              footer={`${money(overview.combined.aov)} average paid order · money actually collected`}
            />

            <InsightCard
              label="Total orders" emoji="📦" bg="var(--blue-50)" accent="var(--blue-600)" href="/dashboard/orders"
              value={overview.combined.orders} change={overview.combined.ordersChange}
              segments={[
                { label: 'boxes only', value: overview.combined.boxOnlyOrders, color: CHANNEL.subscription.accent },
                { label: 'both', value: overview.combined.mixedOrders, color: 'var(--amber-500)' },
                { label: 'shop only', value: overview.combined.shopOnlyOrders, color: CHANNEL.ecommerce.accent },
              ]}
              segmentTotal={overview.combined.orders}
              stats={[
                { label: 'paid', value: overview.combined.paidOrders, color: 'var(--emerald-600)' },
                { label: 'failed', value: overview.combined.failedOrders, color: overview.combined.failedOrders > 0 ? 'var(--red-600)' : undefined },
                { label: 'pending', value: overview.combined.pendingOrders },
              ]}
            />

            <InsightCard
              label="Customers" emoji="👥" bg="var(--teal-50)" accent="var(--slate-900)" href="/dashboard/customers"
              value={overview.users.total.toLocaleString()} valueSuffix="registered in total"
              segments={[
                { label: 'subscribed', value: overview.users.subscribedTotal, color: CHANNEL.subscription.accent },
                { label: 'not yet', value: Math.max(0, overview.users.total - overview.users.subscribedTotal), color: 'var(--slate-300)' },
              ]}
              segmentTotal={overview.users.total}
              stats={[
                { label: `new this period`, value: `+${overview.users.new}`, color: 'var(--blue-600)' },
                { label: 'of those subscribed', value: `${overview.users.converted} (${overview.users.conversionRate}%)`, color: CHANNEL.subscription.accent },
              ]}
              footer={<Delta value={overview.users.newChange} suffix="new sign-ups vs previous period" />}
            />

            <InsightCard
              label="Subscriptions" emoji="🔄" bg="var(--violet-50)" accent={CHANNEL.subscription.accent} href="/dashboard/subscriptions"
              value={sub.activeSubs} valueSuffix="active right now"
              segments={[
                { label: 'active', value: sub.activeSubs, color: 'var(--emerald-600)' },
                { label: 'paused', value: sub.pausedSubs, color: 'var(--amber-500)' },
                { label: 'expired', value: sub.expiredSubs, color: 'var(--slate-300)' },
              ]}
              stats={[
                { label: 'new this period', value: `+${sub.newSubs}`, color: CHANNEL.subscription.accent },
                { label: 'churn rate', value: `${sub.churnRate}%`, color: sub.churnRate > 10 ? 'var(--red-600)' : 'var(--slate-800)' },
              ]}
            />
          </div>

          {/* ── Channel mix chart ───────────────────────────────────────── */}
          <div style={{ ...card, padding: 22, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>
                  {chartMetric === 'revenue' ? 'Revenue by channel' : 'Orders by channel'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 2 }}>
                  {rangeLabel}, grouped by {overview.bucket}
                </div>
              </div>
              <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 9, padding: 3, gap: 2 }}>
                {(['revenue', 'orders'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    style={{
                      padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                      textTransform: 'capitalize', transition: 'all 0.12s',
                      background: chartMetric === m ? 'var(--white)' : 'transparent',
                      color: chartMetric === m ? 'var(--teal-600)' : 'var(--slate-400)',
                      boxShadow: chartMetric === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >{m}</button>
                ))}
              </div>
            </div>
            <StackedChannelChart series={overview.series} metric={chartMetric} />
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--slate-100)' }}>
              <ChartLegend items={[
                { color: CHANNEL.subscription.accent, label: CHANNEL.subscription.label, value: chartMetric === 'revenue' ? money(sub.revenue) : String(sub.orders) },
                { color: CHANNEL.ecommerce.accent, label: CHANNEL.ecommerce.label, value: chartMetric === 'revenue' ? money(ecom.revenue) : String(ecom.orders) },
              ]} />
            </div>
          </div>

          {/* ══ SUBSCRIPTION CHANNEL ════════════════════════════════════ */}
          <SectionHeader
            emoji="🔄" title="Subscription boxes" accent={CHANNEL.subscription.accent}
            subtitle="Recurring box plans — renewals, churn and plan popularity"
            action={{ label: 'All subscriptions', href: '/dashboard/subscriptions' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <MetricCard label="Box revenue" emoji="💎" accent={CHANNEL.subscription.accent} bg={CHANNEL.subscription.bg}
              value={money(sub.revenue)} change={sub.revenueChange} sub={`${money(sub.aov)} average paid order`} />
            <MetricCard label="Box orders" emoji="🧾" accent={CHANNEL.subscription.accent} bg={CHANNEL.subscription.bg}
              value={sub.orders} change={sub.ordersChange} sub={`${sub.paidOrders} paid · includes mixed orders`} />
            <MetricCard label="New subscribers" emoji="✨" accent={CHANNEL.subscription.accent} bg={CHANNEL.subscription.bg}
              value={sub.newSubs} change={sub.newSubsChange} sub="signed up in this period" />
            <MetricCard label="Churn rate" emoji="📉" accent={sub.churnRate > 10 ? 'var(--red-600)' : CHANNEL.subscription.accent} bg="var(--red-50)"
              value={`${sub.churnRate}%`} sub={`${sub.cancelled} cancelled in period`} />
            {/* An unclaimed gift is money taken with nothing shipped — it needs
                chasing, so it sits on the dashboard rather than only behind a filter. */}
            <MetricCard
              label="Unclaimed gifts" emoji="🎁" bg="var(--amber-50)"
              accent={gifts && gifts.staleCount > 0 ? 'var(--red-600)' : gifts && gifts.unclaimedCount > 0 ? 'var(--amber-700)' : 'var(--emerald-600)'}
              href="/dashboard/subscriptions?gifts=unclaimed"
              value={gifts?.unclaimedCount ?? 0}
              sub={
                !gifts || gifts.unclaimedCount === 0
                  ? 'all gifts claimed'
                  : `${money(gifts.unclaimedValue)} paid, not yet shippable${gifts.staleCount > 0 ? ` · ${gifts.staleCount} over 14 days` : ''}`
              }
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)', gap: 14, marginTop: 14 }}>
            <Panel title="Subscription payments" subtitle="Plan revenue collected in this period">
              <PaymentsPanel payments={sub.payments} accent={CHANNEL.subscription.accent} />
            </Panel>

            <Panel title="Most popular plans" subtitle="Ranked by new subscribers in this period" action={{ label: 'Manage plans', href: '/dashboard/subscription-plans' }}>
              {plans.length === 0 ? (
                <EmptyState emoji="🔄" text="No plans sold in this period" />
              ) : (
                <div>
                  {plans.map((p, i) => (
                    <RankRow
                      key={p.planId} rank={i + 1} accent={CHANNEL.subscription.accent}
                      title={p.name}
                      badge={!p.isActive ? (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'var(--slate-100)', color: 'var(--slate-500)', flexShrink: 0 }}>INACTIVE</span>
                      ) : i === 0 ? (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: CHANNEL.subscription.bg, color: CHANNEL.subscription.accent, border: '1px solid var(--teal-200)', flexShrink: 0 }}>MOST POPULAR</span>
                      ) : undefined}
                      meta={`${p.duration} · ${p.boxCount} ${p.boxCount === 1 ? 'box' : 'boxes'} · ${money(p.price)} · ${p.activeSubscriptions} active now`}
                      value={`${p.newSubscriptions} new`}
                      valueSub={money(p.revenue)}
                      share={p.subscriberShare}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* ══ ECOMMERCE CHANNEL ═══════════════════════════════════════ */}
          <SectionHeader
            emoji="🛍️" title="Shop products" accent={CHANNEL.ecommerce.accent}
            subtitle="One-off standalone product sales — units, stock and product performance"
            action={{ label: 'All products', href: '/dashboard/products' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <MetricCard label="Shop revenue" emoji="💵" accent={CHANNEL.ecommerce.accent} bg={CHANNEL.ecommerce.bg}
              value={money(ecom.revenue)} change={ecom.revenueChange} sub={`${money(ecom.aov)} average paid basket`} />
            <MetricCard label="Shop orders" emoji="🛒" accent={CHANNEL.ecommerce.accent} bg={CHANNEL.ecommerce.bg}
              value={ecom.orders} change={ecom.ordersChange} sub={`${ecom.paidOrders} paid · includes mixed orders`} href="/dashboard/orders" />
            <MetricCard label="Units sold" emoji="📊" accent={CHANNEL.ecommerce.accent} bg={CHANNEL.ecommerce.bg}
              value={ecom.unitsSold} change={ecom.unitsChange} sub="individual items shipped" />
            <MetricCard label="Stock alerts" emoji="⚠️" bg="var(--amber-50)"
              accent={inventory && inventory.outOfStock > 0 ? 'var(--red-600)' : inventory && inventory.lowStock > 0 ? 'var(--amber-700)' : 'var(--emerald-600)'}
              value={inventory ? inventory.outOfStock + inventory.lowStock : 0}
              sub={inventory ? `${inventory.outOfStock} out of stock · ${inventory.lowStock} low` : 'no data'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)', gap: 14, marginTop: 14 }}>
            <Panel title="Shop payments" subtitle="Product revenue collected in this period">
              <PaymentsPanel payments={ecom.payments} accent={CHANNEL.ecommerce.accent} />
            </Panel>

            <Panel title="Product performance" subtitle="Ranked by revenue in this period" action={{ label: 'Manage products', href: '/dashboard/products' }}>
              {products.length === 0 ? (
                <EmptyState emoji="🛍️" text="No products sold in this period" />
              ) : (
                <div>
                  {products.map((p, i) => (
                    <RankRow
                      key={p.productId} rank={i + 1} accent={CHANNEL.ecommerce.accent}
                      title={p.name}
                      badge={<StockBadge outOfStock={p.outOfStock} lowStock={p.lowStock} />}
                      meta={`${p.sku}${p.category ? ` · ${p.category}` : ''} · ${p.unitsSold} units · ${p.orderCount} orders · ${p.stock} in stock`}
                      value={money(p.revenue)}
                      valueSub={`${p.revenueShare}% of shop`}
                      share={p.revenueShare}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* ══ INVENTORY + BOX CONTENTS ════════════════════════════════ */}
          <SectionHeader
            emoji="📦" title="Inventory & box contents" accent="var(--amber-600)"
            subtitle="What needs restocking, and what is going into the boxes"
            action={{ label: 'Box campaigns', href: '/dashboard/box-campaigns' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
            <Panel title="Restock alerts" subtitle="At or below the low-stock threshold" action={{ label: 'Products', href: '/dashboard/products' }} minHeight={220}>
              {!inventory || inventory.items.length === 0 ? (
                <EmptyState emoji="✅" text="Every product is above its threshold" />
              ) : (
                <div>
                  {inventory.items.map((it) => (
                    <div key={it.productId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--slate-100)' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: it.severity === 'out' ? 'var(--red-500)' : 'var(--amber-500)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--slate-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--slate-400)', marginTop: 1 }}>
                          {it.sku} · threshold {it.lowStockAlert}
                          {it.reservedQty > 0 && ` · ${it.reservedQty} reserved`}
                          {it.includedInBox && ' · in boxes'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: it.severity === 'out' ? 'var(--red-600)' : 'var(--amber-700)' }}>{it.quantity}</div>
                        <div style={{ fontSize: 10, color: 'var(--slate-400)' }}>{it.available} sellable</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Box campaigns" subtitle="Active campaigns and their contents" action={{ label: 'Box items', href: '/dashboard/box-items' }} minHeight={220}>
              {boxes.length === 0 ? (
                <EmptyState emoji="📦" text="No active box campaigns" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {boxes.map((c) => (
                    <div key={c.campaignId} style={{ border: '1px solid var(--slate-200b)', borderRadius: 11, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: c.itemCount > 0 ? 9 : 0 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.name}
                            {c.isCurrent && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px solid var(--teal-200)' }}>CURRENT</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--slate-400)', marginTop: 1 }}>
                            {String(c.month).padStart(2, '0')}/{c.year} · {c.itemCount} {c.itemCount === 1 ? 'item' : 'items'}
                            {c.itemCount > 0 && ` · ${money(c.boxCost)} cost per box`}
                          </div>
                        </div>
                        {c.lowStockCount > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)', flexShrink: 0 }}>
                            {c.lowStockCount} LOW
                          </span>
                        )}
                      </div>
                      {c.itemCount === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--slate-400)', fontStyle: 'italic' }}>
                          No products assigned yet — <Link href="/dashboard/box-campaigns" style={{ color: 'var(--teal-600)' }}>add items</Link>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {c.items.map((it) => (
                            <span key={it.productId} title={`${it.name} · ${it.stock} in stock`} style={{
                              fontSize: 10.5, padding: '3px 8px', borderRadius: 7, whiteSpace: 'nowrap',
                              background: it.lowStock ? 'var(--amber-50)' : 'var(--slate-100)',
                              color: it.lowStock ? 'var(--amber-700)' : 'var(--slate-600)',
                              border: `1px solid ${it.lowStock ? 'var(--amber-200)' : 'var(--slate-200)'}`,
                            }}>
                              {it.quantityPerBox}× {it.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* ══ CUSTOMER REGISTRATIONS ══════════════════════════════════ */}
          <SectionHeader
            emoji="👥" title="Customer registrations" accent="var(--blue-600)"
            subtitle="Sign-ups over the period, compared with the previous one"
            action={{ label: 'All customers', href: '/dashboard/customers' }}
          />

          <div style={{ ...card, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Registered in period</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue-600)', lineHeight: 1.1, marginTop: 3 }}>{overview.users.new}</div>
                <Delta value={overview.users.newChange} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total customers</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--slate-900)', lineHeight: 1.1, marginTop: 3 }}>{overview.users.total.toLocaleString()}</div>
                <div style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 6 }}>all time</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Of those, subscribed</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: CHANNEL.subscription.accent, lineHeight: 1.1, marginTop: 3 }}>{overview.users.converted}</div>
                <div style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 6 }}>
                  {overview.users.new > 0 ? `${overview.users.conversionRate}% of this period's sign-ups` : 'no sign-ups in period'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>New subscriptions</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--slate-900)', lineHeight: 1.1, marginTop: 3 }}>{sub.newSubs}</div>
                <div style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 6 }}>new and returning customers</div>
              </div>
            </div>
            <SimpleBarChart
              series={overview.series.map((p) => ({ label: p.label, value: p.registrations }))}
              color="var(--blue-500)"
            />
          </div>

          {/* ── Quick actions ───────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginTop: 28 }}>
            {[
              { label: 'View orders', href: '/dashboard/orders', desc: `${overview.combined.pendingOrders} pending`, emoji: '📦', bg: 'var(--violet-50)' },
              { label: 'Manage products', href: '/dashboard/products', desc: 'Shop catalogue', emoji: '🛍️', bg: 'var(--blue-50)' },
              { label: 'Subscription plans', href: '/dashboard/subscription-plans', desc: 'Pricing and boxes', emoji: '🔄', bg: 'var(--teal-50)' },
              { label: 'Download reports', href: '/dashboard/reports', desc: 'Export CSV data', emoji: '📊', bg: 'var(--green-50)' },
            ].map((q) => (
              <Link key={q.href} href={q.href} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{q.emoji}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--slate-800)' }}>{q.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>{q.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : !error ? (
        <EmptyState emoji="📊" text="No data available" height={200} />
      ) : null}
    </div>
  );
}
