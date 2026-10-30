'use client';
import Link from '@/components/LangLink';
import Confetti from '@/components/Confetti';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { track, itemsOf } from '@/lib/tracking';
import { useLanguage } from '@/context/LanguageContext';
import { FormAlert } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import { API_URL } from '@/lib/api';
import { savedToken } from '@/lib/authFetch';


function Screen({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6 animate-[pop_0.5s_ease-out]" aria-hidden="true">{icon}</div>
      <Heading align="center" title={title} subtitle={sub} />
      {children}
    </main>
  );
}

function ThankyouContent() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const orderId = params.get('order');
  const paymentStatus = params.get('payment_status'); // Flitt redirects back with this

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  // Only an explicit approval is a success. A missing or unrecognised status
  // used to fall through to "Payment confirmed!", so opening this page directly
  // told people they had paid when they hadn't.
  const isApproved = paymentStatus === 'approved';
  const isFailed = paymentStatus === 'declined' || paymentStatus === 'expired' || paymentStatus === 'reversed';

  // Ads and analytics: the purchase, once per order even if this page is
  // opened again. The order id pairs it with the one our server sends Meta.
  useEffect(() => {
    if (!isApproved || !orderId) return;
    const key = `pb_bought_${orderId}`;
    try { if (localStorage.getItem(key)) return; } catch { /* storage blocked: send anyway */ }
    fetch(`${API_URL}/orders/my/${orderId}`, { headers: { Authorization: `Bearer ${savedToken()}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((o) => {
        if (!o) return;
        track('Purchase', { value: Number(o.total), items: itemsOf(o.items), orderId: o.id });
        try { localStorage.setItem(key, '1'); } catch { /* fine */ }
      })
      .catch(() => {});
  }, [isApproved, orderId]);
  const orderRef = orderId && (
    <p className="text-sm text-gray-400 -mt-6 mb-8">{t('ty.order')}: <span className="font-mono text-gray-600">{orderId.slice(-8).toUpperCase()}</span></p>
  );

  async function handlePay() {
    if (!orderId) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/payments/initiate/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${savedToken()}` },
      });
      const data = res.ok ? await res.json() : null;
      if (!data?.checkoutUrl) throw new Error();
      window.location.href = data.checkoutUrl;
    } catch {
      setError(t('ty.e.initiate'));
      setPaying(false);
    }
  }

  const primary = 'inline-flex items-center justify-center bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-50';
  const secondary = 'inline-flex items-center justify-center border border-gray-200 text-gray-600 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition';
  const errorLine = <FormAlert message={error} className="mb-4" />;

  if (isFailed) {
    return (
      <Screen icon="❌" title={t('ty.failed.title')} sub={t('ty.failed.sub')}>
        {orderRef}{errorLine}
        {/* A declined or timed-out payment leaves the order waiting, its
            stock held (payments.service applyPaymentResult), so the same
            order can simply be paid again. */}
        <div className="flex gap-4">
          {paymentStatus !== 'reversed' && <button onClick={handlePay} disabled={paying} className={primary}>{paying ? t('ty.redirecting') : t('ty.tryAgain')}</button>}
          <Link href="/account/orders" className={secondary}>{t('ty.viewOrders')}</Link>
        </div>
      </Screen>
    );
  }

  // New order (no payment_status) — payment still to do.
  if (!paymentStatus && orderId) {
    return (
      <Screen icon="🧾" title={t('ty.created.title')} sub={t('ty.created.sub')}>
        {orderRef}{errorLine}
        <button onClick={handlePay} disabled={paying} className={`${primary} mb-4`}>{paying ? t('ty.redirecting') : `💳 ${t('ty.payNow')}`}</button>
        <Link href="/shop" className="text-sm text-gray-400 hover:underline">{t('ty.cancel')}</Link>
      </Screen>
    );
  }

  if (!isApproved) {
    return (
      <Screen icon={paymentStatus ? '⏳' : '🐾'} title={paymentStatus ? t('ty.pending.title') : t('ty.none.title')} sub={paymentStatus ? t('ty.pending.sub') : t('ty.none.sub')}>
        <div className="flex gap-4">
          <Link href="/account/orders" className={primary}>{t('ty.viewOrders')}</Link>
          <Link href="/shop" className={secondary}>{t('ty.keepShopping')}</Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen icon="🎉" title={t('ty.ok.title')} sub={t('ty.ok.sub')}>
      <Confetti />
      {orderRef}
      <p className="text-sm text-teal-700 font-medium -mt-4 mb-10">{t('ty.ok.email')}</p>
      <div className="flex gap-4">
        <Link href="/account/orders" className={primary}>{t('ty.viewOrders')}</Link>
        <Link href="/shop" className={secondary}>{t('ty.keepShopping')}</Link>
      </div>
    </Screen>
  );
}

export default function ThankYouPage() {
  return <Suspense><ThankyouContent /></Suspense>;
}
