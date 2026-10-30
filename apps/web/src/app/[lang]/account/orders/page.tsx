'use client';
import { Bone, Loading, PanelBones, RowBones } from '@/components/ui/Skeleton';
import Link from '@/components/LangLink';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { FormAlert } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import IconButton from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/icons';
import EmptyState from '@/components/ui/EmptyState';
import Segmented from '@/components/ui/Segmented';
import PlansList from '@/components/account/PlansList';
import OrdersList from '@/components/account/OrdersList';
import Menu from '@/components/ui/Menu';
import type { Api } from '@pupbox/content';

type Sort = 'new' | 'old' | 'high' | 'low';
type View = 'grid' | 'list';

/** Status groups for the filter, per tab. */
const PLAN_GROUPS: Record<string, (s: any) => boolean> = {
  active: s => s.status === 'ACTIVE' && !s.cancelledAt,
  waiting: s => ['PENDING', 'PAYMENT_FAILED'].includes(s.status),
  paused: s => s.status === 'PAUSED',
  finished: s => s.status === 'EXPIRED' || (s.status === 'ACTIVE' && !!s.cancelledAt),
  cancelled: s => s.status === 'CANCELLED',
};
const ORDER_GROUPS: Record<string, (o: Api.CustomerOrder) => boolean> = {
  active: o => ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED'].includes(o.status),
  unpaid: o => o.status === 'PENDING',
  delivered: o => o.status === 'DELIVERED',
  cancelled: o => ['CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status),
};
const planPrice = (s: any) => Number(s.plan?.price) || 0;

type Tab = 'plans' | 'orders';

/**
 * Orders & plans in one place: a summary strip, then two tabs — box plans
 * (subscriptions) and every order. /account/subscriptions lands here.
 */
export default function OrdersAndPlansPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [subs, setSubs] = useState<any[]>([]);
  const [orders, setOrders] = useState<Api.CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab | null>(null);
  const [sort, setSort] = useState<Sort>('new');
  const [group, setGroup] = useState('all');
  const [view, setView] = useState<View>('list');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('tab');
    Promise.all([
      authFetch('/me/subscriptions').then(r => (r.ok ? r.json() : [])),
      authFetch('/orders/my').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([s, o]) => {
        const list = Array.isArray(s) ? s : [];
        setSubs(list);
        setOrders(o.orders || []);
        setTab(asked === 'plans' || asked === 'orders' ? asked : list.length ? 'plans' : 'orders');
      })
      .catch(e => {
        if (e instanceof SessionExpiredError) return router.replace(loginUrl('/account/orders'));
        setError(t('ord.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function pick(k: Tab) {
    setTab(k);
    setGroup('all');
    window.history.replaceState(null, '', `/account/orders?tab=${k}`);
  }

  const groups = tab === 'plans' ? PLAN_GROUPS : ORDER_GROUPS;
  const by = (list: any[], price: (x: any) => number) => [...list].sort((a, b) =>
    sort === 'high' ? price(b) - price(a) : sort === 'low' ? price(a) - price(b)
      : (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * (sort === 'old' ? -1 : 1));
  const shownSubs = by(group === 'all' ? subs : subs.filter(PLAN_GROUPS[group] ?? (() => true)), planPrice);
  const shownOrders = by(group === 'all' ? orders : orders.filter(ORDER_GROUPS[group] ?? (() => true)), o => Number(o.total) || 0);
  const count = (k: string) => (tab === 'plans' ? subs : orders).filter(k === 'all' ? () => true : groups[k]).length;
  const nothing = (
    <div className="rounded-3xl bg-gray-50 py-12 text-center">
      <span className="text-4xl inline-block animate-[wag_1.6s_ease-in-out_infinite]" aria-hidden="true">🐾</span>
      <p className="mt-2 text-[13px] font-semibold text-gray-500">{t('op.nothing')}</p>
    </div>
  );

  const active = subs.filter(s => s.status === 'ACTIVE').length;
  const sent = subs.reduce((n, s) => n + (Number(s.boxesDelivered) || 0), 0);
  const stats: [string, string, number, string][] = [
    ['repeat', t('op.active'), active, 'bg-teal-50 text-teal-700'],
    ['box', t('sub.delivered'), sent, 'bg-lilac-50 text-lilac-600'],
    ['bag', t('op.tabOrders'), orders.length, 'bg-sky-50 text-sky-700'],
  ];

  return (
    <div>
      <Heading kind="section" as="h1" title={t('acc.ordersPlans')} subtitle={t('op.sub')}
        actions={<IconButton icon="plus" label={t('sub.addPlan').replace(/^\+\s*/, '')} tone="primary" onClick={() => router.push('/prices#plans')} />} />

      {loading ? (
        <Loading label={t('global.loading')} className="space-y-4"><Bone className="h-36 w-full rounded-[24px]" /><RowBones count={4} /></Loading>
      ) : error ? (
        <FormAlert message={error} className="my-10" />
      ) : subs.length === 0 && orders.length === 0 ? (
        <div className="rounded-[24px] bg-white ring-1 ring-gray-100">
          <EmptyState art="box" title={t('sub.none')} text={t('sub.noneSub')} action={{ href: '/prices#plans', label: t('sub.viewPlans'), icon: 'box' }} second={{ href: '/shop', label: t('mini.toShop'), icon: 'bag' }} />
        </div>
      ) : (<>
        <dl className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          {stats.map(([icon, label, n, tone], i) => (
            <div key={label} className="bg-white rounded-2xl ring-1 ring-gray-200/60 p-3 sm:p-4 flex items-center gap-3 animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${i * 60}ms` }}>
              <span className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shrink-0 ${tone}`}><Icon name={icon} className="w-5 h-5" /></span>
              <div className="min-w-0">
                <dd className="text-[20px] sm:text-[22px] font-extrabold text-gray-900 leading-none">{n}</dd>
                <dt className="text-[11px] sm:text-[12px] text-gray-500 truncate mt-1">{label}</dt>
              </div>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Segmented className="w-full sm:w-80" label={t('acc.ordersPlans')} value={tab ?? 'plans'} onChange={v => pick(v as any)}
          options={[{ value: 'plans', label: t('op.tabPlans'), icon: 'repeat', count: subs.length }, { value: 'orders', label: t('op.tabOrders'), icon: 'bag', count: orders.length }]} />
        <div className="ml-auto flex items-center gap-1">
          <Menu icon="filter" label={t('op.filter')} title={t('op.filter')} active={group !== 'all'} tone="mint"
            onReset={() => setGroup('all')} resetDisabled={group === 'all'} resetLabel={t('op.all')}
            items={['all', ...Object.keys(groups)].map(k => ({ label: `${t(`op.g.${k}`)} · ${count(k)}`, checked: group === k, onClick: () => setGroup(k) }))} />
          <Menu icon="sort" label={t('op.sort')} title={t('op.sort')} active={sort !== 'new'} tone="mint"
            onReset={() => setSort('new')} resetDisabled={sort === 'new'} resetLabel={t('op.s.new')}
            items={(['new', 'old', 'high', 'low'] as Sort[]).map(k => ({ icon: k === 'new' || k === 'old' ? 'calendar' : 'coin', label: t(`op.s.${k}`), checked: sort === k, onClick: () => setSort(k) }))} />
          <div className="hidden sm:inline-flex p-0.5 rounded-full bg-gray-100 ml-1">
            {(['list', 'grid'] as View[]).map(v => (
              <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} aria-label={t(`op.v.${v}`)} title={t(`op.v.${v}`)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${view === v ? 'bg-white text-teal-700' : 'text-gray-400 hover:text-gray-700'}`}>
                <Icon name={v} className="w-4 h-4" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>
        </div>

        {tab === 'plans' && (subs.length
          ? (shownSubs.length ? <PlansList subs={shownSubs} setSubs={setSubs} toast={showToast} view={view} /> : nothing)
          : <EmptyState compact art="box" title={t('sub.none')} text={t('sub.noneSub')} action={{ href: '/prices#plans', label: t('sub.viewPlans'), icon: 'box' }} />)}

        {tab === 'orders' && (orders.length
          ? (shownOrders.length ? <OrdersList orders={shownOrders} view={view} onManagePlan={id => { pick('plans'); window.history.replaceState(null, '', `/account/orders?tab=plans&cancel=${id}`); setTimeout(() => document.getElementById(`sub-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }} /> : nothing)
          : <EmptyState compact art="bone" tint="bg-pastel-sun" title={t('ord.none')} action={{ href: '/shop', label: t('mini.toShop'), icon: 'bag' }} />)}
      </>)}

      {toast && (
        <div role="status" className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full text-white text-sm font-semibold z-50 animate-[fadeUp_0.25s_ease-out] ${toast.ok ? 'bg-teal-700' : 'bg-red-600'}`}>
          <Icon name={toast.ok ? 'check' : 'alert'} className="w-4 h-4" strokeWidth={2.4} />{toast.msg}
        </div>
      )}
    </div>
  );
}
