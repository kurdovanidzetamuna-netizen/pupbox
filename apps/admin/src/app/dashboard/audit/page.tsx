'use client';
import { Select } from '@/components/Dropdown';
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const ACTION_COLORS: Record<string, { background: string; color: string; border: string }> = {
  CREATE: { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' },
  UPDATE: { background: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' },
  DELETE: { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' },
  LOGIN:  { background: 'var(--yellow-50)', color: 'var(--yellow-800)', border: '1px solid var(--amber-200)' },
  STATUS: { background: 'var(--fuchsia-50)', color: 'var(--purple-700)', border: '1px solid var(--purple-200)' },
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('admin_token');
    const qs = new URLSearchParams({ page: String(page), limit: '50' });
    if (module) qs.set('module', module);
    const res = await fetch(`${API}/audit?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    }
    setLoading(false);
  }, [page, module]);

  useEffect(() => { load(); }, [load]);

  const modules = ['products', 'orders', 'subscriptions', 'customers', 'coupons', 'blog', 'cms', 'categories', 'auth'];

  function formatDate(d: string) {
    return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Audit Log</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{total.toLocaleString()} events recorded</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Select
            value={module}
            onChange={e => { setModule(e.target.value); setPage(1); }}
            style={{ fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, padding: '9px 14px', background: 'var(--white)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">All modules</option>
            {modules.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </Select>
          <button onClick={load} style={{ fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, padding: '9px 14px', background: 'var(--white)', cursor: 'pointer', color: 'var(--slate-600)', fontWeight: 600 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%' }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <p style={{ fontSize: 13 }}>No audit events found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Timestamp', 'Admin', 'Module', 'Action', 'Entity ID', 'Details'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => {
                const ac = ACTION_COLORS[log.action?.toUpperCase()] || ACTION_COLORS.STATUS;
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                    <td style={{ padding: '12px 18px', color: 'var(--slate-500)', whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(log.createdAt)}</td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: 12 }}>{log.admin?.name || log.admin?.email || 'System'}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 8px', borderRadius: 6 }}>{log.module || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ ...ac, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{log.action || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--slate-400)' }}>{log.entityId ? log.entityId.slice(0, 8) + '…' : '—'}</span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--slate-500)', maxWidth: 280 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {log.description || (log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : '—')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--slate-600)', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--slate-500)', padding: '0 8px' }}>Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', fontSize: 13, cursor: page === pages ? 'not-allowed' : 'pointer', color: 'var(--slate-600)', opacity: page === pages ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
