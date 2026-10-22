'use client';
import { Select } from '@/components/Dropdown';
import { useCallback, useEffect, useState } from 'react';
import CustomerDrawer from '@/components/CustomerDrawer';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SIZE: Record<string, string> = { EXTRA_SMALL: 'Extra small', SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large', EXTRA_LARGE: 'Extra large', UNKNOWN: 'Not given' };
const PLAN: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'On a plan', color: 'var(--green-800)', bg: 'var(--green-50)' },
  ended: { label: 'Lapsed', color: 'var(--amber-700)', bg: 'var(--amber-50)' },
  none: { label: 'Never subscribed', color: 'var(--slate-600)', bg: 'var(--slate-100)' },
};
const ALLERGIES = ['chicken', 'beef', 'lamb', 'fish', 'wheat', 'dairy', 'soy', 'egg'];

type Filters = { search: string; size: string; breed: string; allergy: string; plan: string; consent: string; birthdayWithin: string; photo: string };
const EMPTY: Filters = { search: '', size: '', breed: '', allergy: '', plan: '', consent: '', birthdayWithin: '', photo: '' };

/** Ready-made segments for the usual retention campaigns. */
const SEGMENTS: { label: string; f: Partial<Filters> }[] = [
  { label: '🎂 Birthdays in 30 days', f: { birthdayWithin: '30', consent: 'yes' } },
  { label: '🔁 Lapsed — win back', f: { plan: 'ended', consent: 'yes' } },
  { label: '🌱 Never subscribed', f: { plan: 'none', consent: 'yes' } },
  { label: '💚 Active subscribers', f: { plan: 'active' } },
];

const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const can = (perm: string) => {
  try { return (JSON.parse(atob((localStorage.getItem('admin_token') || '').split('.')[1])).permissions ?? []).includes(perm); } catch { return false; }
};

/**
 * Customers' dogs for retention and CRM: who's on a plan, who lapsed, whose
 * birthday is coming, and which owners agreed to marketing. Campaign lists
 * export as CSV (with the "Export CRM lists" permission).
 */
