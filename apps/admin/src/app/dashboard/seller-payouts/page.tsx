'use client';
import { Fragment, useEffect, useState } from 'react';
import ErrorPopup from '@/components/ErrorPopup';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const money = (n: number) => `₾${Number(n || 0).toFixed(2)}`;
const day = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Quick spans for the date filter. */
function preset(k: 'this' | 'last' | 'all') {
  const now = new Date();
  if (k === 'all') return { from: '', to: '' };
  const m = k === 'this' ? now.getMonth() : now.getMonth() - 1;
  return { from: iso(new Date(now.getFullYear(), m, 1)), to: iso(new Date(now.getFullYear(), m + 1, 0)) };
}

const STATE: Record<string, { label: string; bg: string; color: string }> = {
  due: { label: 'Due', bg: 'var(--amber-50, #fffbeb)', color: 'var(--amber-700, #b45309)' },
  upcoming: { label: 'On the way', bg: 'var(--blue-50)', color: 'var(--blue-600)' },
  paid: { label: 'Paid', bg: 'var(--green-50)', color: 'var(--green-800)' },
};

/**
 * What we owe each seller. A line becomes due once its order is delivered;
 * paid / on-the-way / cancelled orders are kept apart. "Mark paid" settles
 * every due line in the chosen dates, so a line is never paid twice.
 */
