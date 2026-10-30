'use client';
import { Select } from '@/components/Dropdown';
import { useCallback, useEffect, useState } from 'react';
import CustomerDrawer from '@/components/CustomerDrawer';
import { can, download, getOr, patch, today } from '@/lib/api';
import { day } from '@/lib/format';


type Channel = '' | 'email' | 'sms';

/**
 * Who may get offers and reminders, per channel. Customers switch email and
 * SMS on or off in their account; the team sees the audiences, exports them
 * for campaigns, and switches a channel off when a customer asks.
 */
export default function NotificationsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState<Channel>('');
  const [status, setStatus] = useState<'' | 'on' | 'off'>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [perms, setPerms] = useState({ export: false, manage: false });

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '50' });
    if (channel) qs.set('channel', channel);
    if (status) qs.set('status', status);
    if (query) qs.set('search', query);
    try {
      const [l, s] = await Promise.all([getOr<any>(`/admin/crm/consents?${qs}`, null), getOr<any>('/admin/crm/consents/summary', null)]);
      if (l) { setRows(l.items); setTotal(l.total); }
      if (s) setSummary(s);
    } finally { setLoading(false); }
  }, [page, channel, status, query]);

  useEffect(() => { setPerms({ export: can('crm.export'), manage: can('crm.manage') }); }, []);
  useEffect(() => { load(); }, [load]);

  async function optOut(u: any, ch: 'email' | 'sms') {
    const label = ch === 'email' ? 'email' : 'SMS';
    if (!confirm(`Switch ${label} offers OFF for ${u.firstName} ${u.lastName}? Only do this when the customer asked.`)) return;
    try { await patch(`/admin/crm/consents/${u.id}`, { [ch]: false }, 'Not changed.'); } catch (e: any) { alert(e.message); return; }
    load();
  }

  async function exportCsv(ch: 'email' | 'sms') {
    try { await download(`/admin/crm/consents/export?channel=${ch}`, `pupbox-${ch}-audience-${today()}.csv`); }
    catch (e: any) { alert(e.status === 403 ? 'Your role can’t export audiences.' : 'Export failed.'); }
  }

  const card = (label: string, value: any, sub: string, onClick?: () => void, action?: React.ReactNode) => (
    <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button type="button" onClick={onClick} disabled={!onClick} style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: onClick ? 'pointer' : 'default' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--slate-900)' }}>{value ?? '—'}</div>
        <div style={{ fontSize: 11.5, color: 'var(--slate-400)' }}>{sub}</div>
      </button>
      {action}
    </div>
  );
  const sel: React.CSSProperties = { border: '1px solid var(--slate-200)', borderRadius: 10, padding: '8px 10px', fontSize: 13, background: 'var(--white)', color: 'var(--slate-800)' };
  const pill = (on: boolean) => ({ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: on ? 'var(--green-50)' : 'var(--slate-100)', color: on ? 'var(--green-800)' : 'var(--slate-500)' });
  const exportBtn = (ch: 'email' | 'sms') => perms.export && (
    <button type="button" onClick={() => exportCsv(ch)} style={{ alignSelf: 'flex-start', marginTop: 6, background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>⬇ Export audience</button>
  );
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>🔔 Notifications & consent</h1>
      <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 22px' }}>
        Who agreed to offers and reminders, by email and by SMS. Customers switch these in their account; exports include only confirmed contacts who agreed.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
        {card('Email audience', summary?.email, summary ? `${summary.emailReachable} with a confirmed email` : '', () => { setChannel('email'); setStatus('on'); setPage(1); }, exportBtn('email'))}
        {card('SMS audience', summary?.sms, summary ? `${summary.smsReachable} with a confirmed phone` : '', () => { setChannel('sms'); setStatus('on'); setPage(1); }, exportBtn('sms'))}
        {card('Both channels', summary?.both, 'email and SMS')}
        {card('No marketing', summary?.none, 'both switched off', () => { setChannel(''); setStatus('off'); setPage(1); })}
        {card('Customers', summary?.customers, 'all accounts', () => { setChannel(''); setStatus(''); setPage(1); })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); setPage(1); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or phone…" style={{ ...sel, minWidth: 240 }} />
        <Select value={channel} onChange={(e) => { setChannel(e.target.value as Channel); setPage(1); }} style={sel}>
          <option value="">Any channel</option><option value="email">Email</option><option value="sms">SMS</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }} style={sel}>
          <option value="">On or off</option><option value="on">Switched on</option><option value="off">Switched off</option>
        </Select>
        <button type="submit" style={{ background: 'var(--slate-900)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Search</button>
        <span style={{ fontSize: 12, color: 'var(--slate-400)', marginLeft: 'auto' }}>{total} customers</span>
      </form>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'auto' }}>
        {loading ? <p style={{ padding: 50, textAlign: 'center', color: 'var(--slate-400)' }}>Loading…</p> : rows.length === 0 ? (
          <p style={{ padding: 50, textAlign: 'center', color: 'var(--slate-400)' }}>Nobody matches.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Customer', 'Email offers', 'SMS offers', 'Joined', ''].map((h) => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <button type="button" onClick={() => setOpenId(u.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{u.email} · {u.phone || 'no phone'}</div>
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={pill(u.marketingEmail)}>{u.marketingEmail ? 'On' : 'Off'}</span>
                    {u.marketingEmailAt && <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 3 }}>since {day(u.marketingEmailAt)}</div>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={pill(u.marketingSms)}>{u.marketingSms ? 'On' : 'Off'}</span>
                    {u.marketingSmsAt && <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 3 }}>since {day(u.marketingSmsAt)}</div>}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--slate-500)' }}>{day(u.createdAt)}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {perms.manage && u.marketingEmail && <button type="button" onClick={() => optOut(u, 'email')} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--red-50)', color: 'var(--red-600)', fontWeight: 600, cursor: 'pointer', marginLeft: 6 }}>Email off</button>}
                    {perms.manage && u.marketingSms && <button type="button" onClick={() => optOut(u, 'sms')} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--red-50)', color: 'var(--red-600)', fontWeight: 600, cursor: 'pointer', marginLeft: 6 }}>SMS off</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14, fontSize: 13 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...sel, cursor: 'pointer' }}>← Previous</button>
          <span style={{ color: 'var(--slate-500)' }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={{ ...sel, cursor: 'pointer' }}>Next →</button>
        </div>
      )}

      {openId && <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
