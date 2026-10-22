'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import Dropdown, { type DropdownOption } from '@/components/Dropdown';
import { API, authHeaders, STATUS_LABEL, TYPE_LABELS, TYPE_ICONS, EDITABLE, StatusBadge, TypeBadge, RefundDueBadge, Thumb } from './_lib';
import OrderDrawer from './_components/OrderDrawer';
import { categoryTree, type Cat } from './_components/CategoryPicker';
import { DateInput } from '@/components/DateField';

const gel = (v: number) => (Math.abs(v) >= 10000 ? `₾${(v / 1000).toFixed(1)}k` : `₾${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
const PAGE = 20;
// Work first, then the ends of the road; unpaid ones wait at the end.
const TABS = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED', 'PENDING'];
const SORTS: DropdownOption[] = [
  { value: '', label: 'Newest first' }, { value: 'createdAt_asc', label: 'Oldest first' },
  { value: 'total_desc', label: 'Highest total' }, { value: 'total_asc', label: 'Lowest total' },
];
const day = (d: Date) => d.toISOString().slice(0, 10);
const PERIODS: { value: string; label: string; range: () => [string, string] }[] = [
  { value: 'today', label: 'Today', range: () => [day(new Date()), day(new Date())] },
  { value: '7', label: 'Last 7 days', range: () => [day(new Date(Date.now() - 6 * 864e5)), day(new Date())] },
  { value: '30', label: 'Last 30 days', range: () => [day(new Date(Date.now() - 29 * 864e5)), day(new Date())] },
  { value: 'month', label: 'This month', range: () => { const n = new Date(); return [day(new Date(n.getFullYear(), n.getMonth(), 1)), day(n)]; } },
  { value: 'custom', label: 'Pick dates…', range: () => ['', ''] },
];

const tab = (on: boolean) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  border: `1.5px solid ${on ? 'var(--teal-600)' : 'var(--slate-200)'}`, background: on ? 'var(--teal-600)' : 'var(--white)', color: on ? 'var(--white)' : 'var(--slate-600)', transition: 'all .15s',
});
const count = (on: boolean) => ({ minWidth: 20, padding: '0 6px', height: 18, borderRadius: 99, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: on ? 'rgba(255,255,255,.25)' : 'var(--slate-100)', color: on ? 'var(--white)' : 'var(--slate-500)' });
const label = { fontSize: 11, color: 'var(--slate-400)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em' };

/**
 * Every order in one list. Tabs by status, each with how many orders are in
 * it; then filters that combine — channel, plan, category (several at once,
 * a main category taking its subcategories along), dates, search — shown as
 * chips you can remove one by one, and one Reset for everything. Cards up
 * top show what matches next to the totals for all orders. Tap an order for
 * its page, ✎ to edit one that hasn't shipped. Cards instead of a table on phones.
 */
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [catIds, setCatIds] = useState<string[]>([]);
  const [period, setPeriod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ order: any; edit: boolean } | null>(null);
  const [summary, setSummary] = useState<any>(null);

  // Filters change fast (two ticks in a row): only the newest answer may land.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latest.current;
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE) });
      if (status) q.set('status', status);
      if (types.length) q.set('type', types.join(','));
      if (planIds.length) q.set('planId', planIds.join(','));
      if (catIds.length) q.set('categoryId', catIds.join(','));
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);
      if (search.trim()) q.set('search', search.trim());
      if (sort) { q.set('sortBy', sort.split('_')[0]); q.set('sortDir', sort.split('_')[1]); }
      const data = await (await fetch(`${API}/orders/admin?${q}`, { headers: authHeaders() })).json();
      if (mine !== latest.current) return;
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setSummary(data.summary || null);
    } catch { } finally { if (mine === latest.current) setLoading(false); }
  }, [page, status, types, planIds, catIds, dateFrom, dateTo, search, sort]);

  // Typing in search waits a moment, so each key doesn't fire a request.
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  // Arriving from a customer's page: /dashboard/orders?search=ABC123.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) { setSearch(q); window.history.replaceState(null, '', window.location.pathname); }
  }, []);

  useEffect(() => {
    fetch(`${API}/admin/subscription-plans`, { headers: authHeaders() }).then((r) => r.json())
      .then((d) => setPlans((d.items || d || []).sort((a: any, b: any) => (a.tier?.sortOrder ?? 99) - (b.tier?.sortOrder ?? 99) || a.durationValue - b.durationValue)))
      .catch(() => {});
    fetch(`${API}/admin/categories`, { headers: authHeaders() }).then((r) => r.json()).then((d) => setCategories(categoryTree(Array.isArray(d) ? d : []))).catch(() => {});
  }, []);

  const f = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const totalPages = Math.ceil(total / PAGE);
  const byStatus: Record<string, number> = summary?.byStatus ?? {};
  const allCount = Object.values(byStatus).reduce((a, b) => a + b, 0);

  const typeOpts: DropdownOption[] = ((summary?.byType ?? []) as any[]).map((t) => ({ value: t.type, label: TYPE_LABELS[t.type] ?? t.type, icon: TYPE_ICONS[t.type], hint: String(t.count) }));
  const planOpts: DropdownOption[] = plans.map((p) => ({ value: p.id, label: p.name + (p.isActive ? '' : ' (off)'), group: p.tier ? `${p.tier.emoji ?? ''} ${p.tier.name}`.trim() : 'Other plans' }));
  const catOpts: DropdownOption[] = categories.flatMap((c) => [{ value: c.id, label: c.name, hint: c.children?.length ? `all ${c.children.length + 1}` : undefined }, ...(c.children ?? []).map((k) => ({ value: k.id, label: k.name, indent: true }))]);
  const name = (opts: DropdownOption[], v: string) => opts.find((o) => o.value === v)?.label ?? '…';

  // What's on, as chips you can remove one at a time.
  const chips = useMemo(() => [
    ...(search.trim() ? [{ key: 's', text: `“${search.trim()}”`, off: () => f(setSearch)('') }] : []),
    ...types.map((v) => ({ key: `t${v}`, text: name(typeOpts, v), off: () => f(setTypes)(types.filter((x) => x !== v)) })),
    ...planIds.map((v) => ({ key: `p${v}`, text: name(planOpts, v), off: () => f(setPlanIds)(planIds.filter((x) => x !== v)) })),
    ...catIds.map((v) => ({ key: `c${v}`, text: name(catOpts, v), off: () => f(setCatIds)(catIds.filter((x) => x !== v)) })),
    ...(dateFrom || dateTo ? [{ key: 'd', text: period && period !== 'custom' ? name(PERIODS, period) : `${dateFrom || '…'} – ${dateTo || '…'}`, off: () => { setPeriod(''); setDateFrom(''); setDateTo(''); setPage(1); } }] : []),
  ], [search, types, planIds, catIds, dateFrom, dateTo, period, typeOpts.length, planOpts.length, catOpts.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = chips.length > 0 || !!status || !!sort;
  const reset = () => { setStatus(''); setTypes([]); setPlanIds([]); setCatIds([]); setPeriod(''); setDateFrom(''); setDateTo(''); setSearch(''); setSort(''); setPage(1); };

  function pickPeriod(v: string) {
    setPeriod(v);
    const p = PERIODS.find((x) => x.value === v);
    if (!p || v === 'custom') { if (!v) { setDateFrom(''); setDateTo(''); } setPage(1); return; }
    const [a, b] = p.range(); setDateFrom(a); setDateTo(b); setPage(1);
  }

  const all = summary?.all;
  const cards = summary ? [
    { label: 'Orders', value: summary.totalOrders.toLocaleString(), accent: 'var(--slate-900)', sub: `${gel(summary.totalValue)} value`, of: all && `of ${all.totalOrders.toLocaleString()} all · ${gel(all.totalValue)}` },
    { label: 'Collected', value: gel(summary.paidRevenue), accent: 'var(--emerald-600)', sub: summary.totalValue > 0 ? `${Math.round((summary.paidRevenue / summary.totalValue) * 100)}% of value` : '—', of: all && `of ${gel(all.paidRevenue)} all time` },
    { label: 'In progress', value: summary.paidCount.toLocaleString(), accent: 'var(--blue-600)', sub: `${summary.pendingCount} unpaid`, of: 'paid, not delivered yet' },
    { label: 'Need attention', value: (summary.failedCount + summary.refundedCount).toLocaleString(), accent: summary.failedCount + summary.refundedCount > 0 ? 'var(--red-600)' : 'var(--emerald-600)',
      sub: `${summary.refundDueCount ? `${summary.refundDueCount} refund due · ` : ''}${summary.failedCount} failed`, of: `${summary.refundedCount} cancelled or refunded` },
  ] : [];

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Orders</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0' }}>Boxes and shop orders in one list.</p>
        </div>
        {dirty && (
          <button onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: 'none', background: 'var(--slate-900)', color: 'var(--white)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 16px -8px rgba(15,23,42,.6)' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            Reset filters &amp; sorting
          </button>
        )}
      </div>

      {/* What matches, next to everything */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 12, marginBottom: 18 }}>
          {cards.map((c) => (
            <div key={c.label} style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', padding: '14px 16px' }}>
              <div style={label}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.accent, lineHeight: 1.15, marginTop: 4 }}>{c.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--slate-500)', marginTop: 3 }}>{c.sub}</div>
              {c.of && <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--slate-200)' }}>{c.of}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Status tabs, each with its count; swipes on phones */}
      <div role="tablist" aria-label="Status" style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        <button role="tab" aria-selected={!status} onClick={() => f(setStatus)('')} style={tab(!status)}>All <span style={count(!status)}>{allCount}</span></button>
        {TABS.map((s) => (
          <button key={s} role="tab" aria-selected={status === s} onClick={() => f(setStatus)(s)} style={{ ...tab(status === s), opacity: byStatus[s] || status === s ? 1 : 0.55 }}>
            {STATUS_LABEL[s]} <span style={count(status === s)}>{byStatus[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filters: combine freely; several choices in one = any of them */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', pointerEvents: 'none' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </span>
            <input value={search} onChange={(e) => f(setSearch)(e.target.value)} placeholder="Order #, name, email, phone or product…" aria-label="Search orders"
              style={{ width: '100%', boxSizing: 'border-box', height: 36, padding: '0 32px 0 34px', fontSize: 13, border: '1.5px solid var(--slate-200)', borderRadius: 10, outline: 'none' }} />
            {search && <button onClick={() => f(setSearch)('')} aria-label="Clear search" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', fontSize: 16 }}>×</button>}
          </div>
          <Dropdown multiple aria-label="Category" label="Category" placeholder="Category" value={catIds} onChange={f(setCatIds)} options={catOpts} icon="🏷️" />
          <Dropdown multiple aria-label="Channel" label="Channel" placeholder="Channel" value={types} onChange={f(setTypes)} options={typeOpts} icon="🛒" />
          <Dropdown multiple aria-label="Plan" label="Plan" placeholder="Plan" value={planIds} onChange={f(setPlanIds)} options={planOpts} icon="📦" searchable />
          <Dropdown aria-label="Date" label="Date" placeholder="Any date" value={period} onChange={pickPeriod} options={[{ value: '', label: 'Any date' }, ...PERIODS]} icon="📅" />
          <Dropdown aria-label="Sort" value={sort} onChange={f(setSort)} options={SORTS} icon="↕︎" />
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <DateInput aria-label="From date" value={dateFrom} onChange={(e) => f(setDateFrom)(e.target.value)} />
            <span style={{ color: 'var(--slate-400)' }}>–</span>
            <DateInput aria-label="To date" value={dateTo} onChange={(e) => f(setDateTo)(e.target.value)} />
          </div>
        )}
        {chips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--slate-100)' }}>
            {chips.map((c) => (
              <button key={c.key} onClick={c.off} aria-label={`Remove filter ${c.text}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 10px', borderRadius: 99, border: 'none', background: 'var(--teal-50)', color: 'var(--teal-800)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {c.text}<span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 99, background: 'var(--teal-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The list: a table on computers, cards on phones */}
      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden' }}>
        {loading && !orders.length ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '70px 16px', color: 'var(--slate-400)', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            <p style={{ fontSize: 13, margin: 0 }}>No orders match.</p>
            {dirty && <button onClick={reset} style={{ ...tab(false), marginTop: 12 }}>Reset filters</button>}
          </div>
        ) : (
          <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity .15s' }}>
            <table className="ord-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Order', 'Customer', 'What’s inside', 'Total', 'Payment', 'Status', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} onClick={() => setSelected({ order: o, edit: false })} style={{ borderBottom: '1px solid var(--slate-100)', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--slate-50)')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--slate-900)', background: 'var(--slate-100)', padding: '3px 7px', borderRadius: 6 }}>#{(o.orderNumber || o.id).slice(-8).toUpperCase()}</span>
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, color: 'var(--slate-400)', whiteSpace: 'nowrap' }}><TypeBadge type={o.type} />{when(o.createdAt)}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>{o.user?.firstName} {o.user?.lastName}</p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{o.address?.city || o.user?.email}</p>
                    </td>
                    <td style={{ padding: '12px 14px' }}><Inside items={o.items} /></td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--slate-900)', whiteSpace: 'nowrap' }}>₾{Number(o.total).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px' }}>{o.payments?.[0] ? <StatusBadge status={o.payments[0].status} payment /> : <span style={{ color: 'var(--slate-300)' }}>—</span>}</td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={o.status} />{o.refundDue && <RefundDueBadge />}</td>
                    <td style={{ padding: '12px 14px' }}><RowActions o={o} onEdit={() => setSelected({ order: o, edit: true })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="ord-cards" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {orders.map((o) => (
                <li key={o.id} onClick={() => setSelected({ order: o, edit: false })} style={{ padding: 14, borderBottom: '1px solid var(--slate-100)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, background: 'var(--slate-100)', padding: '3px 7px', borderRadius: 6 }}>#{(o.orderNumber || o.id).slice(-8).toUpperCase()}</span>
                    <StatusBadge status={o.status} />{o.refundDue && <RefundDueBadge />}
                    <strong style={{ marginLeft: 'auto', fontSize: 15 }}>₾{Number(o.total).toFixed(2)}</strong>
                  </div>
                  <p style={{ margin: '8px 0 2px', fontWeight: 600, fontSize: 13.5, color: 'var(--slate-800)' }}>{o.user?.firstName} {o.user?.lastName} <span style={{ fontWeight: 400, color: 'var(--slate-400)', fontSize: 12 }}>· {when(o.createdAt)}</span></p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
                    <Inside items={o.items} />
                    <RowActions o={o} onEdit={() => setSelected({ order: o, edit: true })} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>Page {page} of {totalPages} · {total} orders</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ ...tab(false), opacity: page === 1 ? 0.4 : 1 }}>←</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return <button key={p} onClick={() => setPage(p)} style={{ ...tab(page === p), minWidth: 36, justifyContent: 'center' }}>{p}</button>;
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...tab(false), opacity: page === totalPages ? 0.4 : 1 }}>→</button>
          </div>
        </div>
      )}

      {selected && (
        <OrderDrawer key={selected.order.id} order={selected.order} startEditing={selected.edit} categories={categories}
          onClose={() => setSelected(null)} onChanged={load} />
      )}
    </div>
  );
}

