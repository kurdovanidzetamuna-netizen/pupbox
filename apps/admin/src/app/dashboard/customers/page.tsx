'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

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
    { label: 'Total', value: customers.length, color: '#0f172a', bg: '#f8fafc' },
    { label: 'Active', value: active, color: '#166534', bg: '#f0fdf4' },
    { label: 'Blocked', value: blocked, color: '#dc2626', bg: '#fef2f2' },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Customers</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{customers.length} registered customers</p>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{c.label}</p>
            <p style={{ fontSize: 30, fontWeight: 800, color: c.color, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search by name or email…"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        <button onClick={load} style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Search</button>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['All', ''], ['Active', 'ACTIVE'], ['Blocked', 'BLOCKED']].map(([label, val]) => (
            <button key={val} onClick={() => setStatus(val)} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: status === val ? 'none' : '1px solid #e2e8f0', background: status === val ? '#0f172a' : '#fff', color: status === val ? '#fff' : '#64748b', transition: 'all 0.12s' }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid #99f6e4', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : customers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
            <p style={{ fontSize: 13 }}>No customers found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Customer', 'Phone', 'Orders', 'Referral Code', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8ecf0', background: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0fdfa', color: '#0d9488', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(c.firstName?.[0] || c.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>{c.phone || '—'}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>{c._count?.orders ?? 0}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 6 }}>{c.referralCode || '—'}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...(c.status === 'ACTIVE' ? { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }) }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => toggleStatus(c.id, c.status)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', ...(c.status === 'ACTIVE' ? { background: '#fef2f2', color: '#dc2626' } : { background: '#f0fdf4', color: '#166534' }) }}>
                      {c.status === 'ACTIVE' ? 'Block' : 'Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
