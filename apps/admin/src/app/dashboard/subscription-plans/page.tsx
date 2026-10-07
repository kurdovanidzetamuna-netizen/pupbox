'use client';
import { useState, useEffect } from 'react';
import { ActionButton, SortBar, ViewToggle, Toolbar, Pagination, type ViewMode } from '@/components/Toolbar';
import QuickAddBoxItemModal from '@/components/QuickAddBoxItemModal';
import Link from 'next/link';
import { EMPTY_FORM } from './_lib/constants';
import { isSuperAdmin as currentUserIsSuperAdmin } from './_lib/auth';
import { fetchPlans, fetchPlanOrderCount, togglePlanActive, deletePlan as deletePlanRequest } from './_lib/api';
import { useBadges } from './_hooks/useBadges';
import PlanBuilder from './_components/plan-builder/PlanBuilder';
import PlanStats from './_components/PlanStats';
import BadgeManagerModal from './_components/BadgeManagerModal';
import PlanListRow, { PlanListHeader } from './_components/PlanListRow';
import PlanCard from './_components/PlanCard';
import PlanViewModal from './_components/PlanViewModal';

export default function AdminSubscriptionPlansPage() {
  const [showBoxItemModal, setShowBoxItemModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderPlan, setBuilderPlan] = useState<any>(null);
  const [sort, setSort] = useState('date_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [planOrderCounts, setPlanOrderCounts] = useState<Record<string, number>>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { badges, addBadge, removeBadge } = useBadges();
  const [showBadgeManager, setShowBadgeManager] = useState(false);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [badgeManagerInput, setBadgeManagerInput] = useState('');

  async function load() {
    setLoading(true);
    setIsSuperAdmin(currentUserIsSuperAdmin());
    try {
      const res = await fetchPlans();
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        // fetch order counts per plan
        const counts: Record<string, number> = {};
        await Promise.all(data.map(async (p: any) => {
          const n = await fetchPlanOrderCount(p.id);
          if (n !== undefined) counts[p.id] = n;
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
    await togglePlanActive(p);
    load();
  }

  async function deletePlan(p: any) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await deletePlanRequest(p.id);
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

      <PlanStats plans={plans} planOrderCounts={planOrderCounts} />
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
        <BadgeManagerModal
          badges={badges}
          addBadge={addBadge}
          removeBadge={removeBadge}
          input={badgeManagerInput}
          setInput={setBadgeManagerInput}
          onClose={() => setShowBadgeManager(false)}
        />
      )}


      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <>
        {viewMode === 'list' && (
          <PlanListHeader />
        )}
        <div style={viewMode === 'list' ? { display: 'flex', flexDirection: 'column', gap: 8 } : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {pagedPlans.map(p => {
            const canDelete = isSuperAdmin && (planOrderCounts[p.id] ?? 1) === 0;
            const itemProps = {
              p,
              canDelete,
              onView: () => setViewPlan(p),
              onConfigure: () => setBuilderPlan(p),
              onToggle: () => toggleActive(p),
              onDelete: () => deletePlan(p),
            };
            return viewMode === 'list'
              ? <PlanListRow key={p.id} {...itemProps} orderCount={planOrderCounts[p.id]} />
              : <PlanCard key={p.id} {...itemProps} />;
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
          addBadge={addBadge}
        />
      )}

      {/* Plan view modal */}
      {viewPlan && (
        <PlanViewModal
          plan={viewPlan}
          orderCount={planOrderCounts[viewPlan.id] || 0}
          onClose={() => setViewPlan(null)}
          onConfigure={() => { setViewPlan(null); setBuilderPlan(viewPlan); }}
        />
      )}
      {showBoxItemModal && <QuickAddBoxItemModal onClose={() => setShowBoxItemModal(false)} />}
    </div>
  );
}
