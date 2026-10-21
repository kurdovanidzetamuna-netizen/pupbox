'use client';
import MapLink from '@/components/MapLink';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ChoiceNote from '../../../../components/ChoiceNote';
import { API, authHeaders, jsonHeaders, apiError, money, STATUS_FLOW, STATUS_LABEL, EDITABLE, StatusBadge, TypeBadge, RefundDueBadge, Thumb } from '../_lib';
import OrderEditor from './OrderEditor';

/** The button for each move, and what it does — said before it happens. */
const MOVE: Record<string, { verb: string; help: string; tone?: 'danger' | 'back' }> = {
  PAID: { verb: 'Back to To pack', help: 'Undo — back to waiting to be packed.', tone: 'back' },
  PROCESSING: { verb: 'Start preparing', help: 'Being prepared now.' },
  PACKED: { verb: 'Mark as packed', help: 'Packed, waiting for the courier.' },
  SHIPPED: { verb: 'Hand to courier', help: 'Shipped — the customer gets an email with the tracking number.' },
  DELIVERED: { verb: 'Mark as delivered', help: 'Arrived at the customer.' },
  CANCELLED: { verb: 'Cancel order', help: 'Stock goes back on sale. If it was paid, it shows “Refund due” until you record the refund.', tone: 'danger' },
  REFUNDED: { verb: 'Record refund', help: 'Record a refund you made in the payment provider’s portal.', tone: 'danger' },
};

const box = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 16, padding: 16 } as const;
const title = { fontSize: 11, fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 };
const field = { border: '1.5px solid var(--slate-200)', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--white)', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
const pillBtn = (kind: 'primary' | 'soft' | 'danger' | 'back' = 'soft') => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: kind === 'primary' ? '10px 16px' : '8px 12px', borderRadius: 11,
  fontSize: kind === 'primary' ? 14 : 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  border: kind === 'primary' ? 'none' : `1.5px solid ${kind === 'danger' ? 'var(--red-200)' : 'var(--slate-200)'}`,
  background: kind === 'primary' ? 'var(--teal-600)' : 'var(--white)', color: kind === 'primary' ? 'var(--white)' : kind === 'danger' ? 'var(--red-600)' : 'var(--slate-700)',
  boxShadow: kind === 'primary' ? '0 8px 18px -10px rgba(13,148,136,.9)' : 'none',
});

/**
 * One order, opened from the list, as its own page: what it is and where it
 * stands up top, with the next step as one big button (and the other moves
 * beside it); then two columns — what's in it and the money, and who it's
 * for and where it goes. Notes read as a timeline. Edit opens the editor in
 * place. Esc closes (or leaves the editor). Full screen on phones.
 */
