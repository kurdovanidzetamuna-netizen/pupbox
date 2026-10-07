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
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

  async function cancelSubscription(id: string) {
    try {
      const res = await authFetch(`/me/subscriptions/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason: 'Cancelled by user' }) });
      if (!res.ok) throw new Error();
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: 'CANCELLED', autoRenewal: false } : s));
      setCancelConfirm(null);
      showToast(t('sub.cancelled'));
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      showToast(t('sub.cancelFailed'), false);
    }
  }

  const months = (n: number) => (n === 1 ? t('sub.month') : fill(t('sub.months'), { n }));
  const boxes = (n: number) => (n === 1 ? t('sub.box') : fill(t('sub.boxes'), { n }));

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/account" className="text-sm text-gray-500 hover:text-teal-600">{t('acc.back')}</Link>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-2 mb-8">{t('acc.subscriptions')}</h1>

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
              const canToggle = ['ACTIVE', 'PENDING'].includes(sub.status);
              return (
                <li key={sub.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">{planText(sub.plan, 'name', lang)}</h2>
                      <p className="text-sm text-gray-500">{fill(t('sub.shape'), { months: months(Number(sub.plan?.durationValue) || 1), boxes: boxes(Number(sub.plan?.boxCount) || 1) })}</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{t(`sub.status.${sub.status}`, sub.status)}</span>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm mb-5">
                    <div className="bg-gray-50 rounded-xl p-3"><dt className="text-gray-500 text-xs mb-0.5">{t('sub.delivered')}</dt><dd className="font-bold text-gray-900">{sub.boxesDelivered} / {sub.boxesTotal}</dd></div>
                    <div className="bg-gray-50 rounded-xl p-3"><dt className="text-gray-500 text-xs mb-0.5">{t('sub.nextRenewal')}</dt><dd className="font-bold text-gray-900">{sub.nextRenewalAt ? date(sub.nextRenewalAt) : '—'}</dd></div>
                    {sub.dog && <div className="bg-gray-50 rounded-xl p-3"><dt className="text-gray-500 text-xs mb-0.5">{t('sub.dog')}</dt><dd className="font-bold text-gray-900">{sub.dog.name}</dd></div>}
                    <div className="bg-gray-50 rounded-xl p-3"><dt className="text-gray-500 text-xs mb-0.5">{t('sub.price')}</dt><dd className="font-bold text-gray-900">{gel(sub.plan?.price)}</dd></div>
                  </dl>

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

                  {isActive && (
                    cancelConfirm === sub.id ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-red-800 mb-1">{t('sub.cancelQ')}</p>
                        <p className="text-xs text-red-700 mb-4">{t('sub.cancelNote')}</p>
                        <div className="flex gap-2">
                          <button onClick={() => cancelSubscription(sub.id)} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition">{t('sub.cancelYes')}</button>
                          <button onClick={() => setCancelConfirm(null)} className="flex-1 border border-gray-200 bg-white text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">{t('sub.keep')}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setCancelConfirm(sub.id)} className="text-sm text-red-600 hover:text-red-700 font-medium transition">{t('sub.cancel')}</button>
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
