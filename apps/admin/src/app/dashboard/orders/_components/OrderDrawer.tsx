'use client';
import MapLink from '@/components/MapLink';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import ChoiceNote from '../../../../components/ChoiceNote';
import { API, authHeaders, jsonHeaders, apiError, money, STATUS_FLOW, STATUS_LABEL, EDITABLE, StatusBadge, TypeBadge, RefundDueBadge, Thumb } from '../_lib';
import OrderEditor from './OrderEditor';
import RefundModal from './RefundModal';
import ConfirmSheet, { Toast } from './ConfirmSheet';
import DogLikes from '@/components/DogLikes';

/** Each move in words: the button, what it does, and whether to ask first. */
const MOVE: Record<string, { verb: string; done: string; help: string; ask?: string }> = {
  PAID: { verb: 'Back to “To pack”', done: 'Back to To pack', help: 'Undo — waiting to be packed again.' },
  PROCESSING: { verb: 'Start preparing', done: 'Now preparing', help: 'You’re picking the items now.' },
  PACKED: { verb: 'Mark as packed', done: 'Marked as packed', help: 'In its box, waiting for the courier.' },
  SHIPPED: { verb: 'Hand to courier', done: 'Handed to the courier', help: 'The customer gets an email and a text with the tracking number.', ask: 'The customer is told right away (email + text). Add the tracking number first if you have it.' },
  DELIVERED: { verb: 'Mark as delivered', done: 'Marked as delivered', help: 'It reached the customer.', ask: 'Only once the courier confirms it arrived. The customer is told.' },
  CANCELLED: { verb: 'Cancel order', done: 'Order cancelled', help: 'Stock goes back on sale.' },
};
const TABS = ['Overview', 'Items & box', 'Customer & dog', 'Payment', 'Activity'] as const;
type Tab = typeof TABS[number];

const SIZE: Record<string, string> = { EXTRA_SMALL: 'Extra small', SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large', EXTRA_LARGE: 'Extra large' };
const dateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const age = (b?: string | null) => { if (!b) return null; const y = (Date.now() - new Date(b).getTime()) / (365.25 * 864e5); return y < 1 ? `${Math.max(1, Math.round(y * 12))} months` : `${Math.floor(y)} years`; };

const card = { background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 18, padding: 18 } as const;
const label = { fontSize: 11, fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 10px' };
const field = { border: '1.5px solid var(--slate-200)', borderRadius: 11, padding: '9px 12px', fontSize: 13.5, outline: 'none', background: 'var(--white)', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
const btn = (kind: 'primary' | 'soft' | 'danger' | 'ghost' = 'soft') => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: kind === 'primary' ? '11px 18px' : '8px 13px', borderRadius: 12,
  fontSize: kind === 'primary' ? 14 : 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, textDecoration: 'none',
  border: kind === 'primary' || kind === 'ghost' ? 'none' : `1.5px solid ${kind === 'danger' ? 'var(--red-200)' : 'var(--slate-200)'}`,
  background: kind === 'primary' ? 'var(--teal-600)' : kind === 'ghost' ? 'transparent' : 'var(--white)',
  color: kind === 'primary' ? 'var(--white)' : kind === 'danger' ? 'var(--red-600)' : 'var(--slate-700)',
  boxShadow: kind === 'primary' ? '0 10px 22px -12px rgba(13,148,136,.9)' : 'none',
});
const iconBtn = { width: 38, height: 38, borderRadius: 11, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-600)', cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none' } as const;

/**
 * One order, everything about it, as a page that slides in (wider with ⤢,
 * full screen on phones). Up top: number, status and the actions — Edit,
 * Invoice, ⤢, ✕ — all on the right. Then tabs, so nothing is a long scroll:
 *
 *   Overview — where it stands and the next step, as one button that says
 *     what happens; important steps ask first, and every move can be undone
 *     for a few seconds. Moving back lives in "More", not next to "forward".
 *   Items & box — the lines, the box type and what's in each box, a built box.
 *   Customer & dog — who, how to reach them, their history; the dog in full.
 *   Payment — card, date, method, every try and refund; Refund, Charge now.
 *   Activity — courier and tracking number, notes and history.
 */
