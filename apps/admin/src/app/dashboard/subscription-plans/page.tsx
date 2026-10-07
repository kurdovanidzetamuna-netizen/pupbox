'use client';
import { useState, useEffect } from 'react';
import { ActionButton, SortBar, ViewToggle, Toolbar, StatCard, StatCards, PlanHighlightCard, RowActions, Pagination, type ViewMode } from '@/components/Toolbar';
import QuickAddBoxItemModal from '@/components/QuickAddBoxItemModal';
import Link from 'next/link';
import { API, EMPTY_FORM, DEFAULT_BADGES as PAGE_DEFAULT_BADGES } from './_lib/constants';
import PlanBuilder from './_components/plan-builder/PlanBuilder';

// ── Main page ─────────────────────────────────────────────────────────────────

function decodeRole(): string {
  try {
    const t = localStorage.getItem('admin_token');
    if (!t) return '';
    const payload = JSON.parse(atob(t.split('.')[1]));
    return (payload.role || '').toLowerCase();
  } catch { return ''; }
}


export default function AdminSubscriptionPlansPage() {
  const [showBoxItemModal, setShowBoxItemModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderPlan, setBuilderPlan] = useState<any>(null);
  const [sort, setSort] = useState('date_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [planOrderCounts, setPlanOrderCounts] = useState<Record<string, number>>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [badges, setBadges] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem('pupbox_badges') || '[]'); return [...new Set([...PAGE_DEFAULT_BADGES, ...saved])]; }
    catch { return PAGE_DEFAULT_BADGES; }
  });
  const [showBadgeManager, setShowBadgeManager] = useState(false);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [badgeManagerInput, setBadgeManagerInput] = useState('');

  const token = () => localStorage.getItem('admin_token');

  async function load() {
    setLoading(true);
    setIsSuperAdmin(['super admin', 'superadmin', 'super_admin'].includes(decodeRole()));
    try {
      const res = await fetch(`${API}/admin/subscription-plans`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        // fetch order counts per plan
        const counts: Record<string, number> = {};
        await Promise.all(data.map(async (p: any) => {
          const r = await fetch(`${API}/orders/admin?planId=${p.id}&limit=1`, { headers: { Authorization: `Bearer ${token()}` } });
          if (r.ok) { const d = await r.json(); counts[p.id] = d.total || 0; }
        }));
        setPlanOrderCounts(counts);

      }
    } catch { } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setViewPlan(null); setShowBadgeManager(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function toggleActive(p: any) {
    await fetch(`${API}/admin/subscription-plans/${p.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, isActive: !p.isActive }) });
    load();
  }

  async function deletePlan(p: any) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await fetch(`${API}/admin/subscription-plans/${p.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    load();
  }

  const sortedPlans = [...plans].sort((a, b) => {
    if (sort === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === 'price_asc') return Number(a.price) - Number(b.price);
    if (sort === 'price_desc') return Number(b.price) - Number(a.price);
    if (sort === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sort === 'name_desc') return (b.name || '').localeCompare(a.name || '');
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalPages = Math.ceil(sortedPlans.length / pageSize);
  const pagedPlans = sortedPlans.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 4px' }}>Subscription Plans</h1>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: 0 }}>Click "Configure" on any plan to set box contents, pricing, and discounts.</p>
      </div>

      <StatCards>
        <StatCard value={plans.length} label="total plans" theme="slate" />
        <StatCard value={plans.filter(p => p.isActive).length} label="active" theme="green" />
        <StatCard value={plans.filter(p => !p.isActive).length} label="disabled" theme="red" />
        <StatCard value={Object.values(planOrderCounts).filter(c => c > 0).length} label="plans in use" theme="blue" />
        {(() => {
          const popular = plans.find(p => p.badge === 'Most Popular');
          const bestValue = plans.find(p => p.badge === 'Best Value');
          return (<>
            <PlanHighlightCard
              badge="popular"
              planName={popular?.name}
              sub={popular ? `${planOrderCounts[popular.id] ?? 0} orders · ₾${(Number(popular.price) / Number(popular.durationValue)).toFixed(2)}/mo` : undefined}
              empty="No orders yet"
            />
            <PlanHighlightCard
              badge="best_value"
              planName={bestValue?.name}
              sub={bestValue ? `${planOrderCounts[bestValue.id] ?? 0} orders · ₾${(Number(bestValue.price) / Number(bestValue.durationValue)).toFixed(2)}/mo` : undefined}
              empty="No multi-month plans"
            />
          </>);
        })()}
      </StatCards>
      <Toolbar style={{ marginBottom: 20 }}>
        <ActionButton onClick={() => setBuilderPlan({ ...EMPTY_FORM })}>+ New Plan</ActionButton>
        <ActionButton variant="secondary" onClick={() => setShowBoxItemModal(true)}>+ New Box Item</ActionButton>
        <Link href="/dashboard/box-items" style={{ background: 'var(--white)', color: 'var(--slate-700)', border: '1.5px solid var(--slate-200)', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'background 0.15s, border-color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--slate-50)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--slate-300)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--white)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--slate-200)'; }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Box Items
        </Link>
        <button onClick={() => setShowBadgeManager(true)}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-200)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1.5px solid var(--slate-300)', background: 'var(--slate-100)', color: 'var(--slate-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s, transform 0.1s' }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Badges
        </button>
        <SortBar
          sort={sort}
          onSort={v => {
            if (!v) setSort(sort.startsWith('date') ? (sort === 'date_desc' ? 'date_asc' : 'date_desc') : 'date_desc');
            else setSort(v);
            setPage(1);
          }}
          fields={[
            { field: 'date',  label: 'Date',  icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
            { field: 'name',  label: 'Name',  icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="4 6 8 2 12 6"/><line x1="8" y1="2" x2="8" y2="22"/><path d="M16 6h4M16 12h3M16 18h2"/></svg> },
            { field: 'price', label: 'Price', icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
          ]}
        />
        <div style={{ marginLeft: 'auto' }}>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </Toolbar>

      {/* Badge manager */}
      {showBadgeManager && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowBadgeManager(false); }}>
          <div style={{ background: 'var(--white)', borderRadius: 18, width: 480, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" fill="none" stroke="var(--teal-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Manage Badges
              </h2>
              <button onClick={() => setShowBadgeManager(false)}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-600)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--slate-400)'; }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.88)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '5px 7px', borderRadius: 8, transition: 'background 0.15s, color 0.15s, transform 0.1s' }}>×</button>
            </div>

            {/* Badge list — scrollable */}
            <div style={{ border: '1.5px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {badges.map((b, i) => {
                  const isDefault = PAGE_DEFAULT_BADGES.includes(b);
                  return (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < badges.length - 1 ? '1px solid var(--slate-100)' : 'none', background: 'var(--white)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal-600)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)' }}>{b}</span>
                        {isDefault && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', background: 'var(--slate-100)', borderRadius: 4, padding: '1px 6px' }}>built-in</span>}
                      </div>
                      {!isDefault && (
                        <button
                          onClick={() => {
                            const updated = badges.filter(x => x !== b);
                            setBadges(updated);
                            try { localStorage.setItem('pupbox_badges', JSON.stringify(updated.filter(x => !PAGE_DEFAULT_BADGES.includes(x)))); } catch {}
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-100)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-50)'; }}
                          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)'; }}
                          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                          style={{ background: 'var(--red-50)', border: 'none', color: 'var(--red-600)', cursor: 'pointer', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', transition: 'background 0.15s, transform 0.1s' }}
                          title="Remove badge"
                        >Remove</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add new badge */}
            <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-700b)', margin: '0 0 10px' }}>Add new badge</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={badgeManagerInput}
                  onChange={e => setBadgeManagerInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setShowBadgeManager(false); return; }
                    if (e.key === 'Enter' && badgeManagerInput.trim()) {
                      const label = badgeManagerInput.trim();
                      const updated = [...new Set([...badges, label])];
                      setBadges(updated);
                      try { localStorage.setItem('pupbox_badges', JSON.stringify(updated.filter(x => !PAGE_DEFAULT_BADGES.includes(x)))); } catch {}
                      setBadgeManagerInput('');
                    }
                  }}
                  placeholder="Badge label, e.g. Flash Sale"
                  style={{ padding: '7px 12px', fontSize: 13, border: '1.5px solid var(--slate-200)', borderRadius: 9, outline: 'none', background: 'var(--white)', flex: 1 }}
                />
                <button
                  onClick={() => {
                    const label = badgeManagerInput.trim();
                    if (!label) return;
                    const updated = [...new Set([...badges, label])];
                    setBadges(updated);
                    try { localStorage.setItem('pupbox_badges', JSON.stringify(updated.filter(x => !PAGE_DEFAULT_BADGES.includes(x)))); } catch {}
                    setBadgeManagerInput('');
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s, transform 0.1s' }}
                >+ Add</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <>
        {viewMode === 'list' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 18px', marginBottom: 2 }}>
            <div style={{ flex: '0 0 180px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Plan</div>
            <div style={{ flex: '0 0 90px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Price (₾)</div>
            <div style={{ flex: '0 0 90px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Per Month (₾)</div>
            <div style={{ flex: '0 0 100px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Duration</div>
            <div style={{ flex: '0 0 80px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Discount</div>
            <div style={{ flex: '0 0 80px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Boxes</div>
            <div style={{ flex: '0 0 70px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Orders</div>
            <div style={{ flex: '0 0 120px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Margin (₾)</div>
            <div style={{ flex: '0 0 55px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Status</div>
            <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Actions</div>
          </div>
        )}
        <div style={viewMode === 'list' ? { display: 'flex', flexDirection: 'column', gap: 8 } : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {pagedPlans.map(p => {
            const cfg = p.translations?.config;
            const itemCount = cfg?.planItems?.length || 0;
            const productCost = cfg?.planItems?.reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0;
            const opCost = cfg?.operationalCost || 0;
            const delCost = cfg?.deliveryFree ? 0 : (cfg?.deliveryCost || 0);
            const margin = Number(p.price) - productCost - opCost - delCost;
            const hasConfig = itemCount > 0;
            const canDelete = isSuperAdmin && (planOrderCounts[p.id] ?? 1) === 0;
            const isDisabled = !p.isActive;

            if (viewMode === 'list') return (
              <div key={p.id} style={{ background: isDisabled ? 'var(--slate-50)' : 'var(--white)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, opacity: isDisabled ? 0.6 : 1 }}>
                <div style={{ flex: '0 0 180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)' }}>{p.name}</span>
                    {p.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--teal-600)', color: 'var(--white)' }}>{p.badge}</span>}
                  </div>
                </div>
                <div style={{ flex: '0 0 90px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)' }}>{Number(p.price).toFixed(0)}</span>
                </div>
                <div style={{ flex: '0 0 90px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{(Number(p.price) / (p.durationValue || 1)).toFixed(0)}</span>
                </div>
                <div style={{ flex: '0 0 100px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{p.durationValue} {p.durationUnit?.toLowerCase()}</span>
                </div>
                <div style={{ flex: '0 0 80px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : (p.discountPercent ? 'var(--teal-600)' : 'var(--slate-400)') }}>{p.discountPercent ? `-${p.discountPercent}%` : '—'}</span>
                </div>
                <div style={{ flex: '0 0 80px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{p.boxCount}</span>
                </div>
                <div style={{ flex: '0 0 70px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-700b)' }}>{planOrderCounts[p.id] || 0}</span>
                </div>
                <div style={{ flex: '0 0 120px', fontSize: 11 }}>
                  {hasConfig ? <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)', fontWeight: 700 }}>{margin >= 0 ? '+' : ''}{margin.toFixed(2)}</span> : <span style={{ color: 'var(--amber-500)' }}>⚠️ Not configured</span>}
                </div>
                <span style={{ flex: '0 0 55px', fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: isDisabled ? 'var(--slate-100)' : 'var(--green-50)', color: isDisabled ? 'var(--slate-400)' : 'var(--green-800)', textAlign: 'center' as const }}>{isDisabled ? 'Off' : 'Live'}</span>
                <RowActions
                  onView={() => setViewPlan(p)}
                  onConfigure={() => setBuilderPlan(p)}
                  onToggle={() => toggleActive(p)}
                  onDelete={() => deletePlan(p)}
                  isDisabled={isDisabled}
                  canDelete={canDelete}
                  toggleLabel={isDisabled ? 'Enable' : 'Disable'}
                />
              </div>
            );

            return (
              <div key={p.id}
                onMouseEnter={e => { if (!isDisabled) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
                style={{ background: isDisabled ? 'var(--slate-50)' : 'var(--white)', borderRadius: 16, border: p.badge ? '2px solid var(--teal-600)' : isDisabled ? '1px solid var(--slate-200)' : '1px solid var(--slate-200b)', padding: 22, position: 'relative', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', opacity: isDisabled ? 0.65 : 1, transition: 'box-shadow 0.18s, transform 0.18s' }}>
                {p.badge && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--teal-600)', color: 'var(--white)', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap' as const }}>{p.badge}</span>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)', margin: 0 }}>{p.name}</h3>
                    <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '3px 0 0' }}>{p.durationValue} {p.durationUnit.toLowerCase()} · {p.boxCount} box{p.boxCount > 1 ? 'es' : ''}</p>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: isDisabled ? 'var(--slate-100)' : 'var(--green-50)', color: isDisabled ? 'var(--slate-400)' : 'var(--green-800)' }}>{isDisabled ? 'Off' : 'Live'}</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: isDisabled ? 'var(--slate-400)' : 'var(--slate-900)', margin: '0 0 2px' }}>₾{Number(p.price).toFixed(0)}</p>
                {p.discountPercent && <p style={{ fontSize: 12, color: 'var(--teal-600)', fontWeight: 600, margin: '0 0 12px' }}>Save {p.discountPercent}%</p>}
                {hasConfig ? (
                  <div style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 3 }}><span>📦 {itemCount} products</span><span>₾{productCost.toFixed(2)}</span></div>
                    {opCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 3 }}><span>⚙️ Operational</span><span>₾{opCost.toFixed(2)}</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-500)', marginBottom: 6 }}><span>🚚 Delivery</span><span>{cfg?.deliveryFree ? 'Free' : `₾${delCost.toFixed(2)}`}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 5, borderTop: '1px solid var(--slate-200b)', fontWeight: 700 }}>
                      <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)' }}>{margin >= 0 ? '✅ Margin' : '❌ Loss'}</span>
                      <span style={{ color: margin >= 0 ? 'var(--green-700)' : 'var(--red-600)' }}>{margin >= 0 ? '+' : ''}₾{margin.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: 'var(--amber-800)' }}>⚠️ Not configured — click Configure to add box items and costs</div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setViewPlan(p)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.08)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.08)'; }}
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13,148,136,0.08)', color: 'var(--teal-600)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', flexShrink: 0 }}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>
                  </button>
                  <button onClick={() => setBuilderPlan(p)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', cursor: 'pointer', fontWeight: 700, transition: 'background 0.15s, transform 0.1s' }}>Configure</button>
                  <button onClick={() => toggleActive(p)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDisabled ? 'var(--green-100)' : 'var(--slate-200)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isDisabled ? 'var(--green-50)' : 'var(--slate-100)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: isDisabled ? 'var(--green-50)' : 'var(--slate-100)', color: isDisabled ? 'var(--green-800)' : 'var(--slate-500)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s, transform 0.1s' }}>{isDisabled ? 'Enable' : 'Disable'}</button>
                  {canDelete && <button onClick={() => deletePlan(p)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-100)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-50)'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ fontSize: 11, padding: '6px 10px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s, transform 0.1s' }}>Delete</button>}
                </div>
              </div>
            );
          })}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={sortedPlans.length}
          onPageChange={setPage}
          onPageSizeChange={n => { setPageSize(n); setPage(1); }}
          pageSizeOptions={[5, 10, 15, 20, 50]}
        />
        </>
      )}

      {/* Plan builder drawer */}
      {builderPlan && (
        <PlanBuilder
          plan={builderPlan}
          onClose={() => setBuilderPlan(null)}
          onSaved={() => { load(); }}
          badges={badges}
          setBadges={setBadges}
        />
      )}

      {/* Plan view modal */}
      {viewPlan && (() => {
        const vp = viewPlan;
        const cfg = vp.translations?.config;
        const isDisabled = !vp.isActive;
        const orderCount = planOrderCounts[vp.id] || 0;
        const itemCount = cfg?.planItems?.length || 0;
        const hasConfig = itemCount > 0;
        const productCost = cfg?.planItems?.reduce((s: number, i: any) => s + i.price * i.qty, 0) || 0;
        const opCost = cfg?.operationalCost || 0;
        const delCost = cfg?.deliveryFree ? 0 : (cfg?.deliveryCost || 0);
        const margin = Number(vp.price) - productCost - opCost - delCost;
        return (
          <div onClick={() => setViewPlan(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
              {/* Sticky header */}
              <div style={{ padding: '28px 36px 20px', borderBottom: '1px solid var(--slate-200)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--slate-900)' }}>{vp.name}</h2>
                      {vp.badge && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' }}>{vp.badge}</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: isDisabled ? 'var(--slate-100)' : 'var(--green-50)', color: isDisabled ? 'var(--slate-400)' : 'var(--green-800)' }}>{isDisabled ? 'Disabled' : 'Live'}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>{vp.durationValue} month{vp.durationValue > 1 ? 's' : ''} · {vp.boxCount} box{vp.boxCount > 1 ? 'es' : ''}</p>
                  </div>
                  <button onClick={() => setViewPlan(null)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.9)'; }}
                    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', flexShrink: 0 }}>×</button>
                </div>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Price', value: `₾${Number(vp.price).toFixed(2)}` },
                    { label: 'Orders', value: String(orderCount) },
                    { label: 'Discount', value: vp.discountPercent ? `-${vp.discountPercent}%` : '—' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--slate-400)', marginBottom: 2 }}>{s.label}</p>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '24px 36px' }}>

              {/* Description */}
              {(vp.description || vp.descriptionKa) && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Description</p>
                  {vp.description && <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--slate-700b)' }}><strong>EN:</strong> {vp.description}</p>}
                  {vp.descriptionKa && <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-700b)' }}><strong>KA:</strong> {vp.descriptionKa}</p>}
                </div>
              )}

              {/* Delivery + Settings row */}
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 13, color: 'var(--slate-700b)', background: 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
                  Delivery: <strong>{cfg?.deliveryFree ? 'Free' : cfg ? `₾${Number(cfg.deliveryCost || 0).toFixed(2)}` : '—'}</strong>
                </span>
                <span style={{ fontSize: 13, color: vp.autoRenewal ? 'var(--green-800)' : 'var(--slate-500)', background: vp.autoRenewal ? 'rgba(240,253,244,0.7)' : 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
                  Auto-Renewal: <strong>{vp.autoRenewal ? 'On' : 'Off'}</strong>
                </span>
                <span style={{ fontSize: 13, color: !isDisabled ? 'var(--green-800)' : 'var(--slate-500)', background: !isDisabled ? 'rgba(240,253,244,0.7)' : 'rgba(241,245,249,0.7)', padding: '4px 12px', borderRadius: 8 }}>
                  Active: <strong>{!isDisabled ? 'Live' : 'Hidden'}</strong>
                </span>
              </div>

              {/* Products list */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Products Included</p>
                {hasConfig ? (
                  <div style={{ border: '1px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 0 }}>
                      {/* Header */}
                      <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>Product</div>
                      <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', textAlign: 'center' as const }}>Qty</div>
                      <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', textAlign: 'right' as const }}>Cost</div>
                      {/* Rows */}
                      {(cfg.planItems || []).map((it: any, ii: number) => (
                        <>
                          <div key={`n${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-700b)', borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>{it.name || it.productName || '—'}</div>
                          <div key={`q${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-500)', textAlign: 'center' as const, borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>×{it.qty || 1}</div>
                          <div key={`p${ii}`} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--slate-700b)', fontWeight: 600, textAlign: 'right' as const, borderBottom: ii < cfg.planItems.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>₾{((it.price || 0) * (it.qty || 1)).toFixed(2)}</div>
                        </>
                      ))}
                    </div>
                    {/* Totals */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0, borderTop: '1px solid var(--slate-200)', background: 'var(--slate-50)' }}>
                      <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--slate-500)' }}>Products subtotal</div>
                      <div style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'var(--slate-700b)', textAlign: 'right' as const }}>₾{productCost.toFixed(2)}</div>
                      {opCost > 0 && <>
                        <div style={{ padding: '4px 14px', fontSize: 12, color: 'var(--slate-500)' }}>Operational cost</div>
                        <div style={{ padding: '4px 14px', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', textAlign: 'right' as const }}>₾{opCost.toFixed(2)}</div>
                      </>}
                      <div style={{ padding: '4px 14px 8px', fontSize: 12, color: 'var(--slate-500)' }}>Delivery</div>
                      <div style={{ padding: '4px 14px 8px', fontSize: 12, fontWeight: 600, color: 'var(--slate-700b)', textAlign: 'right' as const }}>{cfg?.deliveryFree ? 'Free' : `₾${delCost.toFixed(2)}`}</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)', fontStyle: 'italic' }}>No products added yet</p>
                )}
              </div>

              {/* Margin summary */}
              {hasConfig ? (
                <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: margin >= 0 ? 'var(--green-800)' : 'var(--red-600)' }}>{margin >= 0 ? '✅ Margin' : '❌ Loss'}</span>
                  <span style={{ color: margin >= 0 ? 'var(--green-800)' : 'var(--red-600)' }}>{margin >= 0 ? '+' : ''}₾{margin.toFixed(2)}</span>
                </div>
              ) : (
                <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--amber-800)' }}>⚠️ Not configured — no box items or costs set yet</div>
              )}

              </div>{/* end scrollable */}

              {/* Sticky footer */}
              <div style={{ display: 'flex', gap: 10, padding: '16px 36px', borderTop: '1px solid var(--slate-200)', background: 'var(--white)', borderRadius: '0 0 18px 18px', flexShrink: 0 }}>
                <button onClick={() => { setViewPlan(null); setBuilderPlan(vp); }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-700)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--teal-600)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Configure</button>
                <button onClick={() => setViewPlan(null)}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-200)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--slate-100)'; }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700b)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.15s, transform 0.1s' }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
      {showBoxItemModal && <QuickAddBoxItemModal onClose={() => setShowBoxItemModal(false)} />}
    </div>
  );
}
