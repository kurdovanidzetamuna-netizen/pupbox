'use client';
import { useCallback, useEffect, useState } from 'react';
import CustomerDrawer from '@/components/CustomerDrawer';
import Dropdown from '@/components/Dropdown';
import { DateInput } from '@/components/DateField';
import { ActionButton, Pagination, StatCard, StatCards } from '@/components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const token = () => localStorage.getItem('admin_token');
const can = (perm: string) => {
  try { return (JSON.parse(atob((token() || '').split('.')[1])).permissions ?? []).includes(perm); } catch { return false; }
};
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const gel = (n: number) => `₾${n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

const PLAN: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'On a plan', color: 'var(--green-800)', bg: 'var(--green-50)' },
  ended: { label: 'Lapsed', color: 'var(--amber-700)', bg: 'var(--amber-50)' },
  none: { label: 'No plan', color: 'var(--slate-500)', bg: 'var(--slate-100)' },
};
const SORTS = [
  { value: 'joined', label: 'Newest first' }, { value: 'spent', label: 'Spent most' }, { value: 'orders', label: 'Most orders' },
  { value: 'lastOrder', label: 'Ordered most recently' }, { value: 'lastLogin', label: 'Signed in most recently' }, { value: 'name', label: 'Name A–Z' },
];

type F = { search: string; status: string; plan: string; consent: string; language: string; city: string; tag: string; buyer: string; joinedFrom: string; joinedTo: string; sort: string };
const EMPTY: F = { search: '', status: '', plan: '', consent: '', language: '', city: '', tag: '', buyer: '', joinedFrom: '', joinedTo: '', sort: 'joined' };

/**
 * Every customer, with what the team needs to know at a glance: spend, paid
 * orders, plan, city and last order. Filter, sort, page, open one for the
 * full profile (dogs, plans, cards, promo codes, notes), or download the
 * filtered list as a spreadsheet.
 */
export default function CustomersPage() {
  const [f, setF] = useState<F>(EMPTY);
  const [query, setQuery] = useState('');
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [perms, setPerms] = useState({ export: false, block: false });

  useEffect(() => { setPerms({ export: can('crm.export'), block: can('users.block') }); }, []);

  const params = useCallback((extra: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    Object.entries({ ...f, search: query }).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    if (f.sort === 'name') p.set('dir', 'asc');
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return p.toString();
  }, [f, query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/customers?${params({ page: String(page), limit: String(limit) })}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, [params, page, limit]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [f, query, limit]);
  // Search as you type, a moment after the last key.
  useEffect(() => { const t = setTimeout(() => setQuery(f.search.trim()), 350); return () => clearTimeout(t); }, [f.search]);

  async function exportCsv() {
    const r = await fetch(`${API}/admin/customers/export.csv?${params()}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!r.ok) return;
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a'); a.href = url; a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function toggleStatus(id: string, current: string) {
    const next = current === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    if (next === 'BLOCKED' && !confirm('Block this customer? They are signed out and can’t sign in until unblocked.')) return;
    await fetch(`${API}/admin/customers/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status: next }) });
    load();
  }

  const set = <K extends keyof F>(k: K) => (v: F[K]) => setF((x) => ({ ...x, [k]: v }));
  const filtered = Object.entries(f).some(([k, v]) => k !== 'sort' && v);
  const rows: any[] = data?.rows ?? [];
  const t = data?.totals;

  const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '12px 14px', verticalAlign: 'middle' };
  const pill = (p: string) => <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: PLAN[p].color, background: PLAN[p].bg, whiteSpace: 'nowrap' }}>{PLAN[p].label}</span>;

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <style>{`
        .cu-table { display: table; }
        .cu-cards { display: none; }
        @media (max-width: 860px) { .cu-table { display: none !important; } .cu-cards { display: grid; } }
        .cu-row:hover { background: var(--slate-50); }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Customers</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>{t ? `${t.customers.toLocaleString()} ${filtered ? 'match the filters' : 'registered customers'}` : '…'}</p>
        </div>
        {perms.export && <ActionButton variant="secondary" onClick={exportCsv}>⬇ Export CSV{filtered ? ' (filtered)' : ''}</ActionButton>}
      </div>

      {t && (
        <StatCards>
          <StatCard theme="slate" value={t.customers} label="Customers" />
          <StatCard theme="teal" value={t.onPlan} label="On a plan now" />
          <StatCard theme="blue" value={t.buyers} label="Bought at least once" />
          <StatCard theme="amber" value={gel(t.spent)} label="Spent in total" />
        </StatCards>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '18px 0 14px' }}>
        <input value={f.search} onChange={(e) => set('search')(e.target.value)} placeholder="Name, email or phone…" aria-label="Search customers"
          style={{ flex: '1 1 220px', minWidth: 0, padding: '9px 12px', fontSize: 13, border: '1px solid var(--slate-200)', borderRadius: 10, outline: 'none', background: 'var(--white)', color: 'var(--slate-900)' }} />
        <Dropdown aria-label="Plan" label="Plan" placeholder="Plan: all" value={f.plan} onChange={set('plan')} options={[{ value: '', label: 'All' }, { value: 'active', label: 'On a plan' }, { value: 'ended', label: 'Lapsed' }, { value: 'none', label: 'Never had one' }]} />
        <Dropdown aria-label="Bought" label="Bought" placeholder="Bought: all" value={f.buyer} onChange={set('buyer')} options={[{ value: '', label: 'All' }, { value: 'yes', label: 'Paid at least once' }, { value: 'no', label: 'Never paid' }]} />
        <Dropdown aria-label="City" label="City" placeholder="City: all" value={f.city} onChange={set('city')} options={[{ value: '', label: 'All' }, ...(data?.cities ?? []).map((c: string) => ({ value: c, label: c }))]} />
        <Dropdown aria-label="Offers" label="Offers" placeholder="Offers: all" value={f.consent} onChange={set('consent')} options={[{ value: '', label: 'All' }, { value: 'email', label: 'Email offers on' }, { value: 'sms', label: 'SMS offers on' }, { value: 'none', label: 'No offers' }]} />
        <Dropdown aria-label="Language" label="Language" placeholder="Language: all" value={f.language} onChange={set('language')} options={[{ value: '', label: 'All' }, { value: 'ka', label: 'Georgian' }, { value: 'en', label: 'English' }]} />
        <Dropdown aria-label="Account" label="Account" placeholder="Account: all" value={f.status} onChange={set('status')} options={[{ value: '', label: 'All' }, { value: 'ACTIVE', label: 'Active' }, { value: 'UNVERIFIED', label: 'Not verified' }, { value: 'BLOCKED', label: 'Blocked' }]} />
        {(data?.tags?.length ?? 0) > 0 && <Dropdown aria-label="Tag" label="Tag" placeholder="Tag: all" value={f.tag} onChange={set('tag')} options={[{ value: '', label: 'All' }, ...data.tags.map((x: string) => ({ value: x, label: x }))]} />}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate-500)' }}>
          Joined <DateInput aria-label="Joined from" value={f.joinedFrom} onChange={(e) => set('joinedFrom')(e.target.value)} emptyLabel="Any time" /> – <DateInput aria-label="Joined to" value={f.joinedTo} onChange={(e) => set('joinedTo')(e.target.value)} emptyLabel="Today" />
        </span>
        <Dropdown aria-label="Sort" icon="↕" value={f.sort} onChange={set('sort')} options={SORTS} />
        {filtered && <button type="button" onClick={() => setF({ ...EMPTY, sort: f.sort })} style={{ border: 'none', background: 'none', color: 'var(--teal-600)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>↺ Clear filters</button>}
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', opacity: loading && data ? 0.6 : 1, transition: 'opacity .15s' }}>
        {!data ? (
          <p style={{ textAlign: 'center', padding: '70px 0', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '70px 0', color: 'var(--slate-400)', fontSize: 13 }}>No customers match.</p>
        ) : (
          <>
            <table className="cu-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Customer', 'Phone', 'City', 'Plan', 'Orders', 'Spent', 'Last order', 'Joined', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="cu-row" onClick={() => setOpenId(c.id)} style={{ borderBottom: '1px solid var(--slate-50)', cursor: 'pointer' }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}{c.status !== 'ACTIVE' && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: c.status === 'BLOCKED' ? 'var(--red-600)' : 'var(--amber-700)' }}>{c.status === 'BLOCKED' ? 'Blocked' : 'Not verified'}</span>}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--slate-400)' }}>{c.email}</div>
                      {c.tags?.length > 0 && <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>{c.tags.map((x: string) => <span key={x} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--teal-700)', background: 'var(--teal-50)', borderRadius: 999, padding: '1px 7px' }}>{x}</span>)}</div>}
                    </td>
                    <td style={{ ...td, color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>{c.phone || '—'}{c.phone && <span title={c.phoneVerified ? 'Confirmed' : 'Not confirmed'} style={{ marginLeft: 4, color: c.phoneVerified ? 'var(--green-700)' : 'var(--amber-600)' }}>{c.phoneVerified ? '✓' : '•'}</span>}</td>
                    <td style={{ ...td, color: 'var(--slate-500)' }}>{c.city || '—'}</td>
                    <td style={td}>{pill(c.plan)}{c.planName && <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>{c.planName}</div>}</td>
                    <td style={{ ...td, fontWeight: 700, color: 'var(--slate-900)' }}>{c.orders}</td>
                    <td style={{ ...td, fontWeight: 700, color: 'var(--slate-900)', whiteSpace: 'nowrap' }}>{gel(c.spent)}</td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>{day(c.lastOrderAt)}</td>
                    <td style={{ ...td, fontSize: 12, color: 'var(--slate-400)', whiteSpace: 'nowrap' }}>{day(c.createdAt)}</td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      {perms.block && <button onClick={() => toggleStatus(c.id, c.status)} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', ...(c.status === 'BLOCKED' ? { background: 'var(--green-50)', color: 'var(--green-800)' } : { background: 'var(--red-50)', color: 'var(--red-600)' }) }}>{c.status === 'BLOCKED' ? 'Unblock' : 'Block'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phones and tablets: one card per customer */}
            <div className="cu-cards" style={{ gap: 0 }}>
              {rows.map((c) => (
                <button key={c.id} type="button" onClick={() => setOpenId(c.id)} style={{ textAlign: 'left', border: 'none', borderBottom: '1px solid var(--slate-100)', background: 'var(--white)', padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: 14 }}>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--slate-900)' }}>{gel(c.spent)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--slate-400)' }}>{c.orders} order{c.orders === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: 'var(--slate-500)' }}>
                    {pill(c.plan)}{c.city && <span>{c.city}</span>}{c.phone && <span>{c.phone}</span>}<span>last order {day(c.lastOrderAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {data && data.total > limit && (
        <div style={{ marginTop: 12 }}>
          <Pagination page={data.page} totalPages={data.pages} pageSize={limit} total={data.total} onPageChange={setPage} onPageSizeChange={setLimit} pageSizeOptions={[25, 50, 100]} />
        </div>
      )}
      {openId && <CustomerDrawer id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}
