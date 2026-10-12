'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { FormAlert } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import IconButton from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/icons';
import PawTrail from '@/components/PawTrail';
import PlansList from '@/components/account/PlansList';
import OrdersList from '@/components/account/OrdersList';

type Tab = 'plans' | 'orders';

/**
 * Orders & plans in one place: a summary strip, then two tabs — box plans
 * (subscriptions) and every order. /account/subscriptions lands here.
 */
export default function OrdersAndPlansPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [subs, setSubs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab | null>(null);
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
    window.history.replaceState(null, '', `/account/orders?tab=${k}`);
  }

  const active = subs.filter(s => s.status === 'ACTIVE').length;
  const sent = subs.reduce((n, s) => n + (Number(s.boxesDelivered) || 0), 0);
  const stats: [string, string, number, string][] = [
    ['repeat', t('op.active'), active, 'bg-teal-50 text-teal-700'],
    ['box', t('sub.delivered'), sent, 'bg-amber-50 text-amber-700'],
    ['bag', t('op.tabOrders'), orders.length, 'bg-lilac-50 text-lilac-600'],
  ];

  return (
    <div>
      <Heading kind="section" as="h1" title={t('acc.ordersPlans')} subtitle={t('op.sub')}
        actions={<IconButton icon="plus" label={t('sub.addPlan').replace(/^\+\s*/, '')} tone="primary" onClick={() => router.push('/prices#plans')} />} />

      {loading ? (
        <div className="flex justify-center py-20"><span className="text-4xl animate-[bob_1s_ease-in-out_infinite]" aria-hidden="true">📦</span></div>
      ) : error ? (
        <FormAlert message={error} className="my-10" />
      ) : subs.length === 0 && orders.length === 0 ? (
        <Link href="/prices" className="group relative block overflow-hidden rounded-[28px] bg-teal-50/70 py-14 text-center">
          <PawTrail />
          <span className="relative inline-block text-6xl animate-[bob_2s_ease-in-out_infinite]" aria-hidden="true">📦</span>
          <span className="relative block mt-3 text-[15px] font-bold text-gray-800">{t('sub.none')}</span>
          <span className="relative block mt-1 text-[13px] text-gray-500">{t('sub.noneSub')}</span>
          <span className="relative mt-4 mx-auto w-11 h-11 rounded-full bg-teal-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform" title={t('sub.viewPlans')}><Icon name="plus" className="w-5 h-5" strokeWidth={2.6} /></span>
        </Link>
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

        <div role="tablist" className="inline-flex gap-1 p-1 rounded-full bg-gray-100 mb-4">
          {([['plans', t('op.tabPlans'), subs.length, 'repeat'], ['orders', t('op.tabOrders'), orders.length, 'bag']] as const).map(([k, label, n, icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => pick(k)}
              className={`h-9 pl-3 pr-3.5 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors ${tab === k ? 'bg-white text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
              <Icon name={icon} className="w-4 h-4" />{label} <span className="text-gray-400 font-semibold">{n}</span>
            </button>
          ))}
        </div>

        {tab === 'plans' && (subs.length
          ? <PlansList subs={subs} setSubs={setSubs} toast={showToast} />
          : <Link href="/prices#plans" className="group flex items-center gap-4 rounded-3xl bg-teal-50/70 p-5 hover:bg-teal-50">
              <span className="text-4xl animate-[bob_2s_ease-in-out_infinite]" aria-hidden="true">📦</span>
              <span className="flex-1"><span className="block font-bold text-gray-900">{t('sub.none')}</span><span className="block text-[13px] text-gray-500">{t('sub.noneSub')}</span></span>
              <span className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform" title={t('sub.viewPlans')}><Icon name="plus" className="w-5 h-5" strokeWidth={2.4} /></span>
            </Link>)}

        {tab === 'orders' && (orders.length
          ? <OrdersList orders={orders} onManagePlan={id => { pick('plans'); window.history.replaceState(null, '', `/account/orders?tab=plans&cancel=${id}`); setTimeout(() => document.getElementById(`sub-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }} />
          : <Link href="/shop" className="group flex items-center gap-4 rounded-3xl bg-gray-50 p-5 hover:bg-teal-50/60">
              <span className="text-4xl" aria-hidden="true">🛍️</span>
              <span className="flex-1 font-bold text-gray-900">{t('ord.none')}</span>
              <span className="w-10 h-10 rounded-full bg-white text-teal-700 flex items-center justify-center" title={t('ord.startShopping')}><Icon name="bag" className="w-5 h-5" /></span>
            </Link>)}
      </>)}

      {toast && (
        <div role="status" className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full text-white text-sm font-semibold z-50 animate-[fadeUp_0.25s_ease-out] ${toast.ok ? 'bg-teal-700' : 'bg-red-600'}`}>
          <Icon name={toast.ok ? 'check' : 'alert'} className="w-4 h-4" strokeWidth={2.4} />{toast.msg}
        </div>
      )}
    </div>
  );
}
