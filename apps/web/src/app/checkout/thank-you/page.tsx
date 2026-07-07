'use client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ThankyouContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get('order');
  const paymentStatus = params.get('payment_status'); // Flitt redirects back with this

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  // If Flitt redirected back with success, show success
  const isSuccess = paymentStatus === 'approved' || !paymentStatus;
  const isFailed = paymentStatus === 'declined' || paymentStatus === 'expired';

  async function handlePay() {
    if (!orderId) return;
    setPaying(true);
    setError('');
    try {
      const token = localStorage.getItem('pupbox_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/initiate/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to initiate payment');
      const data = await res.json();
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e.message || 'Payment error');
      setPaying(false);
    }
  }

  if (isFailed) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">❌</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Payment failed</h1>
        <p className="text-lg text-gray-500 mb-2">Your payment was declined or expired.</p>
        {orderId && <p className="text-sm text-gray-400 mb-8">Order: <span className="font-mono text-gray-600">{orderId.slice(-8).toUpperCase()}</span></p>}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="flex gap-4">
          <button
            onClick={handlePay}
            disabled={paying}
            className="inline-flex items-center justify-center bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition disabled:opacity-50"
          >
            {paying ? 'Redirecting...' : 'Try Again'}
          </button>
          <Link href="/shop" className="inline-flex items-center justify-center border border-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-medium hover:bg-gray-50 transition">
            Back to Shop
          </Link>
        </div>
      </main>
    );
  }

  // New order (no payment_status) — need to pay
  if (!paymentStatus && orderId) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">🧾</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Order created!</h1>
        <p className="text-lg text-gray-500 mb-2">Your order is ready. Complete payment to confirm it.</p>
        <p className="text-sm text-gray-400 mb-8">Order: <span className="font-mono text-gray-600">{orderId.slice(-8).toUpperCase()}</span></p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          onClick={handlePay}
          disabled={paying}
          className="inline-flex items-center justify-center bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-teal-700 transition disabled:opacity-50 mb-4"
        >
          {paying ? 'Redirecting to payment...' : '💳 Pay Now'}
        </button>
        <Link href="/shop" className="text-sm text-gray-400 hover:underline">Cancel — continue shopping</Link>
      </main>
    );
  }

  // Payment approved
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Payment confirmed!</h1>
      <p className="text-lg text-gray-500 mb-2">Thank you! Your order is confirmed and being prepared.</p>
      {orderId && <p className="text-sm text-gray-400 mb-2">Order: <span className="font-mono text-gray-600">{orderId.slice(-8).toUpperCase()}</span></p>}
      <p className="text-sm text-teal-700 font-medium mb-10">You'll receive a confirmation email shortly.</p>
      <div className="flex gap-4">
        <Link href="/account/orders" className="inline-flex items-center justify-center bg-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-teal-700 transition">
          View My Orders
        </Link>
        <Link href="/shop" className="inline-flex items-center justify-center border border-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-medium hover:bg-gray-50 transition">
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return <Suspense><ThankyouContent /></Suspense>;
}