export default function SellerPayoutsPage() {
  const [range, setRange] = useState(preset('all'));
  const [data, setData] = useState<{ rows: any[]; totals: any } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [lines, setLines] = useState<any[] | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [popup, setPopup] = useState<string[]>([]);
  const [done, setDone] = useState('');
  const token = () => localStorage.getItem('admin_token') || '';
  const q = (extra: Record<string, string> = {}) => new URLSearchParams({ ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}), ...extra }).toString();

  async function get(path: string) {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.message || `Error ${res.status}`);
    return d;
  }

  async function load() {
    try {
      const [s, h] = await Promise.all([get(`/admin/seller-payouts/summary?${q()}`), get('/admin/seller-payouts')]);
      setData(s); setHistory(h);
      if (open) setLines(await get(`/admin/seller-payouts/lines?${q({ sellerId: open })}`));
    } catch (e: any) { setPopup([e.message]); }
  }
  useEffect(() => { load(); }, [range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(id: string) {
    if (open === id) { setOpen(null); setLines(null); return; }
    setOpen(id); setLines(null);
    try { setLines(await get(`/admin/seller-payouts/lines?${q({ sellerId: id })}`)); } catch (e: any) { setPopup([e.message]); }
  }

  async function pay(row: any) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/admin/seller-payouts`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId: row.seller.id, ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}), note }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(Array.isArray(d.message) ? d.message.join(' ') : d.message || 'Could not record the payout');
      setPaying(null); setNote('');
      setDone(`Recorded ${money(d.amount)} paid to ${row.seller.name} (${d.lines} line${d.lines === 1 ? '' : 's'}).`);
      setTimeout(() => setDone(''), 5000);
      await load();
    } catch (e: any) { setPopup([e.message]); }
    finally { setBusy(false); }
  }

  async function csv() {
    const res = await fetch(`${API}/admin/seller-payouts/lines.csv?${q(open ? { sellerId: open } : {})}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) { setPopup([`Download failed (error ${res.status}).`]); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = `seller-payouts${range.from ? `-${range.from}` : ''}${range.to ? `_${range.to}` : ''}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '12px 14px', color: 'var(--slate-600)', whiteSpace: 'nowrap' };
  const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
  const card: React.CSSProperties = { background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)' };
  const inp: React.CSSProperties = { border: '1px solid var(--slate-200)', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--slate-50)', color: 'var(--slate-800)' };
  const chip = (on: boolean): React.CSSProperties => ({ fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? 'var(--teal-50, #f0fdfa)' : 'var(--slate-100)', color: on ? 'var(--teal-700, #0f766e)' : 'var(--slate-500)' });
  const T = data?.totals;
  const which = (['this', 'last', 'all'] as const).find((k) => { const p = preset(k); return p.from === range.from && p.to === range.to; });

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Seller payouts</h1>
          <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4, maxWidth: 640 }}>
            What we owe each seller: their price × units sold. A line is <b>due</b> once its order is delivered; orders still on their way are shown apart, and cancelled or refunded ones owe nothing.
          </p>
        </div>
        <button onClick={csv} style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          ⬇ Export CSV{open ? ' (this seller)' : ''}
        </button>
      </div>

      <ErrorPopup errors={popup} onClose={() => setPopup([])} />

      {/* Dates */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button style={chip(which === 'this')} onClick={() => setRange(preset('this'))}>This month</button>
        <button style={chip(which === 'last')} onClick={() => setRange(preset('last'))}>Last month</button>
        <button style={chip(which === 'all')} onClick={() => setRange(preset('all'))}>All time</button>
        <span style={{ width: 1, height: 22, background: 'var(--slate-200)', margin: '0 4px' }} />
        <input type="date" aria-label="From" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} style={inp} />
        <span style={{ color: 'var(--slate-400)', fontSize: 13 }}>→</span>
        <input type="date" aria-label="To" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} style={inp} />
        <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>by order date</span>
      </div>

      {done && <div style={{ background: 'var(--green-50)', color: 'var(--green-800)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>✓ {done}</div>}

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'Due now', value: T?.due, hint: 'delivered, not paid yet', color: 'var(--amber-700, #b45309)' },
          { label: 'On the way', value: T?.upcoming, hint: 'due once delivered', color: 'var(--blue-600)' },
          { label: 'Paid', value: T?.paid, hint: 'settled by payouts', color: 'var(--green-800)' },
          { label: 'Our margin', value: T?.margin, hint: T ? `from ${money(T.sales)} sold · ${T.units} units` : '', color: 'var(--teal-700, #0f766e)' },
        ].map((x) => (
          <div key={x.label} style={{ ...card, padding: '14px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{x.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: x.color, margin: '6px 0 2px', fontVariantNumeric: 'tabular-nums' }}>{data ? money(x.value) : '…'}</p>
            <p style={{ fontSize: 11.5, color: 'var(--slate-400)', margin: 0 }}>{x.hint}</p>
          </div>
        ))}
      </div>

      {/* Per seller */}
      <div style={{ ...card, overflowX: 'auto', marginBottom: 26 }}>
        {!data ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>Loading…</p>
        ) : data.rows.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--slate-400)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏪</div>
            <p style={{ fontSize: 13 }}>No seller items were sold in these dates.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={th}>Seller</th>
              {['Units', 'Customers paid', 'Seller’s share', 'Our margin', 'Due now', 'On the way', 'Paid'].map((h) => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
              <th style={th} />
            </tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <Fragment key={r.seller.id}>
                  <tr style={{ borderBottom: '1px solid var(--slate-50)', background: open === r.seller.id ? 'var(--slate-50)' : undefined }}>
                    <td style={td}>
                      <button onClick={() => toggle(r.seller.id)} title="Show the lines" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left' }}>
                        <span style={{ fontSize: 10, color: 'var(--slate-400)', transform: open === r.seller.id ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--slate-100)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {r.seller.logoUrl ? <img src={r.seller.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏪'}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{r.seller.name}</span>
                      </button>
                    </td>
                    <td style={num}>{r.units}</td>
                    <td style={num}>{money(r.sales)}</td>
                    <td style={num}>{money(r.share)}</td>
                    <td style={{ ...num, color: 'var(--teal-700, #0f766e)', fontWeight: 600 }}>{money(r.margin)}</td>
                    <td style={{ ...num, color: r.due ? 'var(--amber-700, #b45309)' : 'var(--slate-400)', fontWeight: 700 }}>{money(r.due)}</td>
                    <td style={num}>{money(r.upcoming)}</td>
                    <td style={num}>{money(r.paid)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {r.due > 0 && paying !== r.seller.id && (
                        <button onClick={() => { setPaying(r.seller.id); setNote(''); }} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, background: 'var(--teal-50, #f0fdfa)', color: 'var(--teal-700, #0f766e)', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                          Mark {money(r.due)} paid
                        </button>
                      )}
                    </td>
                  </tr>
                  {paying === r.seller.id && (
                    <tr><td colSpan={9} style={{ padding: '12px 14px', background: 'var(--slate-50)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: 'var(--slate-700)' }}>
                          Record <b>{money(r.due)}</b> paid to <b>{r.seller.name}</b> for {r.dueLines} delivered line{r.dueLines === 1 ? '' : 's'}{range.from || range.to ? ` (${range.from || 'start'} → ${range.to || 'today'})` : ''}?
                        </span>
                        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note: bank reference… (optional)" style={{ ...inp, flex: '1 1 220px' }} />
                        <button disabled={busy} onClick={() => pay(r)} style={{ background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Confirm'}</button>
                        <button onClick={() => setPaying(null)} style={{ background: 'var(--slate-100)', color: 'var(--slate-500)', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </td></tr>
                  )}
                  {open === r.seller.id && (
                    <tr><td colSpan={9} style={{ padding: 0, background: 'var(--slate-50)' }}>
                      {!lines ? <p style={{ padding: 16, fontSize: 12.5, color: 'var(--slate-400)', margin: 0 }}>Loading…</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                          <thead><tr>
                            {['Order', 'Date', 'Item', 'Qty', 'Seller price', 'Seller’s share', 'Customer paid', 'Our margin', 'State'].map((h, i) => <th key={h} style={{ ...th, background: 'transparent', textAlign: i >= 3 && i <= 7 ? 'right' : 'left' }}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {lines.map((l) => (
                              <tr key={l.id} style={{ borderTop: '1px solid var(--slate-100)' }}>
                                <td style={td}><a href={`/dashboard/orders/${l.orderId}`} style={{ color: 'var(--teal-700, #0f766e)', fontWeight: 600, textDecoration: 'none', fontFamily: 'monospace' }}>#{l.order}</a></td>
                                <td style={td}>{day(l.date)}</td>
                                <td style={{ ...td, whiteSpace: 'normal' }}>{l.name}{l.choice && <span style={{ color: 'var(--slate-400)' }}> · {l.choice}</span>}</td>
                                <td style={num}>{l.quantity}</td>
                                <td style={num}>{money(l.sellerPrice)}</td>
                                <td style={{ ...num, fontWeight: 600 }}>{money(l.share)}</td>
                                <td style={num}>{money(l.sales)}</td>
                                <td style={num}>{money(l.margin)}</td>
                                <td style={td}>
                                  <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: STATE[l.state].bg, color: STATE[l.state].color }}>{STATE[l.state].label}</span>
                                  {l.paidAt && <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 6 }}>{day(l.paidAt)}</span>}
                                  {l.state === 'upcoming' && <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 6 }}>{l.orderStatus.toLowerCase()}</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            <tfoot><tr style={{ borderTop: '1px solid var(--slate-200b)' }}>
              <td style={{ ...td, fontWeight: 700, color: 'var(--slate-800)' }}>Total</td>
              <td style={{ ...num, fontWeight: 700 }}>{T.units}</td>
              <td style={{ ...num, fontWeight: 700 }}>{money(T.sales)}</td>
              <td style={{ ...num, fontWeight: 700 }}>{money(T.share)}</td>
              <td style={{ ...num, fontWeight: 700 }}>{money(T.margin)}</td>
              <td style={{ ...num, fontWeight: 700 }}>{money(T.due)}</td>
              <td style={{ ...num, fontWeight: 700 }}>{money(T.upcoming)}</td>
              <td style={{ ...num, fontWeight: 700 }}>{money(T.paid)}</td>
              <td style={td} />
            </tr></tfoot>
          </table>
        )}
      </div>

      {/* History */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 10px' }}>Payouts made</h2>
      <div style={{ ...card, overflowX: 'auto' }}>
        {history.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13, margin: 0 }}>No payouts recorded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Paid on', 'Seller', 'Amount', 'Lines', 'Order dates', 'Note'].map((h) => <th key={h} style={{ ...th, textAlign: h === 'Amount' || h === 'Lines' ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--slate-50)' }}>
                  <td style={td}>{day(p.paidAt)}</td>
                  <td style={{ ...td, fontWeight: 600, color: 'var(--slate-800)' }}>{p.seller?.name}</td>
                  <td style={{ ...num, fontWeight: 700 }}>{money(Number(p.amount))}</td>
                  <td style={num}>{p._count?.items ?? 0}</td>
                  <td style={td}>{p.periodFrom || p.periodTo ? `${p.periodFrom ? day(p.periodFrom) : 'start'} → ${p.periodTo ? day(new Date(new Date(p.periodTo).getTime() - 86400000)) : 'payout day'}` : 'everything due'}</td>
                  <td style={{ ...td, whiteSpace: 'normal', color: 'var(--slate-500)' }}>{p.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