export default function OrderDrawer({ order: initial, categories, onClose, onChanged, startEditing = false }: any) {
  const [order, setOrder] = useState<any>(initial);
  const [editing, setEditing] = useState<boolean>(startEditing && EDITABLE.includes(initial.status));
  const [ask, setAsk] = useState<null | 'CANCELLED' | 'REFUNDED' | 'refund'>(null);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [tracking, setTracking] = useState(initial.trackingNumber || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  async function reload() {
    const r = await fetch(`${API}/orders/admin/${initial.id}`, { headers: authHeaders() });
    if (r.ok) { const o = await r.json(); setOrder(o); setTracking(o.trackingNumber || ''); }
  }
  // The list has the latest payment only; the full order has every refund too.
  useEffect(() => { reload(); }, [initial.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc: closes a question first, then the page. The editor handles its own.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || editing) return;
      if (ask) { setAsk(null); return; }
      onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, editing, ask]);

  const next: string[] = order.allowedNext ?? [];
  const paidPayment = order.payments?.find((p: any) => p.status === 'PAID');
  const forward = next.filter((s) => STATUS_FLOW.indexOf(s) > STATUS_FLOW.indexOf(order.status));
  const main = forward.sort((a, b) => STATUS_FLOW.indexOf(a) - STATUS_FLOW.indexOf(b))[0] ?? (next.includes('REFUNDED') ? 'REFUNDED' : undefined);
  const others = next.filter((s) => s !== main);
  const flash = (m: string) => { setSaved(m); setTimeout(() => setSaved(''), 2200); };

  async function move(to: string) {
    if (to === 'CANCELLED' || to === 'REFUNDED') {
      setAsk(to as any); setReason('');
      setAmount((Number(order.refundDueValue) || Number(paidPayment?.amount ?? order.total)).toFixed(2));
      return;
    }
    await send({ status: to });
  }
  async function send(body: any) {
    setBusy(true); setError('');
    const r = await fetch(`${API}/orders/admin/${order.id}/status`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(apiError(d)); return; }
    setOrder(d); setAsk(null); onChanged(); flash(`Now: ${STATUS_LABEL[d.status] ?? d.status}`);
  }
  async function recordRefund() {
    setBusy(true); setError('');
    const r = await fetch(`${API}/orders/admin/${order.id}/refund`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ amount: Number(amount.replace(',', '.')), ...(reason.trim() ? { reason: reason.trim() } : {}) }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(apiError(d)); return; }
    setOrder(d); setAsk(null); onChanged(); flash('Refund recorded');
  }
  async function saveTracking(extraNote?: string) {
    setBusy(true);
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const notes = extraNote ? [order.internalNotes, `${stamp}: ${extraNote}`].filter(Boolean).join('\n') : order.internalNotes;
    await fetch(`${API}/orders/admin/${order.id}/tracking`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ trackingNumber: tracking, internalNotes: notes ?? '' }) });
    setBusy(false); setNote(''); await reload(); onChanged(); flash(extraNote ? 'Note added' : 'Tracking saved');
  }

  const addr = order.address;
  const step = STATUS_FLOW.indexOf(order.status);
  const notes = String(order.internalNotes || '').split('\n').filter(Boolean).reverse();
  const shortNo = (order.orderNumber || order.id).slice(-8).toUpperCase();

  return (
    <>
      <div onClick={() => !editing && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 50, backdropFilter: 'blur(2px)' }} />
      <section role="dialog" aria-modal="true" aria-label={`Order ${shortNo}`}
        style={{ position: 'fixed', top: 0, right: 0, width: 'min(860px, 100vw)', height: '100%', background: 'var(--slate-50)', zIndex: 51, overflowY: 'auto', boxShadow: '-12px 0 48px rgba(15,23,42,0.18)', animation: 'odIn .22s ease-out' }}>
        <style>{'@keyframes odIn{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}'}</style>

        {/* Header */}
        <header style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--white)', borderBottom: '1px solid var(--slate-200b)', padding: '12px clamp(14px, 3vw, 24px)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 260px', minWidth: 0 }}>
            <button onClick={() => (editing ? setEditing(false) : onClose())} aria-label={editing ? 'Back to order' : 'Close'} title={editing ? 'Back (Esc)' : 'Close (Esc)'}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--slate-200)', background: 'var(--white)', cursor: 'pointer', fontSize: 16, color: 'var(--slate-600)', flexShrink: 0 }}>{editing ? '←' : '✕'}</button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 17, color: 'var(--slate-900)', fontFamily: 'monospace' }}>#{shortNo}</strong>
                <StatusBadge status={order.status} />{order.refundDue && <RefundDueBadge />}
                <TypeBadge type={order.type} />
                {order.isGift && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-700)', background: 'var(--violet-50)', borderRadius: 99, padding: '2px 8px' }}>🎁 Gift</span>}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--slate-400)' }}>{new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {money(order.total)}</p>
            </div>
          </div>
          {!editing && (
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {EDITABLE.includes(order.status) && <button onClick={() => setEditing(true)} style={pillBtn('soft')}>✎ Edit</button>}
              <Link href={`/dashboard/orders/${order.id}/invoice`} target="_blank" style={{ ...pillBtn('soft'), textDecoration: 'none' }}>🧾 Invoice</Link>
            </div>
          )}
        </header>

        {editing ? (
          <div style={{ padding: 'clamp(14px, 3vw, 24px)' }}>
            <OrderEditor orderId={order.id} categories={categories} onCancel={() => setEditing(false)}
              onDone={(o: any) => { setOrder(o); setEditing(false); onChanged(); flash('Order updated'); }} />
          </div>
        ) : (
          <div style={{ padding: 'clamp(14px, 3vw, 24px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {saved && <div role="status" style={{ alignSelf: 'center', background: 'var(--slate-900)', color: 'var(--white)', fontSize: 13, fontWeight: 700, padding: '8px 14px', borderRadius: 99, animation: 'odIn .2s' }}>✓ {saved}</div>}

            {/* Where it stands, and the next step */}
            <div style={{ ...box, padding: 18 }}>
              {step >= 0 && (
                <ol aria-label="Progress" style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUS_FLOW.length}, minmax(0, 1fr))`, gap: 4, listStyle: 'none', margin: '0 0 16px', padding: 0 }}>
                  {STATUS_FLOW.map((s, i) => (
                    <li key={s} aria-current={i === step ? 'step' : undefined} style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', height: 6, borderRadius: 99, background: i <= step ? 'var(--teal-500)' : 'var(--slate-200)' }} />
                      <span style={{ display: 'block', marginTop: 6, fontSize: 10.5, fontWeight: i === step ? 800 : 600, color: i === step ? 'var(--slate-900)' : i < step ? 'var(--teal-700)' : 'var(--slate-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i < step ? '✓ ' : ''}{STATUS_LABEL[s]}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              {order.refundDue && (
                <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--red-700)', background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span><strong>Refund due {money(order.refundDueValue)}.</strong> Pay it back in the payment provider’s portal, then record it.</span>
                  <button onClick={() => { setAsk('refund'); setAmount(Number(order.refundDueValue).toFixed(2)); setReason(''); }} style={{ ...pillBtn('primary'), background: 'var(--red-600)', boxShadow: 'none', padding: '8px 12px', fontSize: 12.5 }}>Record refund</button>
                </div>
              )}

              {next.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>
                  {order.status === 'PENDING' ? 'Waiting for the customer to pay.' : `This order is ${(STATUS_LABEL[order.status] ?? order.status).toLowerCase()} — nothing more to do.`}
                </p>
              ) : ask === 'CANCELLED' || ask === 'REFUNDED' || ask === 'refund' ? (
                <div style={{ background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 12, padding: 14, display: 'grid', gap: 10 }}>
                  <strong style={{ fontSize: 14, color: 'var(--red-700)' }}>{ask === 'CANCELLED' ? 'Cancel this order?' : 'Record a refund'}</strong>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--slate-600)' }}>
                    {ask === 'CANCELLED' ? (paidPayment ? 'It’s paid: products go back into stock, any plan it started is cancelled, and it shows “Refund due” until you record the refund.' : 'Its products go back on sale.') : 'Enter what you returned in the payment provider’s portal.'}
                  </p>
                  {ask !== 'CANCELLED' && (
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', display: 'grid', gap: 4 }}>Amount (₾)
                      <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" style={field} />
                    </label>
                  )}
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional, kept on the order)" style={field} autoFocus />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button onClick={() => setAsk(null)} style={pillBtn('soft')}>Keep as is</button>
                    <button disabled={busy} onClick={() => (ask === 'refund' ? recordRefund() : send({ status: ask, ...(reason.trim() ? { reason: reason.trim() } : {}), ...(ask === 'REFUNDED' ? { refundAmount: Number(amount.replace(',', '.')) } : {}) }))}
                      style={{ ...pillBtn('primary'), background: 'var(--red-600)', boxShadow: 'none' }}>{busy ? '…' : ask === 'CANCELLED' ? 'Yes, cancel order' : 'Record refund'}</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {main && (
                    <button disabled={busy} onClick={() => move(main)} style={{ ...pillBtn(MOVE[main]?.tone === 'danger' ? 'danger' : 'primary'), flex: '1 1 200px' }}>
                      {busy ? '…' : <>{MOVE[main]?.verb ?? STATUS_LABEL[main]} →</>}
                    </button>
                  )}
                  {others.map((s) => (
                    <button key={s} disabled={busy} onClick={() => move(s)} title={MOVE[s]?.help} style={pillBtn(MOVE[s]?.tone === 'danger' ? 'danger' : 'soft')}>
                      {MOVE[s]?.tone === 'back' ? '↩ ' : ''}{MOVE[s]?.verb ?? STATUS_LABEL[s]}
                    </button>
                  ))}
                  {main && <p style={{ flexBasis: '100%', margin: '2px 0 0', fontSize: 12, color: 'var(--slate-500)' }}>{MOVE[main]?.help}</p>}
                </div>
              )}
              {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--red-600)' }}>{error}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 14, alignItems: 'start' }}>
              {/* Left: what's in it and the money */}
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={box}>
                  <p style={title}>📦 Items · {order.items?.length || 0}</p>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {(order.items || []).map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Thumb item={item} size={44} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: 'var(--slate-800)', margin: 0, fontSize: 13.5 }}>{item.name}</p>
                          <ChoiceNote choice={item.personalisation} />
                          <p style={{ fontSize: 11.5, color: 'var(--slate-400)', margin: '2px 0 0' }}>{item.quantity} × {money(item.price)}{item.sku ? ` · ${item.sku}` : ''}</p>
                        </div>
                        <strong style={{ fontSize: 13.5, color: 'var(--slate-900)' }}>{money(item.total)}</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--slate-200)', display: 'grid', gap: 4, fontSize: 12.5, color: 'var(--slate-600)' }}>
                    <Line k="Items" v={money(order.subtotal)} />
                    {Number(order.discountAmount) > 0 && <Line k={`Discount${order.coupon ? ` · ${order.coupon.code}` : ''}`} v={`−${money(order.discountAmount)}`} color="var(--green-600)" />}
                    <Line k={`Delivery${order.deliveryMethod ? ` · ${order.deliveryMethod.name}` : ''}`} v={Number(order.deliveryCost) > 0 ? money(order.deliveryCost) : 'Free'} />
                    <Line k="Total" v={money(order.total)} bold />
                  </div>
                </div>

                <div style={box}>
                  <p style={title}>💳 Payment</p>
                  {order.payments?.length ? order.payments.map((p: any) => (
                    <div key={p.id} style={{ display: 'grid', gap: 3, fontSize: 12.5, color: 'var(--slate-600)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><StatusBadge status={p.status} payment /><strong style={{ fontSize: 14, color: 'var(--slate-900)' }}>{money(p.amount)}</strong></div>
                      <span>{p.provider}{p.paidAt ? ` · paid ${new Date(p.paidAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</span>
                      {p.providerPaymentId && <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--slate-400)' }}>{p.providerPaymentId}</span>}
                      {(p.refunds || []).map((r: any) => <span key={r.id} style={{ color: 'var(--red-600)' }}>↩ Refunded {money(r.amount)}{r.reason ? ` — ${r.reason}` : ''}</span>)}
                    </div>
                  )) : <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)' }}>No payment yet.</p>}
                </div>
              </div>

              {/* Right: who and where */}
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={box}>
                  <p style={title}>👤 Customer</p>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--slate-900)' }}>{order.user?.firstName} {order.user?.lastName}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {order.user?.phone && <a href={`tel:${order.user.phone}`} style={{ ...pillBtn('soft'), textDecoration: 'none' }}>📞 {order.user.phone}</a>}
                    {order.user?.email && <a href={`mailto:${order.user.email}`} style={{ ...pillBtn('soft'), textDecoration: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>✉️ {order.user.email}</a>}
                  </div>
                </div>

                {addr && (
                  <div style={box}>
                    <p style={title}>📍 {order.isGift ? 'Deliver to (gift)' : 'Delivery'}</p>
                    <p style={{ margin: 0, fontSize: 13.5, color: 'var(--slate-800)', lineHeight: 1.6 }}>
                      <strong>{addr.firstName} {addr.lastName}</strong><br />
                      {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                      {addr.city}{addr.postalCode ? ` ${addr.postalCode}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                      {addr.phone && <a href={`tel:${addr.phone}`} style={{ ...pillBtn('soft'), textDecoration: 'none' }}>📞 {addr.phone}</a>}
                      <MapLink address={addr} />
                    </div>
                  </div>
                )}

                {(order.dog || order.subscription || order.isGift) && (
                  <div style={box}>
                    {order.dog && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--teal-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐶</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5 }}>{order.dog.name}</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--slate-500)' }}>{[order.dog.breed, order.dog.size, order.dog.gender].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    )}
                    {order.subscription && (
                      <div style={{ marginTop: order.dog ? 12 : 0, paddingTop: order.dog ? 12 : 0, borderTop: order.dog ? '1px dashed var(--slate-200)' : 'none', fontSize: 12.5, color: 'var(--slate-600)', display: 'grid', gap: 3 }}>
                        <strong style={{ color: 'var(--teal-700)' }}>🔄 {order.subscription.plan?.name}</strong>
                        <span>{order.subscription.boxesDelivered} of {order.subscription.boxesTotal} boxes sent · {String(order.subscription.status).toLowerCase()}</span>
                        {order.subscription.nextRenewalAt && <span>Renews {new Date(order.subscription.nextRenewalAt).toLocaleDateString('en-GB')}</span>}
                      </div>
                    )}
                    {order.isGift && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--slate-200)', fontSize: 12.5, color: 'var(--slate-600)' }}>
                        <strong style={{ color: 'var(--violet-700)' }}>🎁 For {order.giftRecipientName}</strong>
                        {order.giftMessage && <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>“{order.giftMessage}”</p>}
                      </div>
                    )}
                  </div>
                )}

                <div style={box}>
                  <p style={title}>🚚 Tracking</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" style={field} />
                    <button disabled={busy || tracking === (order.trackingNumber || '')} onClick={() => saveTracking()} style={{ ...pillBtn('soft'), opacity: tracking === (order.trackingNumber || '') ? 0.5 : 1 }}>Save</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes, newest first */}
            <div style={box}>
              <p style={title}>📝 Notes &amp; history</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: notes.length ? 12 : 0 }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) saveTracking(note.trim()); }} placeholder="Add a note for the team (not shown to the customer)…" style={field} />
                <button disabled={busy || !note.trim()} onClick={() => saveTracking(note.trim())} style={{ ...pillBtn('primary'), padding: '8px 14px', fontSize: 12.5, opacity: note.trim() ? 1 : 0.5 }}>Add</button>
              </div>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {notes.map((n, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--slate-700)', lineHeight: 1.45 }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 6, borderRadius: 99, background: i ? 'var(--slate-300)' : 'var(--teal-500)', flexShrink: 0 }} />
                    <span>{n}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function Line({ k, v, bold, color }: { k: string; v: string; bold?: boolean; color?: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: bold ? 800 : 500, fontSize: bold ? 15 : 12.5, color: color ?? (bold ? 'var(--slate-900)' : undefined), marginTop: bold ? 4 : 0 }}><span>{k}</span><span>{v}</span></div>;
}