const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Up to three little pictures and the first item's name, "+2 more". */
function Inside({ items = [] }: { items?: any[] }) {
  const n = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>
        {items.slice(0, 3).map((i, k) => <span key={i.id} style={{ marginLeft: k ? -10 : 0, borderRadius: 10, boxShadow: '0 0 0 2px var(--white)' }}><Thumb item={i} size={30} /></span>)}
      </span>
      <span style={{ fontSize: 12, color: 'var(--slate-600)', minWidth: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {items[0]?.name}{items.length > 1 ? <span style={{ color: 'var(--slate-400)' }}> +{items.length - 1} more</span> : ''}
        {n > items.length && <span style={{ color: 'var(--slate-400)' }}> · {n} pcs</span>}
      </span>
    </span>
  );
}

function RowActions({ o, onEdit }: { o: any; onEdit: () => void }) {
  const small = { fontSize: 12, fontWeight: 700, borderRadius: 9, padding: '6px 10px', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const };
  return (
    // Invoice always first, Edit always second (an empty slot when it can't be edited) — nothing jumps around.
    <span style={{ display: 'inline-grid', gridTemplateColumns: '38px 70px', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
      <Link href={`/dashboard/orders/${o.id}/invoice`} target="_blank" title="Invoice" aria-label="Invoice" style={{ ...small, color: 'var(--teal-700)', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', textAlign: 'center' }}>🧾</Link>
      {EDITABLE.includes(o.status)
        ? <button onClick={onEdit} title="Edit order" aria-label={`Edit order ${(o.orderNumber || o.id).slice(-8)}`} style={{ ...small, border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-700)' }}>✎ Edit</button>
        : <span aria-hidden="true" />}
    </span>
  );
}
