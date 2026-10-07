'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { gel } from '@/lib/format';

/** Every OrderStatus the API can return, with a colour and a label key. */
const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-teal-100 text-teal-800',
  PROCESSING: 'bg-purple-100 text-purple-700',
  PACKED: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-gray-100 text-gray-600',
  FAILED: 'bg-red-100 text-red-700',
};

export default function MyOrdersPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/orders/my')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setOrders(data.orders || []))
      .catch(e => {
        if (e instanceof SessionExpiredError) return router.replace(loginUrl('/account/orders'));
        setError(t('ord.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/account" className="text-sm text-gray-500 hover:text-teal-600">{t('acc.back')}</Link>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-2 mb-8">{t('acc.orders')}</h1>

        {loading && (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        )}
        {error && <p className="text-red-600 text-center py-20" role="alert">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4" aria-hidden="true">📦</div>
            <p className="text-lg font-medium mb-2">{t('ord.none')}</p>
            <Link href="/prices" className="text-teal-700 hover:underline">{t('ord.startShopping')}</Link>
          </div>
        )}

        <ul className="space-y-4">
          {orders.map((order: any) => (
            <li key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{fill(t('ord.number'), { n: order.id.slice(-8).toUpperCase() })}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {t(`ord.status.${order.status}`, order.status)}
                  </span>
                  <span className="font-bold text-gray-900">{gel(order.total)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-2">
                {order.items.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-lg overflow-hidden">
                      {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" /> : '🐾'}
                    </span>
                    <span>{item.name} × {item.quantity}</span>
                  </div>
                ))}
                {order.items.length > 3 && <span className="text-xs text-gray-400 self-center">{fill(t('ord.more'), { n: order.items.length - 3 })}</span>}
              </div>

              {/* Only a PENDING order can be paid: a declined payment cancels the
                  order and releases its stock (payments.service handleWebhook). */}
              {order.status === 'PENDING' && <PayButton orderId={order.id} />}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function PayButton({ orderId }: { orderId: string }) {
  const { t } = useLanguage();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    setPaying(true); setError('');
    try {
      const res = await authFetch(`/payments/initiate/${orderId}`, { method: 'POST' });
      const data = res.ok ? await res.json() : null;
      if (!data?.checkoutUrl) throw new Error();
      window.location.href = data.checkoutUrl;
    } catch {
      setError(t('ty.e.initiate'));
      setPaying(false);
    }
  }

  return (
    <div className="mt-4">
      <button onClick={handlePay} disabled={paying}
        className="bg-teal-600 text-white text-sm px-5 py-2 rounded-full font-medium hover:bg-teal-700 transition disabled:opacity-50">
        {paying ? t('ord.redirecting') : t('ord.pay')}
      </button>
      {error && <p className="text-red-600 text-xs mt-2" role="alert">{error}</p>}
    </div>
  );
}