export default function CrmPage() {
  const [f, setF] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [canExport, setCanExport] = useState(false);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` });
  const qs = (x: Filters, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(extra);
    Object.entries(x).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
  };

  const load = useCallback(async (x: Filters, pg: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/crm/dogs?${qs(x, { page: String(pg), limit: '50' })}`, { headers: headers() });
      if (res.ok) { const d = await res.json(); setRows(d.items); setTotal(d.total); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setCanExport(can('crm.export'));
    fetch(`${API}/admin/crm/summary`, { headers: headers() }).then(r => (r.ok ? r.json() : null)).then(setSummary).catch(() => {});
  }, []);
  useEffect(() => { load(applied, page); }, [applied, page, load]);

  const apply = (x: Filters) => { setF(x); setApplied(x); setPage(1); };

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`${API}/admin/crm/dogs/export?${qs(applied)}`, { headers: headers() });
      if (!res.ok) { alert(res.status === 403 ? 'Your role can’t export CRM lists.' : 'Export failed.'); return; }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `pupbox-dogs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  const sel: React.CSSProperties = { border: '1px solid var(--slate-200)', borderRadius: 10, padding: '8px 10px', fontSize: 13, background: 'var(--white)', color: 'var(--slate-800)' };
  const card = (label: string, value: any, sub?: string, onClick?: () => void) => (
    <button type="button" onClick={onClick} disabled={!onClick} style={{ textAlign: 'left', background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 14, padding: '14px 16px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--slate-900)' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--slate-400)' }}>{sub}</div>}
    </button>
  );
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>🐶 Dogs & CRM</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>Every dog customers told us about — for retention and campaigns. Contact only owners with marketing consent.</p>
        </div>
        {canExport && (
          <button onClick={exportCsv} disabled={exporting} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: exporting ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            {exporting ? 'Exporting…' : `⬇ Export ${total} as CSV`}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        {card('Dogs', summary?.dogs, summary ? `${summary.owners} owners · ${summary.withPhoto} with photo` : undefined, () => apply(EMPTY))}
        {card('On a plan', summary?.onPlan, summary?.leavingThisMonth ? `${summary.leavingThisMonth} leaving this month` : 'active or paused', () => apply({ ...EMPTY, plan: 'active' }))}
        {card('Never subscribed', summary?.neverSubscribed, 'conversion targets', () => apply({ ...EMPTY, plan: 'none' }))}
        {card('Lapsed', summary?.lapsed, 'win-back targets', () => apply({ ...EMPTY, plan: 'ended' }))}
        {card('Birthdays', summary?.birthdaysNext30, 'in the next 30 days', () => apply({ ...EMPTY, birthdayWithin: '30' }))}
        {card('Marketing OK', summary ? `${summary.ownersWithConsent}/${summary.owners}` : undefined, 'owners who agreed', () => apply({ ...EMPTY, consent: 'yes' }))}
      </div>

      {summary?.topBreeds?.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '0 0 14px' }}>
          Top breeds: {summary.topBreeds.map((b: any) => (
            <button key={b.breed} onClick={() => apply({ ...EMPTY, breed: b.breed })} style={{ background: 'none', border: 'none', color: 'var(--teal-700)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>{b.breed} ({b.n})</button>
          ))}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {SEGMENTS.map(s => (
          <button key={s.label} onClick={() => apply({ ...EMPTY, ...s.f })} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-600)', cursor: 'pointer' }}>{s.label}</button>
        ))}
      </div>

      <form onSubmit={e => { e.preventDefault(); apply(f); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input value={f.search} onChange={e => setF({ ...f, search: e.target.value })} placeholder="Dog, owner, email or phone…" style={{ ...sel, minWidth: 220 }} />
        <Select value={f.size} onChange={e => setF({ ...f, size: e.target.value })} style={sel}><option value="">Any size</option>{Object.entries(SIZE).filter(([k]) => k !== 'UNKNOWN').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <input value={f.breed} onChange={e => setF({ ...f, breed: e.target.value })} placeholder="Breed" style={{ ...sel, width: 120 }} />
        <Select value={f.allergy} onChange={e => setF({ ...f, allergy: e.target.value })} style={sel}><option value="">Any allergy</option>{ALLERGIES.map(a => <option key={a} value={a}>{a}</option>)}</Select>
        <Select value={f.plan} onChange={e => setF({ ...f, plan: e.target.value })} style={sel}><option value="">Any plan status</option><option value="active">On a plan</option><option value="ended">Lapsed</option><option value="none">Never subscribed</option></Select>
        <Select value={f.birthdayWithin} onChange={e => setF({ ...f, birthdayWithin: e.target.value })} style={sel}><option value="">Any birthday</option><option value="7">Birthday in 7 days</option><option value="30">in 30 days</option><option value="90">in 90 days</option></Select>
        <Select value={f.consent} onChange={e => setF({ ...f, consent: e.target.value })} style={sel}><option value="">Any consent</option><option value="yes">Marketing OK</option><option value="no">No consent</option></Select>
        <Select value={f.photo} onChange={e => setF({ ...f, photo: e.target.value })} style={sel}><option value="">Photo or not</option><option value="yes">Has photo</option><option value="no">No photo</option></Select>
        <button type="submit" style={{ background: 'var(--slate-900)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Apply</button>
        <button type="button" onClick={() => apply(EMPTY)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', fontSize: 12, cursor: 'pointer' }}>Clear</button>
        <span style={{ fontSize: 12, color: 'var(--slate-400)', marginLeft: 'auto' }}>{total} dogs</span>
      </form>

      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'auto' }}>
        {loading ? <p style={{ padding: 60, textAlign: 'center', color: 'var(--slate-400)' }}>Loading…</p> : rows.length === 0 ? (
          <p style={{ padding: 60, textAlign: 'center', color: 'var(--slate-400)' }}>No dogs match.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>{['Dog', 'Details', 'Birthday', 'Plan', 'Owner', 'Marketing'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(d => {
                const p = PLAN[d.planStatus];
                return (
                  <tr key={d.id} onClick={() => setOpenId(d.user.id)} style={{ borderBottom: '1px solid var(--slate-100)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-50)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: 'var(--teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {d.photoUrl ? <img src={d.photoUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover' }} /> : '🐶'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{d.name}{d.forGift && <span title="Gift dog" style={{ marginLeft: 4 }}>🎁</span>}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--slate-400)' }}>{d.breed || 'breed not given'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--slate-600)' }}>
                      {SIZE[d.size ?? 'UNKNOWN']}{d.ageYears !== null ? ` · ${d.ageYears} y` : ''}{d.weightKg ? ` · ${d.weightKg} kg` : ''}
                      {d.allergies?.length > 0 && <div style={{ color: 'var(--red-600)', fontWeight: 600 }}>⚠ {d.allergies.join(', ')}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--slate-600)' }}>
                      {d.birthday ? <>{day(d.birthday)}{d.daysToBirthday !== null && d.daysToBirthday <= 30 && <div style={{ color: 'var(--purple-800)', fontWeight: 700 }}>🎂 {d.daysToBirthday === 0 ? 'today!' : `in ${d.daysToBirthday} days`}</div>}</> : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: p.bg, color: p.color }}>{p.label}</span>
                      {d.planName && <div style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 3 }}>{d.planName}{d.leaving ? ' · leaving' : d.planEnds ? ` · ends ${day(d.planEnds)}` : ''}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5 }}>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{d.user.firstName} {d.user.lastName}</div>
                      <div style={{ color: 'var(--slate-400)' }}>{d.user.email}</div>
                      <div style={{ color: 'var(--slate-400)' }}>{d.user.phone}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: d.user.marketingConsent ? 'var(--green-800)' : 'var(--slate-400)', fontWeight: d.user.marketingConsent ? 700 : 400 }}>{d.user.marketingConsent ? '✓ Yes' : 'No'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 14, fontSize: 13 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...sel, cursor: 'pointer' }}>← Previous</button>
          <span style={{ color: 'var(--slate-500)' }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} style={{ ...sel, cursor: 'pointer' }}>Next →</button>
        </div>
      )}

      {openId && <CustomerDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
