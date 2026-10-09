'use client';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ActionButton } from '../../../components/Toolbar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SIZE: Record<string, string> = { EXTRA_SMALL: 'XS', SMALL: 'S', MEDIUM: 'M', LARGE: 'L', EXTRA_LARGE: 'XL' };

type Status = 'TO_PACK' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
const STATUS: Record<Status, { label: string; bg: string; fg: string }> = {
  TO_PACK: { label: 'To pack', bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
  PACKED: { label: 'Packed', bg: 'var(--teal-50)', fg: 'var(--teal-700)' },
  SHIPPED: { label: 'Shipped', bg: 'var(--green-50)', fg: 'var(--green-700)' },
  DELIVERED: { label: 'Delivered', bg: 'var(--green-100)', fg: 'var(--green-800)' },
  CANCELLED: { label: 'Cancelled', bg: 'var(--slate-100)', fg: 'var(--slate-500)' },
};
/** What a selection can be moved to, in the order work happens. */
const ACTIONS: { to: Status; label: string; from: Status[] }[] = [
  { to: 'PACKED', label: 'Mark packed', from: ['TO_PACK'] },
  { to: 'SHIPPED', label: 'Mark shipped', from: ['TO_PACK', 'PACKED'] },
  { to: 'DELIVERED', label: 'Mark delivered', from: ['SHIPPED'] },
  { to: 'TO_PACK', label: 'Back to “to pack”', from: ['PACKED', 'CANCELLED'] },
  { to: 'CANCELLED', label: 'Cancel box', from: ['TO_PACK', 'PACKED'] },
];

const card: CSSProperties = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 14 };
const th: CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 12px', borderBottom: '1px solid var(--slate-100)' };
const td: CSSProperties = { padding: '10px 12px', fontSize: 13, color: 'var(--slate-700)', borderBottom: '1px solid var(--slate-100)', verticalAlign: 'top' };

