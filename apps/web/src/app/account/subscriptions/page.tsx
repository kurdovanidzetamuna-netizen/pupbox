'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('pupbox_token') : null; }

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:         { bg: '#f0fdf4', color: '#166534', label: 'Active' },
  PENDING:        { bg: '#fff7ed', color: '#9a3412', label: 'Pending' },
  PAUSED:         { bg: '#f1f5f9', color: '#475569', label: 'Paused' },
  CANCELLED:      { bg: '#fef2f2', color: '#991b1b', label: 'Cancelled' },
  EXPIRED:        { bg: '#f1f5f9', color: '#475569', label: 'Expired' },
  PAYMENT_FAILED: { bg: '#fef2f2', color: '#991b1b', label: 'Payment Failed' },
};

export default function MySubscriptionsPage() {
  const router = useRouter();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login?redirect=/account/subscriptions'); return; }
    fetch(`${API}/me/subscriptions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setSubs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function toggleAutoRenewal(sub: any) {
    const token = getToken();
    setToggling(sub.id);
    try {
      const res = await fetch(`${API}/me/subscriptions/${sub.id}/auto-renewal`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !sub.autoRenewal }),
      });
      if (!res.ok) throw new Error();
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, autoRenewal: !s.autoRenewal } : s));
      showToast(!sub.autoRenewal ? 'Auto-renewal enabled' : 'Auto-renewal disabled');
    } catch {
      showToast('Failed to update auto-renewal', false);
    } finally { setToggling(null); }
  }

  async function cancelSubscription(id: string) {
    const token = getToken();
    try {
      const res = await fetch(`${API}/me/subscriptions/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });
      if (!res.ok) throw new Error();
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: 'CANCELLED', autoRenewal: false } : s));
      setCancelConfirm(null);
      showToast('Subscription cancelled');
    } catch {
      showToast('Failed to cancel subscription', false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/account" className="text-gray-400 hover:text-teal-600 text-sm">← My Account</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-extrabold text-gray-900">My Subscriptions</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        ) : subs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-gray-700 font-semibold mb-1">No subscriptions yet</p>
            <p className="text-gray-400 text-sm mb-6">Choose a plan to get your first Pupbox.</p>
            <Link href="/prices" className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition text-sm">View Plans</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subs.map(sub => {
              const st = STATUS_STYLES[sub.status] || STATUS_STYLES.PENDING;
              const isActive = sub.status === 'ACTIVE';
              const canToggle = ['ACTIVE', 'PENDING'].includes(sub.status);
              return (
                <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">{sub.plan?.name}</h2>
                      <p className="text-sm text-gray-400">{sub.plan?.durationValue} month{sub.plan?.durationValue > 1 ? 's' : ''} · {sub.plan?.boxCount} box{sub.plan?.boxCount > 1 ? 'es' : ''}</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-0.5">Boxes delivered</p>
                      <p className="font-bold text-gray-900">{sub.boxesDelivered} / {sub.boxesTotal}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-0.5">Next renewal</p>
                      <p className="font-bold text-gray-900">
                        {sub.nextRenewalAt ? new Date(sub.nextRenewalAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    {sub.dog && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-gray-400 text-xs mb-0.5">Dog</p>
                        <p className="font-bold text-gray-900">{sub.dog.name}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-400 text-xs mb-0.5">Price</p>
                      <p className="font-bold text-gray-900">₾{Number(sub.plan?.price).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Auto-renewal toggle */}
                  {canToggle && (
                    <div className={`flex items-center justify-between rounded-xl border p-4 mb-4 transition ${sub.autoRenewal ? 'border-teal-200 bg-teal-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">🔄 Auto-Renewal</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sub.autoRenewal
                            ? `Renews automatically${sub.nextRenewalAt ? ` on ${new Date(sub.nextRenewalAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
                            : 'Your subscription will not renew automatically'}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleAutoRenewal(sub)}
                        disabled={toggling === sub.id}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${sub.autoRenewal ? 'bg-teal-600' : 'bg-gray-300'} ${toggling === sub.id ? 'opacity-50' : ''}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${sub.autoRenewal ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  {isActive && (
                    <div className="flex gap-3">
                      {cancelConfirm === sub.id ? (
                        <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-red-800 mb-3">Cancel this subscription?</p>
                          <p className="text-xs text-red-600 mb-4">This will stop future renewals and deliveries. You won't get a refund for the current period.</p>
                          <div className="flex gap-2">
                            <button onClick={() => cancelSubscription(sub.id)} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition">Yes, cancel</button>
                            <button onClick={() => setCancelConfirm(null)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Keep it</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setCancelConfirm(sub.id)} className="text-sm text-red-500 hover:text-red-700 font-medium transition">Cancel subscription</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold z-50 ${toast.ok ? 'bg-teal-700' : 'bg-red-600'}`}>
          <span>{toast.ok ? '✅' : '⚠️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </main>
  );
}
