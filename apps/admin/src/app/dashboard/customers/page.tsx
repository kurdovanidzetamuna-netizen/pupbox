'use client';
import { useEffect, useState } from 'react';
import CustomerDrawer from '@/components/CustomerDrawer';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (status) qs.set('status', status);
      const res = await fetch(`${API}/admin/customers?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : (data.items || []));
    } catch { } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [status]);

  async function toggleStatus(id: string, current: string) {
    const token = localStorage.getItem('admin_token');
    const next = current === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    await fetch(`${API}/admin/customers/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  const active = customers.filter(c => c.status === 'ACTIVE').length;
  const blocked = customers.filter(c => c.status === 'BLOCKED').length;

  const summaryCards = [
    { label: 'Total', value: customers.length, color: 'var(--slate-900)', bg: 'var(--slate-50)' },
    { label: 'Active', value: active, color: 'var(--green-800)', bg: 'var(--green-50)' },
    { label: 'Blocked', value: blocked, color: 'var(--red-600)', bg: 'var(--red-50)' },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Customers</h1>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{customers.length} registered customers</p>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{c.label}</p>
            <p style={{ fontSize: 30, fontWeight: 800, color: c.color, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 13 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search by name or email…"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', boxSizing: 'border-box' }}
          />
        </div>
        <button onClick={load} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Search</button>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['All', ''], ['Active', 'ACTIVE'], ['Blocked', 'BLOCKED']].map(([label, val]) => (
            <button key={val} onClick={() => setStatus(val)} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: status === val ? 'none' : '1px solid var(--slate-200)', background: status === val ? 'var(--slate-900)' : 'var(--white)', color: status === val ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.12s' }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : customers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
            <p style={{ fontSize: 13 }}>No customers found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Customer', 'Phone', 'Dogs', 'Orders', 'Marketing', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} onClick={() => setOpenId(c.id)} style={{ borderBottom: '1px solid var(--slate-50)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-50)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--teal-50)', color: 'var(--teal-600)', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(c.firstName?.[0] || c.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</p>
                        <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--slate-500)' }}>
                    {c.phone || '—'}
                    {c.phone && <span title={c.phoneVerified ? 'Confirmed by SMS' : 'Not confirmed'} style={{ marginLeft: 4, color: c.phoneVerified ? 'var(--green-700)' : 'var(--amber-600)' }}>{c.phoneVerified ? '✓' : '•'}</span>}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--slate-900)' }}>{c._count?.dogs ?? 0}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--slate-900)' }}>{c._count?.orders ?? 0}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: c.marketingConsent ? 'var(--green-800)' : 'var(--slate-400)' }}>{c.marketingConsent ? '✓ Yes' : 'No'}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...(c.status === 'ACTIVE' ? { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' } : { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' }) }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--slate-400)' }}>{new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={{ padding: '14px 18px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleStatus(c.id, c.status)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', ...(c.status === 'ACTIVE' ? { background: 'var(--red-50)', color: 'var(--red-600)' } : { background: 'var(--green-50)', color: 'var(--green-800)' }) }}>
                      {c.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {openId && <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
