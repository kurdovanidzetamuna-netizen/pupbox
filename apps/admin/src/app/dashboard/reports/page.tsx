'use client';
import { useEffect, useMemo, useState } from 'react';
import Dropdown from '@/components/Dropdown';
import { DateInput } from '@/components/DateField';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const token = () => (typeof window === 'undefined' ? '' : localStorage.getItem('admin_token') || '');
const gel = (n: number) => `₾${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const DAY = 86400_000;
/** Today in Tbilisi as YYYY-MM-DD. */
const today = () => new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10);
const shift = (d: string, days: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10);

const PRESETS = [
  { key: '7d', label: 'Last 7 days', range: () => [shift(today(), -6), today()] },
  { key: '30d', label: 'Last 30 days', range: () => [shift(today(), -29), today()] },
  { key: '90d', label: 'Last 90 days', range: () => [shift(today(), -89), today()] },
  { key: 'month', label: 'This month', range: () => [today().slice(0, 8) + '01', today()] },
  { key: 'lastMonth', label: 'Last month', range: () => { const first = today().slice(0, 8) + '01'; const end = shift(first, -1); return [end.slice(0, 8) + '01', end]; } },
  { key: 'year', label: 'This year', range: () => [today().slice(0, 4) + '-01-01', today()] },
  { key: 'custom', label: 'Custom dates', range: () => [] as string[] },
] as const;
const TYPES = [
  { value: 'SUBSCRIPTION', label: 'Boxes (new plans)' }, { value: 'RENEWAL', label: 'Renewals' },
  { value: 'PRODUCT', label: 'Shop' }, { value: 'MIXED', label: 'Box + shop' }, { value: 'FREE_REWARD', label: 'Rewards' },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));
const STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const pretty = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

type Filters = { types: string[]; tierIds: string[]; planIds: string[]; categoryIds: string[]; cities: string[]; statuses: string[] };
const NO_FILTERS: Filters = { types: [], tierIds: [], planIds: [], categoryIds: [], cities: [], statuses: [] };

/**
 * Reports. "Insights" answers the owner's questions at a glance — how much
 * came in, from what, where, and is it better than before — for any period,
 * narrowed by box type, plan, category, city, order kind or status. Every
 * number is compared with the period just before it. "Exports" keeps the
 * raw spreadsheets.
 */
export default function ReportsPage() {
  const [tab, setTab] = useState<'insights' | 'exports'>('insights');
  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)', maxWidth: 1280 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Reports</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0' }}>How the business is doing, and spreadsheets to take away.</p>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 13, background: 'var(--slate-100)' }}>
          {(['insights', 'exports'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: tab === t ? 'var(--white)' : 'transparent', color: tab === t ? 'var(--slate-900)' : 'var(--slate-500)', boxShadow: tab === t ? '0 1px 4px rgba(15,23,42,.12)' : 'none' }}>
              {t === 'insights' ? '📊 Insights' : '⬇ Exports'}
            </button>
          ))}
        </div>
      </div>
      {tab === 'insights' ? <Insights /> : <Exports />}
    </div>
  );
}

function Insights() {
  const [preset, setPreset] = useState<string>('30d');
  const [from, setFrom] = useState(shift(today(), -29));
  const [to, setTo] = useState(today());
  const [groupBy, setGroupBy] = useState('');
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tiers, setTiers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [metric, setMetric] = useState<'collected' | 'orders' | 'refunded'>('collected');

  useEffect(() => {
    const h = { headers: { Authorization: `Bearer ${token()}` } };
    const get = (u: string) => fetch(`${API}/${u}`, h).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    get('admin/box-tiers').then((d) => setTiers(Array.isArray(d) ? d : []));
    get('admin/subscription-plans').then((d) => setPlans(Array.isArray(d) ? d.filter((p: any) => !p.deletedAt) : []));
    get('admin/categories').then((d) => setCats(Array.isArray(d) ? d.filter((c: any) => !c.deletedAt) : []));
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams({ from, to });
    if (groupBy) p.set('groupBy', groupBy);
    for (const [k, v] of Object.entries(f)) if (v.length) p.set(k, v.join(','));
    return p.toString();
  }, [from, to, groupBy, f]);

  useEffect(() => {
    if (!from || !to) return;
    let live = true;
    setLoading(true); setError('');
    fetch(`${API}/reports/insights?${query}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(Array.isArray(d.message) ? d.message[0] : d.message || 'Could not load the numbers.'); return d; })
      .then((d) => {
        if (!live) return;
        setData(d);
        // Cities come from the orders themselves; remember every one seen.
        setCities((c) => Array.from(new Set([...c, ...d.byCity.map((x: any) => x.label).filter((x: string) => x !== '—')])).sort());
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [query, from, to]);

  function pick(key: string) {
    setPreset(key);
    const r = PRESETS.find((p) => p.key === key)!.range();
    if (r.length) { setFrom(r[0]); setTo(r[1]); }
  }

  async function csv() {
    const r = await fetch(`${API}/reports/insights.csv?${query}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!r.ok) { alert('Download failed.'); return; }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a'); a.href = url; a.download = `pupbox-insights-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const active = Object.values(f).reduce((n, v) => n + v.length, 0);
  const set = (k: keyof Filters) => (v: string[]) => setF((x) => ({ ...x, [k]: v }));
  const catOptions = cats.filter((c) => !c.parentId).flatMap((c) => [
    { value: c.id, label: c.name },
    ...cats.filter((s) => s.parentId === c.id).map((s) => ({ value: s.id, label: s.name, indent: true })),
  ]);
  const tierName = Object.fromEntries(tiers.map((t) => [t.id, `${t.emoji ?? ''} ${t.name}`.trim()]));
  const planOptions = plans
    .filter((p) => !f.tierIds.length || f.tierIds.includes(p.tierId))
    .map((p) => ({ value: p.id, label: p.name, group: p.tierId ? tierName[p.tierId] ?? 'Box types' : 'Older plans' }));

  const k = data?.kpi, ch = data?.change;
  const date = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Period + filters */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 18, padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Dropdown aria-label="Period" icon="📅" value={preset} onChange={pick} options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} />
          {preset === 'custom' && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <DateInput aria-label="From" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              <span style={{ color: 'var(--slate-400)' }}>→</span>
              <DateInput aria-label="To" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} />
            </span>
          )}
          <Dropdown aria-label="Group by" value={groupBy} onChange={setGroupBy} options={[{ value: '', label: 'Auto grouping' }, { value: 'day', label: 'By day' }, { value: 'week', label: 'By week' }, { value: 'month', label: 'By month' }]} />
          <span style={{ flex: 1 }} />
          <button onClick={csv} disabled={!data} style={{ padding: '9px 14px', borderRadius: 11, border: '1.5px solid var(--slate-200)', background: 'var(--white)', fontSize: 13, fontWeight: 700, color: 'var(--slate-700)', cursor: 'pointer' }}>⬇ CSV</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Dropdown multiple aria-label="Order kind" placeholder="Kind: all" label="Kind" value={f.types} onChange={set('types')} options={TYPES} />
          <Dropdown multiple aria-label="Box type" placeholder="Box type: all" label="Box" value={f.tierIds} onChange={set('tierIds')} options={tiers.map((t) => ({ value: t.id, label: t.name, icon: t.emoji }))} />
          <Dropdown multiple aria-label="Plan" placeholder="Plan: all" label="Plan" value={f.planIds} onChange={set('planIds')} options={planOptions} />
          <Dropdown multiple aria-label="Category" placeholder="Category: all" label="Category" value={f.categoryIds} onChange={set('categoryIds')} options={catOptions} />
          <Dropdown multiple aria-label="City" placeholder="City: all" label="City" value={f.cities} onChange={set('cities')} options={cities.map((c) => ({ value: c, label: c }))} />
          <Dropdown multiple aria-label="Order status" placeholder="Status: all" label="Status" value={f.statuses} onChange={set('statuses')} options={STATUSES.map((s) => ({ value: s, label: pretty(s) }))} />
          {active > 0 && <button onClick={() => setF(NO_FILTERS)} style={{ border: 'none', background: 'none', color: 'var(--teal-700)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Clear {active} filter{active === 1 ? '' : 's'}</button>}
        </div>
        {data && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-400)' }}>
            {date(from)} – {date(to)} · compared with the {Math.round((new Date(data.range.to).getTime() - new Date(data.range.from).getTime()) / DAY)} days before · money counted on the day it was paid{loading ? ' · updating…' : ''}
          </p>
        )}
      </div>

      {error && <p role="alert" style={{ margin: 0, padding: '10px 14px', borderRadius: 12, background: 'var(--red-50)', color: 'var(--red-700)', fontSize: 13 }}>{error}</p>}
      {!data && !error && <p style={{ color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>}

      {data && (
        <div style={{ display: 'grid', gap: 16, opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          {/* The headline numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 170px), 1fr))', gap: 10 }}>
            <Kpi label="Money in" value={gel(k.collected)} delta={ch.collected} big />
            <Kpi label="Kept (after refunds)" value={gel(k.net)} delta={ch.net} big />
            <Kpi label="Paid orders" value={k.orders} delta={ch.orders} />
            <Kpi label="Average order" value={gel(k.aov)} delta={ch.aov} />
            <Kpi label="Refunded" value={gel(k.refunded)} sub={`${k.refundCount} refund${k.refundCount === 1 ? '' : 's'} · ${k.refundRate}%`} delta={ch.refunded} goodWhenDown />
            <Kpi label="New customers" value={k.newCustomers} delta={ch.newCustomers} />
            <Kpi label="Buyers" value={k.buyers} sub={`${k.returning} bought more than once`} delta={ch.buyers} />
            <Kpi label="Renewals paid" value={k.renewalsPaid} sub={k.recoveredCharges ? `${k.recoveredCharges} after a retry` : undefined} delta={ch.renewalsPaid} />
          </div>

          {/* Plans right now */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 170px), 1fr))', gap: 10 }}>
            <Mini label="Active plans now" value={data.plans.active} />
            <Mini label="Monthly plan income" value={gel(data.plans.mrr)} hint="What the active plans bring in a month" />
            <Mini label="Card failing now" value={data.plans.paymentFailed} tone={data.plans.paymentFailed ? 'warn' : undefined} hint="Renewal declined; retries are running" />
            <Mini label="Plans ended in period" value={data.plans.ended} />
          </div>

          {/* Over time */}
          <Card title="Over time" right={
            <div role="tablist" style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 10, background: 'var(--slate-100)' }}>
              {([['collected', 'Money'], ['orders', 'Orders'], ['refunded', 'Refunds']] as const).map(([m, l]) => (
                <button key={m} role="tab" aria-selected={metric === m} onClick={() => setMetric(m)} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: metric === m ? 'var(--white)' : 'transparent', color: metric === m ? 'var(--slate-900)' : 'var(--slate-500)' }}>{l}</button>
              ))}
            </div>
          }>
            <Chart rows={data.series} metric={metric} by={data.range.groupBy} />
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 16 }}>
            <Card title="By kind of order"><Bars rows={data.byType.map((r: any) => ({ ...r, label: TYPE_LABEL[r.key] ?? pretty(r.key) }))} money /></Card>
            <Card title="By box type"><Bars rows={data.byTier} money empty="No box plans paid in this period." /></Card>
            <Card title="By plan"><Bars rows={data.byPlan} money empty="No plans paid in this period." /></Card>
            <Card title="Shop by category"><Bars rows={data.byCategory} money unit="sold" empty="No shop products sold." /></Card>
            <Card title="By city"><Bars rows={data.byCity} money /></Card>
            <Card title="Best-selling products"><Bars rows={data.topProducts} money unit="sold" empty="No shop products sold." /></Card>
            <Card title="Why money went back"><Bars rows={data.refundReasons} money tone="red" empty="No refunds — nice." /></Card>
            <Card title="Orders placed, by where they are now">
              <Bars rows={Object.entries(data.ordersByStatus as Record<string, number>).map(([s, n]) => ({ key: s, label: pretty(s), value: n, count: n })).sort((a, b) => b.value - a.value)} empty="No orders placed." />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, delta, sub, big, goodWhenDown }: { label: string; value: any; delta?: number; sub?: string; big?: boolean; goodWhenDown?: boolean }) {
  const up = (delta ?? 0) > 0, flat = !delta;
  const good = goodWhenDown ? !up : up;
  return (
    <div style={{ background: big ? 'var(--teal-50)' : 'var(--white)', border: `1px solid ${big ? 'var(--teal-200)' : 'var(--slate-200b)'}`, borderRadius: 16, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)' }}>{label}</div>
      <div style={{ fontSize: big ? 24 : 20, fontWeight: 800, color: 'var(--slate-900)', marginTop: 4, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>{value}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4, fontSize: 11.5 }}>
        {delta !== undefined && (
          <span title="Compared with the period before" style={{ fontWeight: 800, color: flat ? 'var(--slate-400)' : good ? 'var(--green-700)' : 'var(--red-600)' }}>
            {flat ? '— same' : `${up ? '▲' : '▼'} ${Math.abs(delta) > 999 ? '999+' : Math.abs(delta).toFixed(Math.abs(delta) < 10 ? 1 : 0)}%`}
          </span>
        )}
        {sub && <span style={{ color: 'var(--slate-400)' }}>{sub}</span>}
      </div>
    </div>
  );
}

function Mini({ label, value, hint, tone }: { label: string; value: any; hint?: string; tone?: 'warn' }) {
  return (
    <div title={hint} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', borderRadius: 14, background: tone ? 'var(--amber-50)' : 'var(--slate-50)', border: `1px solid ${tone ? 'var(--amber-200)' : 'var(--slate-200b)'}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)' }}>{label}</span>
      <strong style={{ fontSize: 15, color: tone ? 'var(--amber-700)' : 'var(--slate-900)' }}>{value}</strong>
    </div>
  );
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 18, padding: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--slate-900)' }}>{title}</h2>{right}
      </div>
      {children}
    </section>
  );
}

