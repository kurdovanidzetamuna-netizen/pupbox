'use client';
import Link from 'next/link';
import Confetti from '@/components/Confetti';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function Screen({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6 animate-[pop_0.5s_ease-out]" aria-hidden="true">{icon}</div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-3">{title}</h1>
      <p className="text-lg text-gray-500 mb-8 max-w-md">{sub}</p>
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
        headers: { Authorization: `Bearer ${localStorage.getItem('pupbox_token')}` },
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
  const errorLine = error && <p className="text-red-500 text-sm mb-4" role="alert">{error}</p>;

  if (isFailed) {
    return (
      <Screen icon="❌" title={t('ty.failed.title')} sub={t('ty.failed.sub')}>
        {orderRef}{errorLine}
        {/* A declined payment cancels the order and releases its stock
            (payments.service handleWebhook), so retrying this order would
            fail — the honest next step is to choose again. */}
        <div className="flex gap-4">
          <Link href="/prices" className={primary}>{t('ty.tryAgain')}</Link>
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