export default function OrderDrawer({ order: initial, categories, onClose, onChanged, startEditing = false }: any) {
  const [order, setOrder] = useState<any>(initial);
  const [editing, setEditing] = useState<boolean>(startEditing && EDITABLE.includes(initial.status));
  const [tab, setTab] = useState<Tab>('Overview');
  const [wide, setWide] = useState(false);
  const [confirm, setConfirm] = useState<null | { to: string }>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [toast, setToast] = useState<null | { text: string; undoTo?: string }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(initial.trackingNumber || '');
  const [note, setNote] = useState('');
  const moreRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const r = await fetch(`${API}/orders/admin/${initial.id}`, { headers: authHeaders() });
    if (r.ok) { const o = await r.json(); setOrder(o); setTracking(o.trackingNumber || ''); }
  }, [initial.id]);
  useEffect(() => { reload(); }, [reload]);

  // Esc: a question or menu first, then the page. The editor and pop-ups handle their own.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || editing || refundOpen || confirm) return;
      if (more) { setMore(false); return; }
      onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, editing, refundOpen, confirm, more]);
  useEffect(() => {
    if (!more) return;
    const out = (e: MouseEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMore(false); };
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [more]);

  const next: string[] = order.allowedNext ?? [];
  const step = STATUS_FLOW.indexOf(order.status);
  const forward = next.filter((s) => STATUS_FLOW.indexOf(s) > step).sort((a, b) => STATUS_FLOW.indexOf(a) - STATUS_FLOW.indexOf(b));
  const main = forward[0];
  const back = next.filter((s) => STATUS_FLOW.indexOf(s) >= 0 && STATUS_FLOW.indexOf(s) < step);
  const paid = order.payments?.find((p: any) => ['PAID', 'PARTIALLY_REFUNDED'].includes(p.status));
  const refundedSum = (order.payments ?? []).flatMap((p: any) => p.refunds ?? []).reduce((n: number, r: any) => n + Number(r.amount), 0);
  const canRefund = !!paid && Number(paid.amount) - (paid.refunds ?? []).reduce((n: number, r: any) => n + Number(r.amount), 0) > 0.001;
  const shortNo = (order.orderNumber || order.id).slice(-8).toUpperCase();

  async function move(to: string, opts: { reason?: string; quiet?: boolean } = {}) {
    setBusy(true); setError('');
    const from = order.status;
    const r = await fetch(`${API}/orders/admin/${order.id}/status`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ status: to, ...(opts.reason ? { reason: opts.reason } : {}) }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false); setConfirm(null); setMore(false);
    if (!r.ok) { setError(apiError(d)); return; }
    setOrder(d); onChanged();
    // Undo goes back to where it was, if that step is allowed from here.
    if (!opts.quiet) setToast({ text: MOVE[to]?.done ?? `Now ${STATUS_LABEL[to]}`, undoTo: (d.allowedNext ?? []).includes(from) ? from : undefined });
  }
  function ask(to: string) {
    if (to === 'CANCELLED' || MOVE[to]?.ask) { setCancelReason(''); setConfirm({ to }); return; }
    move(to);
  }
  async function saveTracking(extraNote?: string) {
    setBusy(true);
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const notes = extraNote ? [order.internalNotes, `${stamp}: ${extraNote}`].filter(Boolean).join('\n') : order.internalNotes;
    await fetch(`${API}/orders/admin/${order.id}/tracking`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ trackingNumber: tracking.trim(), internalNotes: notes ?? '' }) });
    setBusy(false); setNote(''); await reload(); onChanged(); setToast({ text: extraNote ? 'Note added' : 'Tracking number saved' });
  }
  async function chargeNow() {
    setBusy(true); setError('');
    const r = await fetch(`${API}/orders/admin/${order.id}/charge-now`, { method: 'POST', headers: jsonHeaders() });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(apiError(d)); return; }
    setOrder(d); onChanged();
    setToast({ text: d.status === 'PAID' ? 'Charged — the plan continues' : `Declined: ${d.lastChargeError ?? 'the bank said no'}` });
  }

  const addr = order.address;
  const dog = order.dog;
  const user = order.user ?? {};
  const notes = String(order.internalNotes || '').split('\n').filter(Boolean).reverse();
  const planLine = (order.items ?? []).find((i: any) => i.subscriptionPlan);
  const boxLine = (order.items ?? []).find((i: any) => i.customBox);

  // ── Tabs ──
  const overview = (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Where it stands, and what to do next */}
      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={label}>Status</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--slate-900)' }}>{STATUS_LABEL[order.status] ?? order.status}</div>
          </div>
          {order.refundDue && <RefundDueBadge />}
        </div>
        {step >= 0 && (
          <ol aria-label="Progress" style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUS_FLOW.length}, minmax(0, 1fr))`, gap: 5, listStyle: 'none', margin: '0 0 18px', padding: 0 }}>
            {STATUS_FLOW.map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined} style={{ minWidth: 0 }}>
                <span style={{ display: 'block', height: 8, borderRadius: 99, background: i < step ? 'var(--teal-500)' : i === step ? 'var(--teal-600)' : 'var(--slate-200)', boxShadow: i === step ? '0 0 0 3px var(--teal-100)' : 'none' }} />
                <span style={{ display: 'block', marginTop: 7, fontSize: 11, fontWeight: i === step ? 800 : 600, color: i === step ? 'var(--teal-800)' : i < step ? 'var(--slate-500)' : 'var(--slate-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i < step ? '✓ ' : i === step ? '● ' : ''}{STATUS_LABEL[s]}
                </span>
              </li>
            ))}
          </ol>
        )}

        {order.status === 'PENDING' ? (
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--slate-600)' }}>
            {order.type === 'RENEWAL' && order.nextChargeAt ? <>Waiting for payment. Next automatic charge: <strong>{dateTime(order.nextChargeAt)}</strong>.</> : 'Waiting for the customer to pay.'}
          </p>
        ) : main ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button disabled={busy} onClick={() => ask(main)} style={{ ...btn('primary'), flex: '1 1 220px' }}>
              {busy ? 'Working…' : <>{MOVE[main]?.verb ?? STATUS_LABEL[main]} →</>}
            </button>
            <p style={{ flex: '1 1 200px', margin: 0, fontSize: 12.5, color: 'var(--slate-500)' }}>Next: <strong style={{ color: 'var(--slate-800)' }}>{STATUS_LABEL[main]}</strong> — {MOVE[main]?.help}</p>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--slate-600)' }}>{order.status === 'DELIVERED' ? 'Delivered — all done. 🎉' : `This order is ${(STATUS_LABEL[order.status] ?? order.status).toLowerCase()}.`}</p>
        )}

        {/* Less common moves, kept apart so they're never clicked by mistake */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--slate-200)' }}>
          {canRefund && <button onClick={() => setRefundOpen(true)} style={btn('danger')}>↩ Refund…</button>}
          {order.refundDue && !canRefund && <span style={{ fontSize: 12.5, color: 'var(--red-700)' }}>Refund due {money(order.refundDueValue)}</span>}
          {(back.length > 0 || forward.length > 1 || next.includes('CANCELLED')) && (
            <div ref={moreRef} style={{ position: 'relative' }}>
              <button onClick={() => setMore((m) => !m)} aria-expanded={more} style={btn('soft')}>More ▾</button>
              {more && (
                <div role="menu" style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 5, minWidth: 250, background: 'var(--white)', border: '1px solid var(--slate-200b)', borderRadius: 14, boxShadow: '0 16px 40px -12px rgba(15,23,42,.3)', padding: 6 }}>
                  {forward.slice(1).map((s) => <MenuItem key={s} onClick={() => ask(s)} title={`Skip to ${STATUS_LABEL[s]}`} sub={MOVE[s]?.help} />)}
                  {back.map((s) => <MenuItem key={s} onClick={() => setConfirm({ to: s })} title={`Move back to ${STATUS_LABEL[s]}`} sub="If it was marked too early." />)}
                  {next.includes('CANCELLED') && <MenuItem danger onClick={() => ask('CANCELLED')} title="Cancel order" sub={paid ? 'Stops it; then refund the money.' : 'Stops it; stock goes back.'} />}
                </div>
              )}
            </div>
          )}
        </div>
        {error && <p role="alert" style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--red-600)' }}>{error}</p>}
      </div>

      {/* The essentials, at a glance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
        <Fact title="Customer" onClick={() => setTab('Customer & dog')}>
          <strong>{user.firstName} {user.lastName}</strong>
          <span>{user.phone || 'no phone'} {user.phoneVerified ? '✓' : ''}</span>
          <span style={{ color: 'var(--slate-400)' }}>{order.customerStats?.orders ?? '—'} orders · {money(order.customerStats?.totalPaid)} paid</span>
        </Fact>
        <Fact title="Dog" onClick={() => setTab('Customer & dog')}>
          {dog ? <><strong>🐶 {dog.name}</strong><span>{[dog.breed, SIZE[dog.size] ?? dog.size].filter(Boolean).join(' · ') || '—'}</span>{dog.allergies?.length > 0 && <span style={{ color: 'var(--red-600)', fontWeight: 700 }}>⚠ {dog.allergies.join(', ')}</span>}</> : <span style={{ color: 'var(--slate-400)' }}>No dog on this order</span>}
        </Fact>
        <Fact title="Delivery" onClick={() => setTab('Activity')}>
          {addr ? <><strong>{addr.city}{addr.isGift && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-700)', background: 'var(--violet-50)', borderRadius: 99, padding: '1px 7px', marginLeft: 6 }}>🎁 {(addr.label || 'Gift').replace(/^Gift · /, 'Gift for ')}</span>}</strong><span>{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</span></> : <span style={{ color: 'var(--slate-400)' }}>No address</span>}
          <span style={{ color: 'var(--slate-400)' }}>{order.deliveryMethod?.name ?? 'Delivery'}{order.trackingNumber ? ` · ${order.trackingNumber}` : ' · no tracking yet'}</span>
        </Fact>
        <Fact title="Money" onClick={() => setTab('Payment')}>
          <strong style={{ fontSize: 18 }}>{money(order.total)}</strong>
          <span>{paid ? `Paid ${day(paid.paidAt)}${paid.cardMask ? ` · ${paid.cardBrand ?? ''} ••${String(paid.cardMask).slice(-4)}` : ''}` : order.status === 'PENDING' ? 'Not paid yet' : '—'}</span>
          {refundedSum > 0 && <span style={{ color: 'var(--red-600)' }}>Refunded {money(refundedSum)}</span>}
        </Fact>
      </div>
      {(order.extraCharges?.length > 0 || order.parentOrder) && (
        <div style={{ ...card, background: 'var(--amber-50)', borderColor: 'var(--amber-200)' }}>
          {order.parentOrder && <p style={{ margin: 0, fontSize: 13 }}>Extra payment for order <strong>#{order.parentOrder.orderNumber.slice(-8).toUpperCase()}</strong> — ships with it once paid.</p>}
          {(order.extraCharges ?? []).map((x: any) => (
            <p key={x.id} style={{ margin: '4px 0 0', fontSize: 13 }}>Extra payment <strong>#{x.orderNumber.slice(-8).toUpperCase()}</strong> · {money(x.total)} · {STATUS_LABEL[x.status] ?? x.status} — {x.items.map((i: any) => `${i.name} ×${i.quantity}`).join(', ')}</p>
          ))}
        </div>
      )}
    </div>
  );

  const items = (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={card}>
        <p style={label}>📦 Items · {order.items?.length || 0}</p>
        <div style={{ display: 'grid', gap: 12 }}>
          {(order.items || []).map((it: any) => (
            <div key={it.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Thumb item={it} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: 'var(--slate-800)', margin: 0, fontSize: 14 }}>{it.name}</p>
                <ChoiceNote choice={it.personalisation} />
                <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 0' }}>{it.quantity} × {money(it.price)}{it.sku ? ` · ${it.sku}` : ''}{it.product?.category ? ` · ${it.product.category.name}` : ''}</p>
              </div>
              <strong style={{ fontSize: 14 }}>{money(it.total)}</strong>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--slate-200)', display: 'grid', gap: 4, fontSize: 13, color: 'var(--slate-600)' }}>
          <Line k="Items" v={money(order.subtotal)} />
          {Number(order.discountAmount) > 0 && <Line k={order.referralCode ? `Friend’s code · ${order.referralCode}` : `Discount${order.coupon ? ` · ${order.coupon.code}` : ''}`} v={`−${money(order.discountAmount)}`} color="var(--green-600)" />}
          <Line k={`Delivery${order.deliveryMethod ? ` · ${order.deliveryMethod.name}` : ''}`} v={Number(order.deliveryCost) > 0 ? money(order.deliveryCost) : 'Free'} />
          <Line k="Total" v={money(order.total)} bold />
        </div>
      </div>

      {/* What goes in the box */}
      {(planLine || boxLine || order.subscription) && (
        <div style={card}>
          <p style={label}>🎁 What’s in the box</p>
          {planLine?.subscriptionPlan && (
            <p style={{ margin: '0 0 10px', fontSize: 13.5 }}>
              <strong>{planLine.subscriptionPlan.tier ? `${planLine.subscriptionPlan.tier.emoji ?? ''} ${planLine.subscriptionPlan.tier.name}` : planLine.subscriptionPlan.name}</strong>
              {planLine.subscriptionPlan.tier && <span style={{ color: 'var(--slate-500)' }}> · {planLine.subscriptionPlan.tier.itemCount} items every box · {planLine.subscriptionPlan.durationValue} month plan</span>}
              {dog && <span style={{ color: 'var(--slate-500)' }}> · picked for {dog.name}{dog.size ? ` (${SIZE[dog.size] ?? dog.size})` : ''}</span>}
            </p>
          )}
          {boxLine?.customBox && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 700 }}>Built by the customer{boxLine.customBox.monthly ? ' · every month' : ''}</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--slate-700)' }}>
                {boxLine.customBox.items.map((x: any, i: number) => <li key={i}>{x.product.name} ×{x.quantity}</li>)}
                {boxLine.customBox.mysteryCount > 0 && <li>🎁 Mystery item ×{boxLine.customBox.mysteryCount} (you choose when packing)</li>}
              </ul>
            </div>
          )}
          {order.subscription?.shipments?.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {order.subscription.shipments.map((s: any) => (
                <div key={s.id} style={{ border: '1px solid var(--slate-200b)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                    <strong>Box {s.boxNumber} · {new Date(s.year, s.month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)' }}>{String(s.status).replace('_', ' ').toLowerCase()}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--slate-600)' }}>
                    {s.campaign ? `${s.campaign.name}: ${s.campaign.products.map((p: any) => `${p.product.name} ×${p.quantity}`).join(', ')}` : 'Contents not chosen yet (no box set up for this month).'}
                  </p>
                </div>
              ))}
            </div>
          ) : order.subscription ? <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>No boxes sent yet — the first goes out in this month’s dispatch.</p> : null}
        </div>
      )}
    </div>
  );

  const people = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14, alignItems: 'start' }}>
      <div style={card}>
        <p style={label}>👤 Customer</p>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{user.firstName} {user.lastName}</p>
        <p style={{ margin: '2px 0 10px', fontSize: 12.5, color: 'var(--slate-500)' }}>Customer since {day(order.customerStats?.since)} · {order.customerStats?.orders} orders · {money(order.customerStats?.totalPaid)} paid in all</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {user.phone && <a href={`tel:${user.phone}`} style={btn('soft')}>📞 {user.phone} {user.phoneVerified ? '✓' : ''}</a>}
          {user.email && <a href={`mailto:${user.email}`} style={{ ...btn('soft'), maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>✉️ {user.email}</a>}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--slate-500)' }}>Offers: email {user.marketingEmail ? '✓' : '✗'} · SMS {user.marketingSms ? '✓' : '✗'} · writes in {user.language === 'en' ? 'English' : 'Georgian'}</p>
        {user.addresses?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={label}>Saved addresses</p>
            {user.addresses.map((a: any) => (
              <p key={a.id} style={{ margin: '0 0 6px', fontSize: 12.5, color: a.id === order.addressId ? 'var(--teal-800)' : 'var(--slate-600)', fontWeight: a.id === order.addressId ? 700 : 400 }}>
                {a.id === order.addressId ? '📍 ' : ''}{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city} · {a.phone}{a.isDefault ? ' (default)' : ''}
              </p>
            ))}
          </div>
        )}
      </div>
      <div style={card}>
        <p style={label}>🐶 Dog</p>
        {dog ? (
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ width: 84, height: 84, borderRadius: 18, overflow: 'hidden', background: 'var(--teal-50)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {dog.photoUrl ? <img src={dog.photoUrl} alt={dog.name} style={{ width: 84, height: 84, objectFit: 'cover' }} /> : '🐶'}
            </div>
            <div style={{ display: 'grid', gap: 3, fontSize: 13, color: 'var(--slate-700)', minWidth: 0 }}>
              <strong style={{ fontSize: 16, color: 'var(--slate-900)' }}>{dog.name} {dog.gender === 'MALE' ? '♂' : dog.gender === 'FEMALE' ? '♀' : ''}</strong>
              <span>{[dog.breed, SIZE[dog.size] ?? dog.size, age(dog.birthday), dog.weightKg ? `${dog.weightKg} kg` : null].filter(Boolean).join(' · ') || '—'}</span>
              {dog.birthday && <span>🎂 {day(dog.birthday)}</span>}
              <span style={{ color: dog.allergies?.length ? 'var(--red-600)' : 'var(--slate-400)', fontWeight: dog.allergies?.length ? 800 : 400 }}>{dog.allergies?.length ? `⚠ Allergic to: ${dog.allergies.join(', ')}` : 'No allergies'}</span>
              <DogLikes dog={dog} />
              {dog.specialNotes && <span style={{ fontStyle: 'italic' }}>“{dog.specialNotes}”</span>}
            </div>
          </div>
        ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-400)' }}>No dog on this order.{user.dogs?.length ? ` The customer has ${user.dogs.length} — pick one with Edit.` : ''}</p>}
      </div>
    </div>
  );

  const payment = (
    <div style={{ display: 'grid', gap: 14 }}>
      {order.type === 'RENEWAL' && (order.chargeAttempts > 0 || order.nextChargeAt) && (
        <div style={{ ...card, background: order.status === 'PENDING' ? 'var(--amber-50)' : 'var(--green-50)', borderColor: order.status === 'PENDING' ? 'var(--amber-200)' : 'var(--green-200)' }}>
          <p style={label}>🔁 Automatic renewal</p>
          <p style={{ margin: 0, fontSize: 13.5 }}>
            {order.status === 'PENDING'
              ? <>{order.chargeAttempts} tr{order.chargeAttempts === 1 ? 'y' : 'ies'} so far. {order.nextChargeAt ? <>Next try <strong>{dateTime(order.nextChargeAt)}</strong>.</> : 'No more automatic tries — waiting for the customer to pay the link.'}{order.lastChargeError ? <> Last answer: <em>{order.lastChargeError}</em>.</> : ''}</>
              : <>Paid on try {order.chargeAttempts}.</>}
          </p>
          {order.status === 'PENDING' && <button disabled={busy} onClick={chargeNow} style={{ ...btn('soft'), marginTop: 10 }}>⚡ Charge the saved card now</button>}
        </div>
      )}
      {(order.payments ?? []).length === 0 && <div style={card}><p style={{ margin: 0, color: 'var(--slate-500)', fontSize: 13.5 }}>No payment yet.</p></div>}
      {(order.payments ?? []).map((p: any) => (
        <div key={p.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 46, height: 32, borderRadius: 7, background: 'linear-gradient(135deg, var(--slate-800), var(--slate-600))', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{(p.cardBrand || 'CARD').slice(0, 4).toUpperCase()}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.04em' }}>{p.cardMask ? `•••• ${String(p.cardMask).slice(-4)}` : p.provider === 'NONE' ? 'Nothing to pay (100% coupon)' : 'Card not known yet'}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{p.method || p.provider}{p.attempt ? ` · automatic try ${p.attempt}` : ''}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge status={p.status} payment />
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>{money(p.amount)}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 12, fontSize: 12.5 }}>
            <Kv k="Paid on" v={p.paidAt ? dateTime(p.paidAt) : '—'} />
            <Kv k="Started" v={dateTime(p.createdAt)} />
            <Kv k="Provider" v={p.provider} />
            <Kv k="Transaction" v={p.providerPaymentId || '—'} mono />
            {p.failReason && <Kv k="Declined because" v={p.failReason} />}
          </div>
          {(p.refunds ?? []).length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--slate-200)', display: 'grid', gap: 6 }}>
              {p.refunds.map((r: any) => (
                <div key={r.id} style={{ fontSize: 12.5, color: 'var(--slate-700)' }}>
                  <strong style={{ color: 'var(--red-600)' }}>↩ {money(r.amount)}</strong> · {dateTime(r.createdAt)} · {r.method === 'PROVIDER' ? 'sent back by the provider' : 'recorded (done in the portal)'}
                  {Array.isArray(r.items) && r.items.length > 0 && <> · {r.items.map((x: any) => `${x.name} ×${x.quantity}`).join(', ')}</>}
                  {r.reason && <> — <em>{r.reason}</em></>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {canRefund && <button onClick={() => setRefundOpen(true)} style={{ ...btn('danger'), justifySelf: 'start' }}>↩ Refund all or part…</button>}
    </div>
  );

  const activity = (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={card}>
        <p style={label}>🚚 Courier &amp; tracking</p>
        <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--slate-500)', lineHeight: 1.5 }}>
          The parcel number the courier gives you when you hand the box over{order.deliveryMethod ? <> (<strong>{order.deliveryMethod.name}</strong>)</> : ''} — the one printed on their label or receipt. The customer gets it by email and text when you mark the order “Handed to courier”.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. GE123456789" aria-label="Tracking number" style={field} />
          <button disabled={busy || tracking === (order.trackingNumber || '')} onClick={() => saveTracking()} style={{ ...btn('soft'), opacity: tracking === (order.trackingNumber || '') ? 0.5 : 1 }}>Save</button>
        </div>
        {addr && (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.6 }}>
            <strong>{addr.firstName} {addr.lastName}</strong> · {addr.phone}<br />
            {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city}{addr.postalCode ? ` ${addr.postalCode}` : ''} <MapLink address={addr} />{addr.isGift && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-700)', background: 'var(--violet-50)', borderRadius: 99, padding: '1px 7px', marginLeft: 6 }}>🎁 {(addr.label || 'Gift').replace(/^Gift · /, 'Gift for ')}</span>}
          </div>
        )}
      </div>
      <div style={card}>
        <p style={label}>📝 Notes &amp; history</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: notes.length ? 14 : 0 }}>
          <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) saveTracking(note.trim()); }} placeholder="A note for the team (not shown to the customer)…" style={field} />
          <button disabled={busy || !note.trim()} onClick={() => saveTracking(note.trim())} style={{ ...btn('primary'), padding: '9px 14px', fontSize: 13, opacity: note.trim() ? 1 : 0.5 }}>Add</button>
        </div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {notes.map((n, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--slate-700)', lineHeight: 1.45 }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, marginTop: 5, borderRadius: 99, background: i ? 'var(--slate-300)' : 'var(--teal-500)', flexShrink: 0 }} />
              <span>{n}</span>
            </li>
          ))}
          <li style={{ display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--slate-400)' }}>
            <span aria-hidden="true" style={{ width: 9, height: 9, marginTop: 5, borderRadius: 99, background: 'var(--slate-200)', flexShrink: 0 }} />
            <span>{dateTime(order.createdAt)}: order placed</span>
          </li>
        </ol>
      </div>
    </div>
  );

  const body: Record<Tab, ReactNode> = { Overview: overview, 'Items & box': items, 'Customer & dog': people, Payment: payment, Activity: activity };

  return (
    <>
      <div onClick={() => !editing && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 50, backdropFilter: 'blur(2px)' }} />
      <section role="dialog" aria-modal="true" aria-label={`Order ${shortNo}`}
        style={{ position: 'fixed', top: 0, right: 0, width: wide ? 'min(1240px, 100vw)' : 'min(880px, 100vw)', height: '100%', background: 'var(--slate-50)', zIndex: 51, overflowY: 'auto', boxShadow: '-12px 0 48px rgba(15,23,42,0.18)', transition: 'width .25s ease', animation: 'odIn .22s ease-out' }}>
        <style>{'@keyframes odIn{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}'}</style>

        <header style={{ position: 'sticky', top: 0, zIndex: 4, background: 'var(--white)', borderBottom: '1px solid var(--slate-200b)' }}>
          <div style={{ padding: '12px clamp(14px, 3vw, 24px)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: '1 1 240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 18, color: 'var(--slate-900)', fontFamily: 'monospace' }}>{editing ? 'Editing ' : ''}#{shortNo}</strong>
                <StatusBadge status={order.status} /><TypeBadge type={order.type} />
                {order.isGift && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-700)', background: 'var(--violet-50)', borderRadius: 99, padding: '2px 8px' }}>🎁 Gift</span>}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--slate-400)' }}>{dateTime(order.createdAt)} · {money(order.total)}</p>
            </div>
            {/* Actions, always in the same places: Edit, Invoice, wider, close */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
              {!editing && EDITABLE.includes(order.status) && <button onClick={() => setEditing(true)} style={btn('soft')}>✎ Edit</button>}
              {!editing && <Link href={`/dashboard/orders/${order.id}/invoice`} target="_blank" style={btn('soft')}>🧾 Invoice</Link>}
              <button onClick={() => setWide((w) => !w)} aria-label={wide ? 'Make narrower' : 'Make wider'} title={wide ? 'Narrower' : 'Wider'} className="od-wide" style={iconBtn}>{wide ? '⇥' : '⤢'}</button>
              <button onClick={() => (editing ? setEditing(false) : onClose())} aria-label={editing ? 'Stop editing' : 'Close'} title="Close (Esc)" style={iconBtn}>✕</button>
            </div>
          </div>
          {!editing && (
            <nav role="tablist" aria-label="Order sections" style={{ display: 'flex', gap: 4, padding: '0 clamp(10px, 3vw, 20px)', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {TABS.map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  style={{ padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: tab === t ? 'var(--teal-700)' : 'var(--slate-500)', borderBottom: `2.5px solid ${tab === t ? 'var(--teal-600)' : 'transparent'}` }}>
                  {t}{t === 'Payment' && order.refundDue ? ' •' : ''}{t === 'Activity' && notes.length ? ` (${notes.length})` : ''}
                </button>
              ))}
            </nav>
          )}
        </header>

        <div style={{ padding: 'clamp(14px, 3vw, 24px)' }}>
          {editing
            ? <OrderEditor orderId={order.id} categories={categories} onCancel={() => setEditing(false)}
                onDone={(o: any, summary?: string) => { setOrder(o); setEditing(false); onChanged(); setToast({ text: summary || 'Order updated' }); }} />
            : body[tab]}
        </div>
      </section>

      {/* Asking before steps that matter */}
      <ConfirmSheet open={!!confirm} busy={busy}
        title={confirm ? (confirm.to === 'CANCELLED' ? `Cancel order #${shortNo}?` : STATUS_FLOW.indexOf(confirm.to) < step ? `Move back to “${STATUS_LABEL[confirm.to]}”?` : `${MOVE[confirm.to]?.verb ?? STATUS_LABEL[confirm.to]}?`) : ''}
        confirmLabel={confirm ? (confirm.to === 'CANCELLED' ? 'Yes, cancel order' : STATUS_FLOW.indexOf(confirm.to) < step ? 'Move back' : MOVE[confirm.to]?.verb ?? 'Continue') : ''}
        tone={confirm?.to === 'CANCELLED' ? 'danger' : 'primary'}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && move(confirm.to, { reason: cancelReason.trim() || undefined })}>
        {confirm?.to === 'CANCELLED' ? (
          <>
            <p style={{ margin: '0 0 10px' }}>{paid ? 'It’s paid: the items go back in stock and any plan it started stops. Then refund the money from the Payment tab (it shows “Refund due” until you do).' : 'Nothing was paid. The items go back on sale.'}</p>
            <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason (kept on the order)" style={field} />
          </>
        ) : confirm && STATUS_FLOW.indexOf(confirm.to) < step ? (
          <p style={{ margin: 0 }}>From <strong>{STATUS_LABEL[order.status]}</strong> back to <strong>{STATUS_LABEL[confirm.to]}</strong> — use this if it was marked too early. The customer isn’t told.</p>
        ) : confirm ? (
          <p style={{ margin: 0 }}>{MOVE[confirm.to]?.ask}{confirm.to === 'SHIPPED' && <><br /><strong>Tracking number:</strong> {order.trackingNumber || 'none yet (add it in Activity)'}</>}</p>
        ) : null}
      </ConfirmSheet>

      {refundOpen && <RefundModal order={order} onClose={() => setRefundOpen(false)} onDone={(o, text) => { setOrder(o); setRefundOpen(false); onChanged(); setToast({ text }); }} />}
      {toast && <Toast text={toast.text} onUndo={toast.undoTo ? () => { move(toast.undoTo!, { quiet: true }).then(() => setToast({ text: `Back to ${STATUS_LABEL[toast.undoTo!]}` })); } : undefined} onClose={() => setToast(null)} />}
    </>
  );
}

function Fact({ title, children, onClick }: { title: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...card, textAlign: 'left', cursor: onClick ? 'pointer' : 'default', display: 'grid', gap: 3, fontSize: 13, color: 'var(--slate-700)', fontFamily: 'inherit' }}>
      <span style={label}>{title}</span>{children}
    </button>
  );
}
function MenuItem({ title, sub, onClick, danger }: { title: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', borderRadius: 10, padding: '9px 11px', cursor: 'pointer', fontFamily: 'inherit' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--slate-100)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: danger ? 'var(--red-600)' : 'var(--slate-800)' }}>{title}</span>
      {sub && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--slate-500)' }}>{sub}</span>}
    </button>
  );
}
function Line({ k, v, bold, color }: { k: string; v: string; bold?: boolean; color?: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: bold ? 800 : 500, fontSize: bold ? 15 : 13, color: color ?? (bold ? 'var(--slate-900)' : undefined), marginTop: bold ? 4 : 0 }}><span>{k}</span><span>{v}</span></div>;
}
function Kv({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return <div style={{ background: 'var(--slate-50)', borderRadius: 10, padding: '8px 10px', minWidth: 0 }}><div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div><div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--slate-800)', fontFamily: mono ? 'monospace' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v}>{v}</div></div>;
}
