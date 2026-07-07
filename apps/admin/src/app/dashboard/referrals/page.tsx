'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API}/referrals/admin?page=${page}&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setReferrals(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Referrals</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{total.toLocaleString()} total referrals</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Referrals', value: total, icon: '🔗', color: '#0d9488' },
          { label: 'Unique Referrers', value: new Set(referrals.map(r => r.referrerId)).size, icon: '👤', color: '#0ea5e9' },
          { label: 'Converted', value: referrals.filter(r => r.subscriptionCreated).length, icon: '✅', color: '#16a34a' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{card.icon}</div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: card.color, margin: 0 }}>{card.value}</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid #99f6e4', borderTopColor: '#0d9488', borderRadius: '50%' }} />
          </div>
        ) : referrals.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔗</div>
            <p style={{ fontSize: 13 }}>No referrals yet</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Referrer', 'Referral Code', 'Referred User', 'Date', 'Subscription', 'Reward'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8ecf0', background: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referrals.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.referrer?.firstName} {r.referrer?.lastName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.referrer?.email}</div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#ccfbf1', color: '#134e4a', padding: '3px 10px', borderRadius: 8, fontWeight: 700 }}>{r.code || r.referrer?.referralCode || '—'}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.referred?.firstName} {r.referred?.lastName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.referred?.email}</div>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b', whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(r.createdAt)}</td>
                  <td style={{ padding: '14px 18px' }}>
                    {r.subscriptionCreated ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>✓ Subscribed</span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {r.rewardGiven ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdfa', color: '#115e59', border: '1px solid #99f6e4', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>🎁 Given</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#475569', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#64748b', padding: '0 8px' }}>Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: page === pages ? 'not-allowed' : 'pointer', color: '#475569', opacity: page === pages ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
