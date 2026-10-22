'use client';
import { useState, useEffect, useCallback } from 'react';
import { FilterSelect, SearchInput, Toolbar, StatCard, StatCards, Pagination, ActionButton } from '@/components/Toolbar';
import { DateInput } from '@/components/DateField';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const token = () => localStorage.getItem('admin_token') ?? '';

/** Each stage a referral moves through, in order, with how it shows. */
const STAGES: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  INVITED:               { label: 'Invited',      bg: 'var(--slate-50)',  fg: 'var(--slate-500)', border: 'var(--slate-200)' },
  REGISTERED:            { label: 'Registered',   bg: 'var(--blue-50)',   fg: 'var(--blue-600)',  border: 'var(--blue-300)' },
  FIRST_ORDER_COMPLETED: { label: 'First order',  bg: 'var(--amber-50)',  fg: 'var(--amber-600)', border: 'var(--amber-300)' },
  REWARD_GRANTED:        { label: 'Reward given', bg: 'var(--teal-50)',   fg: 'var(--teal-600)',  border: 'var(--teal-200)' },
  CANCELLED:             { label: 'Cancelled',    bg: 'var(--red-50)',    fg: 'var(--red-600)',   border: 'var(--red-300)' },
};

type Stats = {
  funnel: { invited: number; registered: number; firstOrder: number; rewarded: number; cancelled: number; registeredPct: number; firstOrderPct: number; rewardedPct: number };
  rewards: { given: number; used: number; usedCount: number; unused: number; unusedCount: number };
  referredRevenue: { total: number; orders: number };
  topInviters: { id: string; email: string; firstName?: string; lastName?: string; referralCode?: string; referrals: number; rewarded: number }[];
};

