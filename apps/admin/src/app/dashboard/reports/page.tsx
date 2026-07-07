'use client';
import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const REPORTS = [
  { key: 'orders', label: 'Orders', desc: 'All orders with status, customer, and totals.', hasDateRange: true, emoji: '📦', bg: '#f5f3ff', color: '#7c3aed' },
  { key: 'customers', label: 'Customers', desc: 'All registered customers with order count.', hasDateRange: false, emoji: '👥', bg: '#eff6ff', color: '#2563eb' },
  { key: 'subscriptions', label: 'Subscriptions', desc: 'All subscriptions with plan and renewal dates.', hasDateRange: false, emoji: '🔄', bg: '#f0fdf4', color: '#16a34a' },
  { key: 'revenue', label: 'Revenue', desc: 'All completed payments with provider details.', hasDateRange: true, emoji: '💰', bg: '#f0fdfa', color: '#0f766e' },
];

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloaded, setDownloaded] = useState<string[]>([]);

  function token() { return localStorage.getItem('admin_token') || ''; }

  async function download(key: string, hasDateRange: boolean) {
    setDownloading(key);
    try {
      const params = new URLSearchParams();
      if (hasDateRange && from) params.set('from', from);
      if (hasDateRange && to) params.set('to', to);
      const res = await fetch(`${API}/reports/${key}?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${key}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(d => [...d, key]);
      setTimeout(() => setDownloaded(d => d.filter(x => x !== key)), 3000);
    } finally {
      setDownloading(null);
    }
  }

  const inp = { border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 14px', fontSize: 13, outline: 'none', background: '#f8fafc' };
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Reports</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Download CSV exports for offline analysis or spreadsheet imports.</p>
      </div>

      {/* Date range */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', padding: '20px 24px', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 14px' }}>Date Range Filter</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={lbl}>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
          </div>
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }} style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', paddingBottom: 2 }}>Clear</button>
          )}
          <p style={{ fontSize: 12, color: '#94a3b8', paddingBottom: 2, margin: 0 }}>Applies to Orders and Revenue only.</p>
        </div>
      </div>

      {/* Report cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {REPORTS.map(r => {
          const isDownloading = downloading === r.key;
          const isDone = downloaded.includes(r.key);
          return (
            <div key={r.key} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {r.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{r.label} Report</h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>{r.desc}</p>
                {r.hasDateRange && (from || to) && (
                  <p style={{ fontSize: 12, color: '#3b82f6', margin: '0 0 12px' }}>Filtered: {from || 'start'} → {to || 'now'}</p>
                )}
                <button
                  onClick={() => download(r.key, r.hasDateRange)}
                  disabled={isDownloading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: isDownloading ? 'default' : 'pointer', transition: 'all 0.12s', opacity: isDownloading ? 0.7 : 1, background: isDone ? '#f0fdf4' : '#0f172a', color: isDone ? '#166534' : '#fff' }}
                >
                  {isDownloading ? '⏳ Exporting…' : isDone ? '✓ Downloaded!' : '⬇ Export CSV'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
