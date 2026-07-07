'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_LABELS: Record<string, string> = {
  INVITED: 'Link clicked',
  REGISTERED: 'Registered',
  FIRST_ORDER_COMPLETED: 'First order placed',
  REWARD_GRANTED: '₾10 coupon sent ✓',
  CANCELLED: 'Cancelled',
};

export default function ReferralsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('pupbox_token');
    if (!token) { router.push('/login?redirect=/account/referrals'); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/referrals/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';
  const referralLink = data ? `${siteUrl}/register?ref=${data.referralCode}` : '';

  function copy() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-teal-600">🐾 Pupbox</Link>
        <nav className="flex gap-6 text-sm text-gray-500">
          <Link href="/account/orders" className="hover:text-teal-600">My Orders</Link>
          <Link href="/account/referrals" className="text-teal-600 font-medium">Referrals</Link>
        </nav>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Refer a Friend</h1>
        <p className="text-gray-500 mb-8">Share your link. When your friend places their first order, you both get rewarded.</p>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Total Referred', value: data.stats.total, color: 'text-gray-900' },
                { label: 'Registered', value: data.stats.registered, color: 'text-blue-600' },
                { label: 'Rewards Earned', value: data.stats.rewarded, color: 'text-green-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Referral link */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
              <h2 className="font-semibold text-gray-800 mb-4">Your Referral Link</h2>
              <div className="flex items-center gap-3">
                <input
                  readOnly
                  value={referralLink}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 bg-gray-50 focus:outline-none"
                />
                <button
                  onClick={copy}
                  className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 transition shrink-0"
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Your friend will get a discount, and when they place their first order you'll receive a <strong>₾10 coupon</strong>.
              </p>
            </div>

            {/* Referral history */}
            {data.referrals.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50">
                  <h2 className="font-semibold text-gray-800">Referral History</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Friend</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Joined</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referrals.map((r: any) => (
                      <tr key={r.id} className="border-t border-gray-50">
                        <td className="px-4 py-3 text-gray-700">
                          {r.invited ? `${r.invited.firstName} ${r.invited.lastName}` : 'Pending registration'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {r.invited?.createdAt ? new Date(r.invited.createdAt).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.status === 'REWARD_GRANTED' ? 'bg-green-100 text-green-700' : r.status === 'REGISTERED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