const coupons = (n: number) => `${n} promo code${n === 1 ? '' : 's'}`;
const gel = (n: number) => `₾${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null) => [u?.firstName, u?.lastName].filter(Boolean).join(' ');
const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Referrals: the whole programme at a glance (funnel, rewards in ₾, what
 * referred friends spent, top inviters — counted across every referral, not
 * one page), then the list with stage, date and name filters and a CSV export.
 */
export default function ReferralsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [f, setF] = useState({ status: '', from: '', to: '', q: '' });
  const [q, setQ] = useState('');

  // Typing in search waits a moment before asking the server.
  useEffect(() => { const id = setTimeout(() => setF((x) => (x.q === q ? x : { ...x, q })), 300); return () => clearTimeout(id); }, [q]);
  useEffect(() => setPage(1), [f, limit]);

  const query = (extra: Record<string, string | number> = {}) =>
    new URLSearchParams(Object.entries({ ...f, ...extra }).filter(([, v]) => v !== '').map(([k, v]) => [k, String(v)])).toString();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/referrals/admin?${query({ page, limit })}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) {
      const data = await res.json();
      setRows(data.referrals || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    }
    setLoading(false);
  }, [page, limit, f]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch(`${API}/referrals/admin/stats`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, []);

  async function exportCsv() {
    const res = await fetch(`${API}/referrals/admin/export.csv?${query()}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = `referrals${f.from ? `-${f.from}` : ''}${f.to ? `_${f.to}` : ''}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = !!(f.status || f.from || f.to || f.q);
  const fu = stats?.funnel;
  const card: React.CSSProperties = { background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', padding: '18px 20px' };
  const th: React.CSSProperties = { padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' };

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Referrals</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>
            {fu ? `${fu.invited.toLocaleString()} referrals in total` : '…'}{filtered ? ` · ${total.toLocaleString()} match the filters` : ''}
          </p>
        </div>
        <ActionButton variant="secondary" onClick={exportCsv}>⬇ Export CSV{filtered ? ' (filtered)' : ''}</ActionButton>
      </div>

      {/* The funnel, across every referral */}
      {fu && (
        <StatCards>
          <StatCard theme="slate" value={fu.invited} label="Invited" />
          <StatCard theme="blue" value={fu.registered} label={`Registered · ${fu.registeredPct}%`} />
          <StatCard theme="amber" value={fu.firstOrder} label={`First order · ${fu.firstOrderPct}%`} />
          <StatCard theme="teal" value={fu.rewarded} label={`Reward given · ${fu.rewardedPct}%`} />
          {fu.cancelled > 0 && <StatCard theme="red" value={fu.cancelled} label="Cancelled" />}
        </StatCards>
      )}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={card}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 12px' }}>Rewards</p>
            {[
              ['Given', gel(stats.rewards.given), 'var(--slate-800)'],
              ['Used', `${gel(stats.rewards.used)} · ${coupons(stats.rewards.usedCount)}`, 'var(--teal-600)'],
              ['Not used yet', `${gel(stats.rewards.unused)} · ${coupons(stats.rewards.unusedCount)}`, 'var(--amber-600)'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '5px 0' }}>
                <span style={{ color: 'var(--slate-500)' }}>{k}</span><span style={{ fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 12px' }}>Spent by referred friends</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--teal-600)', margin: 0 }}>{gel(stats.referredRevenue.total)}</p>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 0' }}>{stats.referredRevenue.orders} paid order{stats.referredRevenue.orders === 1 ? '' : 's'}</p>
          </div>
          <div style={card}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', margin: '0 0 8px' }}>Top inviters</p>
            {stats.topInviters.length === 0 ? <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: 0 }}>Nobody yet</p> : (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {stats.topInviters.map((u, i) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => setQ(u.email)} title="Show their referrals"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ width: 20, fontSize: 11, fontWeight: 700, color: 'var(--slate-400)' }}>{i + 1}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--slate-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName(u) || u.email}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-700)' }}>{u.referrals}</span>
                      <span style={{ fontSize: 11, color: 'var(--teal-600)', minWidth: 44, textAlign: 'right' }}>{u.rewarded} 🎁</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      <Toolbar style={{ marginBottom: 14 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Inviter, friend or code…" width="min(260px, 100%)" />
        <FilterSelect value={f.status} onChange={(status) => setF((x) => ({ ...x, status }))}>
          <option value="">All stages</option>
          {Object.entries(STAGES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </FilterSelect>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate-500)' }}>
          From <DateInput value={f.from} max={f.to || undefined} onChange={(e) => setF((x) => ({ ...x, from: e.target.value }))} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate-500)' }}>
          To <DateInput value={f.to} min={f.from || undefined} onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))} />
        </label>
        {filtered && (
          <button type="button" onClick={() => { setQ(''); setF({ status: '', from: '', to: '', q: '' }); }}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px' }}>Clear</button>
        )}
      </Toolbar>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%' }} />
          </div>
        ) : rows.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔗</div>
            <p style={{ fontSize: 13 }}>{filtered ? 'No referrals match these filters' : 'No referrals yet'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Inviter', 'Code', 'Friend', 'Date', 'Stage', 'Reward'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = STAGES[r.stage] ?? STAGES.INVITED;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{fullName(r.inviter) || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{r.inviter?.email}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--teal-100)', color: 'var(--teal-900)', padding: '3px 8px', borderRadius: 8, fontWeight: 700 }}>{r.inviter?.referralCode || '—'}</span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {r.invited ? (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{fullName(r.invited) || '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{r.invited.email}</div>
                          </>
                        ) : <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>Not signed up yet</span>}
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--slate-500)', whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(r.createdAt)}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', background: st.bg, color: st.fg, border: `1px solid ${st.border}`, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        {r.rewardValue != null ? (
                          <>
                            <div style={{ fontWeight: 700, color: 'var(--teal-600)' }}>🎁 {gel(r.rewardValue)}</div>
                            {r.rewardedAt && <div style={{ fontSize: 11, color: 'var(--slate-400)' }}>{formatDate(r.rewardedAt)}</div>}
                          </>
                        ) : <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 0 && (
        <Pagination page={page} totalPages={pages} pageSize={limit} total={total} onPageChange={setPage} onPageSizeChange={setLimit} pageSizeOptions={[10, 20, 50, 100]} />
      )}
    </div>
  );
}
