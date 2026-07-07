'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-600',
};

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('pupbox_token');
    if (!token) { router.push('/login?redirect=/account/orders'); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setOrders(data.orders || []); setLoading(false); })
      .catch(() => { setError('Failed to load orders'); setLoading(false); });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-teal-600">🐾 Pupbox</Link>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
          <Link href="/shop" className="hover:text-teal-600">Shop</Link>
          <Link href="/prices" className="hover:text-teal-600">Pricing</Link>
        </nav>
        <Link href="/account/orders" className="text-sm font-medium text-teal-600">My Orders</Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Orders</h1>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-red-500 text-center py-20">{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg font-medium mb-2">No orders yet</p>
            <Link href="/shop" className="text-teal-600 hover:underline">Start shopping</Link>
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order: any) => {
            const payment = order.payments?.[0];
            const isPending = order.status === 'PENDING';
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Order #{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                    <span className="font-bold text-gray-900">₾{Number(order.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  {order.items.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-lg">
                        {item.product?.images?.[0]?.url ? (
                          <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : '🐾'}
                      </span>
                      <span>{item.name} × {item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && <span className="text-xs text-gray-400 self-center">+{order.items.length - 3} more</span>}
                </div>

                {isPending && (
                  <PayButton orderId={order.id} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function PayButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    setPaying(true);
    try {
      const token = localStorage.getItem('pupbox_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/initiate/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch {
      setPaying(false);
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={paying}
      className="mt-2 bg-teal-600 text-white text-sm px-5 py-2 rounded-full font-medium hover:bg-teal-700 transition disabled:opacity-50"
    >
      {paying ? 'Redirecting...' : '💳 Pay Now'}
    </button>
  );
}