function Banner({ tone, children }: { tone: 'teal' | 'amber' | 'red'; children: React.ReactNode }) {
  const c = { teal: ['var(--teal-50)', 'var(--teal-200)', 'var(--teal-800)'], amber: ['var(--amber-50)', 'var(--amber-200)', 'var(--amber-800)'], red: ['var(--red-50)', 'var(--red-200)', 'var(--red-700)'] }[tone];
  return <div style={{ background: c[0], border: `1px solid ${c[1]}`, color: c[2], borderRadius: 10, padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>{children}</div>;
}

/**
 * The month's boxes: who gets one, what's in it, where it goes — and the
 * packing → shipped flow that moves each customer's "boxes sent".
 */
export default function MonthlyBoxesPage() {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Status | 'ALL'>('TO_PACK');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');
  const [showPick, setShowPick] = useState(false);

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/box-shipments?year=${ym.year}&month=${ym.month}`, { headers: auth() });
      setData(res.ok ? await res.json() : null);
    } finally {
      setLoading(false);
    }
  }, [ym]);

  useEffect(() => { load(); setSelected(new Set()); }, [load]);

  async function call(path: string, method: string, body: unknown, done: (r: any) => string) {
    setBusy(true); setNotice('');
    try {
      const res = await fetch(`${API}/admin/box-shipments${path}`, { method, headers: auth(), body: JSON.stringify(body) });
      const r = await res.json().catch(() => ({}));
      setNotice(res.ok ? done(r) : (Array.isArray(r.message) ? r.message[0] : r.message) || 'Something went wrong.');
      setSelected(new Set());
      await load();
    } finally {
      setBusy(false);
    }
  }

  const items: any[] = data?.items ?? [];
  const shown = useMemo(() => (filter === 'ALL' ? items : items.filter((i) => i.status === filter)), [items, filter]);
  const selectedRows = items.filter((i) => selected.has(i.id));
  const actions = ACTIONS.filter((a) => selectedRows.length && selectedRows.every((r) => a.from.includes(r.status)));
  const allShownSelected = shown.length > 0 && shown.every((i) => selected.has(i.id));

  const step = (d: number) => setYm(({ year, month }) => {
    const m = month + d;
    return m < 1 ? { year: year - 1, month: 12 } : m > 12 ? { year: year + 1, month: 1 } : { year, month: m };
  });

  function exportCsv() {
    const rows = [['Box', 'Customer', 'Phone', 'City', 'Address', 'Dog', 'Size', 'Allergies', 'Contents', 'Status', 'Tracking']];
    for (const i of shown) {
      const a = i.address, s = i.subscription;
      rows.push([
        `${i.boxNumber}/${s.boxesTotal}`, a ? `${a.firstName} ${a.lastName}` : `${s.user.firstName} ${s.user.lastName}`, a?.phone ?? '', a?.city ?? '',
        a ? [a.addressLine1, a.addressLine2].filter(Boolean).join(', ') : '', s.dog?.name ?? '', SIZE[s.dog?.size] ?? '', (s.dog?.allergies ?? []).join('; '),
        i.campaign?.name ?? '', STATUS[i.status as Status].label, i.trackingNumber ?? '',
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `boxes-${ym.year}-${String(ym.month).padStart(2, '0')}-${filter.toLowerCase()}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveTracking(id: string, value: string, previous: string | null) {
    if ((previous ?? '') === value.trim()) return;
    await fetch(`${API}/admin/box-shipments/${id}/tracking`, { method: 'PATCH', headers: auth(), body: JSON.stringify({ trackingNumber: value }) });
  }

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>📦 Monthly Boxes</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', margin: '4px 0 0' }}>One box per active subscriber each month. Marking a box shipped counts it on the customer’s plan and emails them.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ActionButton variant="secondary" onClick={() => step(-1)}>‹</ActionButton>
          <span style={{ minWidth: 140, textAlign: 'center', fontWeight: 700, color: 'var(--slate-800)' }}>{MONTHS[ym.month - 1]} {ym.year}</span>
          <ActionButton variant="secondary" onClick={() => step(1)}>›</ActionButton>
        </div>
      </div>

      {notice && <Banner tone="teal"><span>{notice}</span><button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button></Banner>}

      {data && data.waiting > 0 && (
        <Banner tone="teal">
          <span><strong>{data.waiting}</strong> subscriber{data.waiting === 1 ? ' is' : 's are'} due a box this month and not on the list yet.</span>
          <ActionButton disabled={busy} onClick={() => call('/add-due', 'POST', ym, (r) => `Added ${r.added} box${r.added === 1 ? '' : 'es'} to ${MONTHS[ym.month - 1]}.`)}>Add to this month</ActionButton>
        </Banner>
      )}
      {data && data.campaigns === 0 && items.length > 0 && (
        <Banner tone="amber">
          <span>No box contents are set for {MONTHS[ym.month - 1]} yet, so there is no pick list.</span>
          <Link href="/dashboard/box-campaigns" style={{ color: 'inherit', fontWeight: 700 }}>Set contents →</Link>
        </Banner>
      )}
      {data && data.campaigns > 0 && data.withoutCampaign > 0 && (
        <Banner tone="amber">
          <span>{data.withoutCampaign} box{data.withoutCampaign === 1 ? ' has' : 'es have'} no contents assigned — probably listed before this month’s contents were set.</span>
          <ActionButton variant="secondary" disabled={busy} onClick={() => call('/refresh-campaigns', 'POST', ym, (r) => `Updated contents for ${r.changed} box${r.changed === 1 ? '' : 'es'}.`)}>Update contents</ActionButton>
        </Banner>
      )}
      {data && data.allergyClashes > 0 && (
        <Banner tone="red"><span><strong>{data.allergyClashes}</strong> box{data.allergyClashes === 1 ? ' contains' : 'es contain'} something the dog is allergic to (marked ⚠ below). Swap those items before packing.</span></Banner>
      )}
      {data && data.shortOfStock > 0 && (
        <Banner tone="amber">
          <span>Not enough stock for {data.shortOfStock} product{data.shortOfStock === 1 ? '' : 's'} in this month’s boxes.</span>
          <ActionButton variant="secondary" onClick={() => setShowPick(true)}>See pick list</ActionButton>
        </Banner>
      )}
      {data && data.cancelledSubscriptions > 0 && (
        <Banner tone="red"><span>{data.cancelledSubscriptions} box{data.cancelledSubscriptions === 1 ? ' belongs' : 'es belong'} to a subscription cancelled after it was listed (marked below). Check your refund policy, then send it or cancel the box.</span></Banner>
      )}
      {data && data.withoutAddress > 0 && (
        <Banner tone="red"><span>{data.withoutAddress} box{data.withoutAddress === 1 ? ' has' : 'es have'} no delivery address. Ask the customer to add one in their account.</span></Banner>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['TO_PACK', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'ALL'] as const).map((st) => {
          const on = filter === st;
          const n = st === 'ALL' ? items.length : data?.counts?.[st] ?? 0;
          return (
            <button key={st} onClick={() => { setFilter(st); setSelected(new Set()); }}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: on ? 'none' : '1px solid var(--slate-200)', background: on ? 'var(--teal-600)' : 'var(--white)', color: on ? 'var(--white)' : 'var(--slate-600)' }}>
              {st === 'ALL' ? 'All' : STATUS[st].label} ({n})
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        {data?.pickList?.length > 0 && <ActionButton variant="secondary" onClick={() => setShowPick((s) => !s)}>{showPick ? 'Hide' : 'Show'} pick list</ActionButton>}
        <ActionButton variant="secondary" onClick={exportCsv} disabled={!shown.length}>Export CSV</ActionButton>
      </div>

      {showPick && (
        <div style={{ ...card, padding: 16 }}>
          <p style={{ margin: '0 0 10px', fontWeight: 700, color: 'var(--slate-800)', fontSize: 14 }}>Pick list — everything needed for the boxes still to pack (packing a box takes its items out of stock)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {data.pickList.map((p: any) => (
              <div key={p.sku} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, background: p.short ? 'var(--red-50)' : 'var(--slate-50)', border: p.short ? '1px solid var(--red-200)' : '1px solid transparent', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                <span>{p.name} <span style={{ color: 'var(--slate-400)', fontSize: 11 }}>{p.sku}</span></span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <strong>× {p.quantity}</strong>
                  <span style={{ display: 'block', fontSize: 11, color: p.short ? 'var(--red-700)' : 'var(--slate-400)', fontWeight: p.short ? 700 : 400 }}>{p.short ? `only ${p.inStock} in stock` : `${p.inStock} in stock`}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedRows.length > 0 && (
        <div style={{ ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 8, zIndex: 5, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
          <strong style={{ fontSize: 13, color: 'var(--slate-800)' }}>{selectedRows.length} selected</strong>
          <span style={{ flex: 1 }} />
          {actions.length === 0 && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>These boxes are at different steps — select boxes with the same status.</span>}
          {actions.map((a) => (
            <ActionButton key={a.to} variant={a.to === 'CANCELLED' || a.to === 'TO_PACK' ? 'secondary' : 'primary'} disabled={busy}
              onClick={() => {
                if (a.to === 'CANCELLED' && !confirm(`Cancel ${selectedRows.length} box${selectedRows.length === 1 ? '' : 'es'}? They won’t be sent this month.`)) return;
                call('/status', 'PATCH', { ids: [...selected], status: a.to }, (r) => `${r.updated} box${r.updated === 1 ? '' : 'es'} marked ${STATUS[a.to].label.toLowerCase()}${r.skipped ? ` · ${r.skipped} skipped` : ''}.`);
              }}>
              {a.label}
            </ActionButton>
          ))}
        </div>
      )}

      <div style={{ ...card, overflowX: 'auto' }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>Loading…</p>
        ) : !shown.length ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>
            {items.length ? 'No boxes with this status.' : data?.waiting ? 'Nothing listed yet — add this month’s subscribers above.' : 'No boxes this month.'}
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 32 }}>
                  <input type="checkbox" aria-label="Select all" checked={allShownSelected}
                    onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((i) => i.id)))} />
                </th>
                <th style={th}>Customer</th><th style={th}>Dog</th><th style={th}>Box</th><th style={th}>Contents</th><th style={th}>Deliver to</th><th style={th}>Status</th><th style={th}>Tracking</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => {
                const s = i.subscription, a = i.address, dog = s.dog, st = STATUS[i.status as Status];
                return (
                  <tr key={i.id} style={{ background: selected.has(i.id) ? 'var(--teal-50)' : undefined }}>
                    <td style={td}>
                      <input type="checkbox" aria-label={`Select box for ${s.user.firstName}`} checked={selected.has(i.id)}
                        onChange={() => setSelected((prev) => { const n = new Set(prev); n.has(i.id) ? n.delete(i.id) : n.add(i.id); return n; })} />
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{s.user.firstName} {s.user.lastName}{s.isGift && <span title="Gift" style={{ marginLeft: 4 }}>🎁</span>}</div>
                      {s.status === 'CANCELLED' && i.status !== 'CANCELLED' && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red-600)' }}>Subscription cancelled</div>}
                      {s.status !== 'CANCELLED' && s.cancelledAt && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber-700)' }}>Last box — customer cancelled</div>}
                      <div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{s.user.email}</div>
                    </td>
                    <td style={td}>
                      {dog ? <>
                        <div>{dog.name}{dog.size && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: 'var(--slate-500)', background: 'var(--slate-100)', borderRadius: 5, padding: '1px 5px' }}>{SIZE[dog.size]}</span>}</div>
                        {dog.allergies?.length > 0 && <div style={{ fontSize: 12, color: 'var(--red-600)', fontWeight: 600 }}>⚠ Allergic: {dog.allergies.join(', ')}</div>}
                        {dog.specialNotes && <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{dog.specialNotes}</div>}
                      </> : <span style={{ color: 'var(--slate-400)' }}>No dog profile</span>}
                    </td>
                    <td style={td}><strong>{i.boxNumber}</strong> of {s.boxesTotal}<div style={{ fontSize: 12, color: 'var(--slate-400)' }}>{s.plan?.name}</div></td>
                    <td style={td}>
                      {i.campaign?.name ?? <span style={{ color: 'var(--amber-700)' }}>Not set</span>}
                      {i.clashes?.map((c: any) => (
                        <div key={c.product} style={{ fontSize: 12, color: 'var(--red-700)', fontWeight: 700, marginTop: 4 }}>⚠ {c.product} contains {c.allergens.join(', ').toLowerCase()} — swap it</div>
                      ))}
                    </td>
                    <td style={td}>
                      {a ? <>
                        <div>{a.firstName} {a.lastName} · {a.phone}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{a.city}, {[a.addressLine1, a.addressLine2].filter(Boolean).join(', ')}</div>
                      </> : <span style={{ color: 'var(--red-600)', fontWeight: 600 }}>No address</span>}
                    </td>
                    <td style={td}><span style={{ background: st.bg, color: st.fg, fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>{st.label}</span></td>
                    <td style={td}>
                      <input defaultValue={i.trackingNumber ?? ''} placeholder="—" aria-label="Tracking number"
                        onBlur={(e) => saveTracking(i.id, e.target.value, i.trackingNumber)}
                        style={{ width: 130, border: '1px solid var(--slate-200)', borderRadius: 7, padding: '5px 8px', fontSize: 12, background: 'var(--white)', color: 'var(--slate-800)' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