function Bars({ rows, money, unit, empty = 'Nothing in this period.', tone }: { rows: { key: string; label: string; value: number; count: number }[]; money?: boolean; unit?: string; empty?: string; tone?: 'red' }) {
  if (!rows.length) return <p style={{ margin: 0, fontSize: 12.5, color: 'var(--slate-400)' }}>{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sum = rows.reduce((n, r) => n + r.value, 0) || 1;
  return (
    <div style={{ display: 'grid', gap: 9 }}>
      {rows.map((r) => (
        <div key={r.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: 'var(--slate-700)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            <span style={{ whiteSpace: 'nowrap', color: 'var(--slate-500)' }}>
              <strong style={{ color: 'var(--slate-900)' }}>{money ? gel(r.value) : r.value}</strong>
              {money && <> · {Math.round((r.value / sum) * 100)}%</>}{unit && <> · {r.count} {unit}</>}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 99, background: 'var(--slate-100)', overflow: 'hidden' }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', borderRadius: 99, background: tone === 'red' ? 'var(--red-400, #f87171)' : 'var(--teal-500)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A plain bar chart in SVG — one bar per day/week/month; hover or tap a bar for its numbers. */
function Chart({ rows, metric, by }: { rows: { date: string; collected: number; refunded: number; orders: number }[]; metric: 'collected' | 'orders' | 'refunded'; by: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return null;
  const W = 720, H = 220, PAD = 28;
  const max = Math.max(...rows.map((r) => r[metric]), 1);
  const bw = (W - PAD) / rows.length;
  const fmt = (n: number) => (metric === 'orders' ? String(n) : gel(n));
  const label = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', by === 'month' ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const every = Math.ceil(rows.length / 8);
  const total = rows.reduce((n, r) => n + r[metric], 0);
  const h = hover !== null ? rows[hover] : null;
  return (
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--slate-500)', marginBottom: 6, minHeight: 18 }}>
        {h ? <><strong style={{ color: 'var(--slate-900)' }}>{label(h.date)}{by === 'week' ? ' (week)' : ''}</strong> · {gel(h.collected)} in · {h.orders} orders{h.refunded ? ` · ${gel(h.refunded)} refunded` : ''}</>
          : <>Total {fmt(total)} · highest {fmt(max)}</>}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`${metric} over time`} onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={PAD} x2={W} y1={H - g * (H - 10)} y2={H - g * (H - 10)} stroke="var(--slate-100)" />
            <text x={0} y={H - g * (H - 10) + 4} fontSize="10" fill="var(--slate-400)">{metric === 'orders' ? Math.round(max * g) : Math.round(max * g) >= 1000 ? `${Math.round(max * g / 100) / 10}k` : Math.round(max * g)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const v = r[metric], bh = (v / max) * (H - 10);
          return (
            <g key={r.date} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
              <rect x={PAD + i * bw} y={0} width={bw} height={H} fill="transparent" />
              <rect x={PAD + i * bw + bw * 0.15} y={H - bh} width={Math.max(1, bw * 0.7)} height={bh} rx={Math.min(4, bw * 0.3)}
                fill={metric === 'refunded' ? '#f87171' : hover === i ? 'var(--teal-700)' : 'var(--teal-500)'} />
              {i % every === 0 && <text x={PAD + i * bw + bw / 2} y={H + 16} fontSize="10" textAnchor="middle" fill="var(--slate-400)">{label(r.date)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}


const REPORTS = [
  { key: 'orders', label: 'Orders', desc: 'All orders with status, customer, and totals.', hasDateRange: true, emoji: '📦', bg: 'var(--violet-50)' },
  { key: 'customers', label: 'Customers', desc: 'All registered customers with order count.', hasDateRange: false, emoji: '👥', bg: 'var(--blue-50)' },
  { key: 'subscriptions', label: 'Subscriptions', desc: 'All subscriptions with plan and renewal dates.', hasDateRange: false, emoji: '🔄', bg: 'var(--green-50)' },
  { key: 'revenue', label: 'Revenue', desc: 'Every payment that took money, with what was refunded and kept.', hasDateRange: true, emoji: '💰', bg: 'var(--teal-50)' },
];

/** The raw spreadsheets. */
function Exports() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloaded, setDownloaded] = useState<string[]>([]);

  async function download(key: string, hasDateRange: boolean) {
    setDownloading(key);
    try {
      const params = new URLSearchParams();
      if (hasDateRange && from) params.set('from', from);
      if (hasDateRange && to) params.set('to', to);
      const res = await fetch(`${API}/reports/${key}?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.message || `Download failed (error ${res.status}).`);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `${key}-report.csv`; a.click();
      URL.revokeObjectURL(url);
      setDownloaded((d) => [...d, key]);
      setTimeout(() => setDownloaded((d) => d.filter((x) => x !== key)), 3000);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ background: 'var(--white)', borderRadius: 18, border: '1px solid var(--slate-200b)', padding: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13, color: 'var(--slate-700)' }}>Dates</strong>
        <DateInput aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ color: 'var(--slate-400)' }}>→</span>
        <DateInput aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && <button onClick={() => { setFrom(''); setTo(''); }} style={{ fontSize: 12.5, color: 'var(--teal-700)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>}
        <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>For Orders and Revenue.</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
        {REPORTS.map((r) => {
          const busy = downloading === r.key, done = downloaded.includes(r.key);
          return (
            <div key={r.key} style={{ background: 'var(--white)', borderRadius: 18, border: '1px solid var(--slate-200b)', padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{r.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>{r.label}</h3>
                <p style={{ fontSize: 13, color: 'var(--slate-500)', margin: '0 0 14px' }}>{r.desc}</p>
                {r.hasDateRange && (from || to) && <p style={{ fontSize: 12, color: 'var(--teal-700)', margin: '0 0 10px' }}>{from || 'start'} → {to || 'now'}</p>}
                <button onClick={() => download(r.key, r.hasDateRange)} disabled={busy}
                  style={{ padding: '9px 16px', borderRadius: 11, fontSize: 13, fontWeight: 700, border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, background: done ? 'var(--green-50)' : 'var(--slate-900)', color: done ? 'var(--green-800)' : 'var(--white)' }}>
                  {busy ? 'Exporting…' : done ? '✓ Downloaded' : '⬇ Export CSV'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
