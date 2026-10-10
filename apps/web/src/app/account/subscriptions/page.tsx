'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { planText } from '@/lib/localize';
import { gel } from '@/lib/format';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:         { bg: '#f0fdf4', color: '#166534' },
  PENDING:        { bg: '#fff7ed', color: '#9a3412' },
  PAUSED:         { bg: '#f1f5f9', color: '#475569' },
  CANCELLED:      { bg: '#fef2f2', color: '#991b1b' },
  EXPIRED:        { bg: '#f1f5f9', color: '#475569' },
  PAYMENT_FAILED: { bg: '#fef2f2', color: '#991b1b' },
};

export default function MySubscriptionsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  // What cancelling would mean right now, fetched before the customer confirms.
  const [cancelPlan, setCancelPlan] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  // Changing where a subscription's boxes go.
  const [addrFor, setAddrFor] = useState<string | null>(null);
  const [addr, setAddr] = useState({ firstName: '', lastName: '', phone: '', city: '', addressLine1: '', addressLine2: '' });
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState('');

  const expired = () => router.replace(loginUrl('/account/subscriptions'));
  const date = (d: string) => new Date(d).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    authFetch('/me/subscriptions')
      .then(r => r.json())
      .then(d => setSubs(Array.isArray(d) ? d : []))
      .catch(e => { if (e instanceof SessionExpiredError) expired(); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function toggleAutoRenewal(sub: any) {
    setToggling(sub.id);
    try {
      const res = await authFetch(`/me/subscriptions/${sub.id}/auto-renewal`, { method: 'PATCH', body: JSON.stringify({ enabled: !sub.autoRenewal }) });
      if (!res.ok) throw new Error();
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, autoRenewal: !s.autoRenewal } : s));
      showToast(!sub.autoRenewal ? t('sub.renewOn') : t('sub.renewOff'));
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      showToast(t('sub.renewFailed'), false);
    } finally { setToggling(null); }
  }

  function openAddress(sub: any) {
    const a = sub.address ?? {};
    setAddr({ firstName: a.firstName ?? '', lastName: a.lastName ?? '', phone: a.phone ?? '', city: a.city ?? '', addressLine1: a.addressLine1 ?? '', addressLine2: a.addressLine2 ?? '' });
    setAddrError('');
    setAddrFor(sub.id);
  }

  async function saveAddress(sub: any) {
    const required = ['firstName', 'lastName', 'phone', 'city', 'addressLine1'] as const;
    if (required.some(k => !addr[k].trim())) { setAddrError(t('addr.e.required')); return; }
    if (!/^\+?[0-9\s()-]{7,20}$/.test(addr.phone.trim())) { setAddrError(t('addr.e.phone')); return; }
    setAddrSaving(true); setAddrError('');
    try {
      const res = await authFetch(`/me/subscriptions/${sub.id}/address`, { method: 'PATCH', body: JSON.stringify({ ...addr, addressLine2: addr.addressLine2 || undefined }) });
      if (!res.ok) throw new Error();
      const r = await res.json();
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, address: { ...addr } } : s));
      setAddrFor(null);
      showToast(r.alreadyPacked ? t('addr.savedPacked') : t('addr.saved'));
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      setAddrError(t('co.e.generic'));
    } finally { setAddrSaving(false); }
  }

  const [paying, setPaying] = useState<string | null>(null);
  async function payRenewal(orderId: string) {
    setPaying(orderId);
    try {
      const res = await authFetch(`/payments/initiate/${orderId}`, { method: 'POST' });
      const data = res.ok ? await res.json() : null;
      if (!data?.checkoutUrl) throw new Error();
      window.location.href = data.checkoutUrl;
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      showToast(t('ty.e.initiate'), false);
      setPaying(null);
    }
  }

  /** One more term, paid now; it starts when the current one ends. */
  async function extend(sub: any) {
    setPaying(sub.id);
    try {
      const res = await authFetch(`/me/subscriptions/${sub.id}/extend`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.message || t('sub.extendFailed'), false); setPaying(null); return; }
      await payRenewal(data.orderId);
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      showToast(t('sub.extendFailed'), false);
      setPaying(null);
    }
  }

  // From "Manage or cancel plan" on an order: open that plan's cancel question.
  useEffect(() => {
    if (loading) return;
    const id = new URLSearchParams(window.location.search).get('cancel');
    if (!id || !subs.some(s => s.id === id)) return;
    document.getElementById(`sub-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    askCancel(id);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function askCancel(id: string) {
    setCancelPlan(null);
    setCancelConfirm(id);
    try {
      const res = await authFetch(`/me/subscriptions/${id}/cancel-preview`);
      if (res.ok) setCancelPlan(await res.json());
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
    }
  }

  function cancelText(p: any) {
    if (!p) return t('sub.cancelLoading');
    const money = gel(p.refund);
    if (p.kind === 'free') return fill(t('sub.cancelFree'), { hours: p.freeHours, money });
    const stopped = p.boxesTotal - p.keptBoxes;
    if (p.refund <= 0) return t(p.thisMonthBoxComing ? 'sub.cancelLastBox' : 'sub.cancelNoMore');
    return fill(t(p.thisMonthBoxComing ? 'sub.cancelKeep' : 'sub.cancelKeepSent'), { n: stopped, money });
  }

  async function cancelSubscription(id: string) {
    try {
      const res = await authFetch(`/me/subscriptions/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason: 'Cancelled by the customer' }) });
      if (!res.ok) throw new Error();
      const p = await res.json();
      const keeps = p.kind === 'keep' && p.thisMonthBoxComing;
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: keeps ? 'ACTIVE' : 'CANCELLED', cancelledAt: new Date().toISOString(), autoRenewal: false, nextRenewalAt: null, boxesTotal: p.kind === 'keep' ? p.keptBoxes : s.boxesTotal, refundPromised: p.refund } : s));
      setCancelConfirm(null);
      showToast(p.refund > 0 ? fill(t('sub.cancelledRefund'), { money: gel(p.refund) }) : t('sub.cancelled'));
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      showToast(t('sub.cancelFailed'), false);
    }
  }

  const months = (n: number) => (n === 1 ? t('sub.month') : fill(t('sub.months'), { n }));
  const boxes = (n: number) => (n === 1 ? t('sub.box') : fill(t('sub.boxes'), { n }));

  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/account" className="text-sm text-gray-500 hover:text-teal-600">{t('acc.back')}</Link>
        <div className="flex items-end justify-between gap-4 mt-2 mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">{t('acc.subscriptions')}</h1>
          {subs.length > 0 && <Link href="/prices" className="shrink-0 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-700">{t('sub.addPlan')}</Link>}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        ) : subs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-4xl mb-3" aria-hidden="true">📦</p>
            <p className="text-gray-700 font-semibold mb-1">{t('sub.none')}</p>
            <p className="text-gray-500 text-sm mb-6">{t('sub.noneSub')}</p>
            <Link href="/prices" className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition text-sm">{t('sub.viewPlans')}</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {subs.map(sub => {
              const st = STATUS_STYLE[sub.status] || STATUS_STYLE.PENDING;
              const isActive = sub.status === 'ACTIVE';
              const canToggle = ['ACTIVE', 'PENDING'].includes(sub.status) && !sub.cancelledAt;
              return (
                <li key={sub.id} id={`sub-${sub.id}`} className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">{planText(sub.plan, 'name', lang)}</h2>
                      {sub.isGift && <p className="text-sm font-semibold text-amber-700">🎁 {sub.giftFor ? fill(t('sub.giftFor'), { name: sub.giftFor }) : t('sub.gift')}</p>}
                      <p className="text-sm text-gray-500">{fill(t('sub.shape'), { months: months(Number(sub.plan?.durationValue) || 1), boxes: boxes(Number(sub.plan?.boxCount) || 1) })}</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{t(`sub.status.${sub.status}`, sub.status)}</span>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm mb-5">
                    <div className="bg-gray-50 rounded-xl p-3"><dt className="text-gray-500 text-xs mb-0.5">{t('sub.delivered')}</dt><dd className="font-bold text-gray-900">{sub.boxesDelivered} / {sub.boxesTotal}</dd></div>
                    {sub.startDate && new Date(sub.startDate) > new Date() && (
                      <div className="bg-amber-50 rounded-xl p-3"><dt className="text-amber-700 text-xs mb-0.5">{t('sub.startsOn')}</dt><dd className="font-bold text-gray-900">{date(sub.startDate)}</dd></div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-3"><dt className="text-gray-500 text-xs mb-0.5">{t(sub.nextRenewalAt ? 'sub.nextRenewal' : 'sub.endsOn')}</dt><dd className="font-bold text-gray-900">{sub.nextRenewalAt ? date(sub.nextRenewalAt) : sub.endDate ? date(sub.endDate) : '—'}</dd></div>
                    {sub.dog && <div className="bg-gray-50 rounded-xl p-3"><dt className="text-gray-500 text-xs mb-0.5">{t('sub.dog')}</dt><dd className="font-bold text-gray-900">{sub.dog.name}</dd></div>}
                    <div className="bg-gray-50 rounded-xl p-3"><dt className="text-gray-500 text-xs mb-0.5">{t('sub.price')}</dt><dd className="font-bold text-gray-900">{gel(sub.plan?.price)}</dd></div>
                  </dl>

                  {sub.orders?.[0] && (
                    <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-teal-200 bg-teal-50 p-4">
                      <p className="text-sm text-teal-900">{fill(t('sub.renewalDue'), { date: sub.orders[0].renewalFor ? date(sub.orders[0].renewalFor) : '', money: gel(sub.orders[0].total) })}</p>
                      <button onClick={() => payRenewal(sub.orders[0].id)} disabled={paying === sub.orders[0].id} className="shrink-0 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
                        {paying === sub.orders[0].id ? t('ty.redirecting') : fill(t('sub.renewalPay'), { money: gel(sub.orders[0].total) })}
                      </button>
                    </div>
                  )}

                  {!['CANCELLED', 'EXPIRED'].includes(sub.status) && (
                    <div className="mb-5 rounded-xl border border-gray-100 p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">{t('addr.title')}</p>
                          {sub.address ? (
                            <p className="text-gray-800">
                              {sub.address.firstName} {sub.address.lastName} · {sub.address.phone}<br />
                              <span className="text-gray-500">{sub.address.city}, {[sub.address.addressLine1, sub.address.addressLine2].filter(Boolean).join(', ')}</span>
                            </p>
                          ) : <p className="text-amber-700">{t('addr.missing')}</p>}
                        </div>
                        {addrFor !== sub.id && <button onClick={() => openAddress(sub)} className="text-sm font-medium text-teal-700 hover:underline shrink-0">{t('addr.change')}</button>}
                      </div>
                      {addrFor === sub.id && (
                        <div className="mt-4 grid sm:grid-cols-2 gap-3">
                          {([['firstName', 'co.f.firstName'], ['lastName', 'co.f.lastName'], ['phone', 'co.f.phone'], ['city', 'co.f.city'], ['addressLine1', 'co.f.address'], ['addressLine2', 'co.f.address2']] as const).map(([k, label]) => (
                            <label key={k} className={k === 'addressLine1' || k === 'addressLine2' ? 'sm:col-span-2' : ''}>
                              <span className="block text-xs font-medium text-gray-600 mb-1">{t(label)}</span>
                              <input value={addr[k]} onChange={e => { setAddr(a => ({ ...a, [k]: e.target.value })); setAddrError(''); }}
                                type={k === 'phone' ? 'tel' : 'text'} autoComplete={k === 'phone' ? 'tel' : k === 'city' ? 'address-level2' : k === 'addressLine1' ? 'address-line1' : k === 'addressLine2' ? 'address-line2' : k === 'firstName' ? 'given-name' : 'family-name'}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                            </label>
                          ))}
                          {addrError && <p className="sm:col-span-2 text-sm text-red-600" role="alert">{addrError}</p>}
                          <div className="sm:col-span-2 flex gap-2">
                            <button onClick={() => saveAddress(sub)} disabled={addrSaving} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">{addrSaving ? t('co.saving') : t('addr.save')}</button>
                            <button onClick={() => setAddrFor(null)} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">{t('dogs.cancel')}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {sub.shipments?.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-gray-500 mb-2">{t('sub.history')}</p>
                      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl text-sm">
                        {sub.shipments.map((b: any) => (
                          <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <span className="text-gray-900">
                              <span className="font-semibold">{fill(t('sub.boxN'), { n: b.boxNumber })}</span>
                              <span className="text-gray-400"> · {new Date(b.year, b.month - 1, 1).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-GB', { month: 'long', year: 'numeric' })}</span>
                            </span>
                            <span className="text-right">
                              <span className={`text-xs font-bold ${b.status === 'SHIPPED' || b.status === 'DELIVERED' ? 'text-teal-700' : 'text-gray-500'}`}>{t(`sub.box.${b.status}`, b.status)}</span>
                              {b.trackingNumber && <span className="block text-xs text-gray-400">{t('sub.tracking')}: <span className="font-mono">{b.trackingNumber}</span></span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {canToggle && (
                    <div className={`flex items-center justify-between gap-4 rounded-xl border p-4 mb-4 transition ${sub.autoRenewal ? 'border-teal-200 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">🔄 {t('sub.autoRenewal')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {sub.autoRenewal
                            ? (sub.nextRenewalAt ? fill(t('sub.renewsOn'), { date: date(sub.nextRenewalAt) }) : t('sub.renewsAuto'))
                            : t('sub.noRenew')}
                        </p>
                      </div>
                      <button onClick={() => toggleAutoRenewal(sub)} disabled={toggling === sub.id} role="switch" aria-checked={!!sub.autoRenewal} aria-label={t('sub.autoRenewal')}
                        className={`relative w-12 h-6 shrink-0 rounded-full transition-colors duration-200 ${sub.autoRenewal ? 'bg-teal-600' : 'bg-gray-300'} ${toggling === sub.id ? 'opacity-50' : ''}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${sub.autoRenewal ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )}

                  {isActive && !sub.cancelledAt && !sub.orders?.[0] && (
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-teal-100 bg-white p-4 mb-4">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">➕ {t('sub.extend')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fill(t('sub.extendSub'), { period: months(Number(sub.plan?.durationValue) || 1), money: gel(sub.plan?.price) })}</p>
                      </div>
                      <button onClick={() => extend(sub)} disabled={paying === sub.id} className="shrink-0 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
                        {paying === sub.id ? t('ty.redirecting') : fill(t('sub.extendGo'), { money: gel(sub.plan?.price) })}
                      </button>
                    </div>
                  )}

                  {isActive && sub.cancelledAt && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{t('sub.cancelledLast')}</p>
                  )}
                  {isActive && !sub.cancelledAt && (
                    cancelConfirm === sub.id ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-red-800 mb-1">{t('sub.cancelQ')}</p>
                        <p className="text-sm text-red-700 mb-1">{cancelText(cancelPlan)}</p>
                        {cancelPlan?.refund > 0 && <p className="text-xs text-red-600 mb-4">{t('sub.refundTiming')}</p>}
                        {!(cancelPlan?.refund > 0) && <div className="mb-4" />}
                        <div className="flex gap-2">
                          <button onClick={() => cancelSubscription(sub.id)} disabled={!cancelPlan} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition">{t('sub.cancelYes')}</button>
                          <button onClick={() => setCancelConfirm(null)} className="flex-1 border border-gray-200 bg-white text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">{t('sub.keep')}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => askCancel(sub.id)} className="text-sm text-red-600 hover:text-red-700 font-medium transition">{t('sub.cancel')}</button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {toast && (
        <div role="status" className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold z-50 ${toast.ok ? 'bg-teal-700' : 'bg-red-600'}`}>
          <span aria-hidden="true">{toast.ok ? '✅' : '⚠️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </main>
  );
}
