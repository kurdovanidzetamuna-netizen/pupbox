'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ChoiceNote from '../../../components/ChoiceNote';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED'];

/**
 * Plain-language names for the OrderType enum, matching the dashboard's
 * vocabulary. The filter pills are driven by which types actually occur in the
 * data (see summary.byType), so enum values nothing ever writes — RENEWAL and
 * FREE_REWARD today — don't render as filters that can only return nothing.
 */
const TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: 'Boxes',
  PRODUCT: 'Shop',
  MIXED: 'Both',
  RENEWAL: 'Renewals',
  FREE_REWARD: 'Rewards',
};

const gel = (v: number) => (Math.abs(v) >= 10000 ? `₾${(v / 1000).toFixed(1)}k` : `₾${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

const STATUS_COLORS: Record<string, any> = {
  PENDING:    { background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)' },
  PAID:       { background: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' },
  PROCESSING: { background: 'var(--violet-50)', color: 'var(--violet-700)', border: '1px solid var(--violet-200)' },
  PACKED:     { background: 'var(--indigo-50)', color: 'var(--indigo-800)', border: '1px solid var(--indigo-200)' },
  SHIPPED:    { background: 'var(--emerald-50)', color: 'var(--emerald-800)', border: '1px solid var(--emerald-300)' },
  DELIVERED:  { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' },
  CANCELLED:  { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' },
  REFUNDED:   { background: 'var(--slate-50)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)' },
  FAILED:     { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' },
};

const TYPE_COLORS: Record<string, any> = {
  SUBSCRIPTION: { background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px solid var(--teal-200)' },
  PRODUCT:      { background: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)' },
  MIXED:        { background: 'var(--fuchsia-50)', color: 'var(--purple-600)', border: '1px solid var(--purple-200)' },
  RENEWAL:      { background: 'var(--green-50)', color: 'var(--green-700)', border: '1px solid var(--green-300)' },
  FREE_REWARD:  { background: 'var(--amber-50)', color: 'var(--amber-600)', border: '1px solid var(--amber-300)' },
};

const TYPE_ICONS: Record<string, string> = {
  SUBSCRIPTION: '🔄', PRODUCT: '🛍️', MIXED: '📦', RENEWAL: '♻️', FREE_REWARD: '🎁',
};

const STATUS_FLOW = ['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

/** What each step does, shown next to the choice so nothing happens by surprise. */
const STEP_HELP: Record<string, string> = {
  PAID: 'Back to paid (undo).',
  PROCESSING: 'Being prepared.',
  PACKED: 'Packed, waiting for the courier.',
  SHIPPED: 'Handed to the courier — the customer gets an email.',
  DELIVERED: 'Arrived.',
  CANCELLED: 'Cancel: stock goes back on sale. If it was paid, it becomes “refund due”.',
  REFUNDED: 'Record a refund you made in the payment provider’s portal.',
};

function RefundDueBadge() {
  return <span style={{ display: 'inline-flex', marginLeft: 6, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--red-50)', color: 'var(--red-700)', border: '1px solid var(--red-200)', whiteSpace: 'nowrap' }}>Refund due</span>;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  return <span style={{ ...s, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{status}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_COLORS[type] || TYPE_COLORS.PRODUCT;
  return <span style={{ ...s, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{TYPE_ICONS[type] || '📦'} {type}</span>;
}

function StatusProgress({ status }: { status: string }) {
  const idx = STATUS_FLOW.indexOf(status);
  if (idx === -1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 }}>
      {STATUS_FLOW.map((s, i) => {
        const done = i <= idx;
        const active = i === idx;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_FLOW.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? 'var(--teal-600)' : 'var(--slate-200)', border: active ? '3px solid var(--teal-600)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
                {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--white)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 9, color: done ? 'var(--teal-600)' : 'var(--slate-400)', fontWeight: done ? 700 : 400, marginTop: 4, whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < idx ? 'var(--teal-600)' : 'var(--slate-200)', margin: '0 0 16px', transition: 'background 0.2s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderDrawer({ order, onClose, onStatusChange, onTrackingUpdate }: any) {
  const [newStatus, setNewStatus] = useState(order.status);
  const [tracking, setTracking] = useState(order.trackingNumber || '');
  const [notes, setNotes] = useState(order.internalNotes || '');
  const [saving, setSaving] = useState(false);
  const token = () => localStorage.getItem('admin_token');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const [statusError, setStatusError] = useState('');
  const next: string[] = order.allowedNext ?? [];
  const paid = order.payments?.[0]?.status === 'PAID';

  async function recordRefund() {
    const due = Number(order.refundDueValue ?? 0);
    const answer = prompt(`Amount refunded in the payment provider’s portal (₾). Owed: ${due.toFixed(2)}`, due.toFixed(2));
    if (answer === null) return;
    const reason = prompt('Note (optional):') ?? '';
    setSaving(true); setStatusError('');
    const res = await fetch(`${API}/orders/admin/${order.id}/refund`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ amount: Number(answer.replace(',', '.')), ...(reason ? { reason } : {}) }),
    });
    setSaving(false);
    if (!res.ok) {
      const r = await res.json().catch(() => ({}));
      setStatusError((Array.isArray(r.message) ? r.message[0] : r.message) || 'Not saved.');
      return;
    }
    onStatusChange();
  }

  async function saveStatus() {
    const body: any = { status: newStatus };
    if (newStatus === 'CANCELLED') {
      const msg = paid
        ? 'Cancel this paid order? Its products go back into stock, any subscription it started is cancelled, and it will show “Refund due” until you record the refund.'
        : 'Cancel this unpaid order? Its products go back on sale.';
      if (!confirm(msg)) return;
      const reason = prompt('Reason (optional, kept on the order):') ?? '';
      if (reason) body.reason = reason;
    }
    if (newStatus === 'REFUNDED') {
      const full = Number(order.payments?.find((p: any) => p.status === 'PAID')?.amount ?? order.total);
      const answer = prompt(`Amount refunded in the payment provider’s portal (₾). Full payment: ${full.toFixed(2)}`, full.toFixed(2));
      if (answer === null) return;
      body.refundAmount = Number(answer.replace(',', '.'));
      const reason = prompt('Reason (optional):') ?? '';
      if (reason) body.reason = reason;
    }
    setSaving(true);
    setStatusError('');
    const res = await fetch(`${API}/orders/admin/${order.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const r = await res.json().catch(() => ({}));
      setStatusError((Array.isArray(r.message) ? r.message[0] : r.message) || 'Not saved.');
      return;
    }
    onStatusChange();
  }

  async function saveTracking() {
    setSaving(true);
    await fetch(`${API}/orders/admin/${order.id}/tracking`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ trackingNumber: tracking, internalNotes: notes }),
    });
    setSaving(false);
    onTrackingUpdate();
  }

  const addr = order.address;
  const payment = order.payments?.[0];
  const paymentStatus = payment?.status || '—';
  const payBadge = STATUS_COLORS[paymentStatus] || { background: 'var(--slate-50)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)' };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, backdropFilter: 'blur(2px)' }} />
      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, width: 580, height: '100%', background: 'var(--white)', zIndex: 51, overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}>
        {/* Drawer header */}
        <div style={{ position: 'sticky', top: 0, background: 'var(--white)', borderBottom: '1px solid var(--slate-200b)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: 'var(--slate-900)', background: 'var(--slate-100)', padding: '4px 10px', borderRadius: 7 }}>#{(order.orderNumber || order.id).slice(-10).toUpperCase()}</span>
              <TypeBadge type={order.type} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '4px 0 0' }}>{new Date(order.createdAt).toLocaleString('en-GB')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href={`/dashboard/orders/${order.id}/invoice`} target="_blank" style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal-600)', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', borderRadius: 8, padding: '6px 12px', textDecoration: 'none' }}>🧾 Invoice</Link>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--slate-200)', background: 'var(--white)', cursor: 'pointer', fontSize: 18, color: 'var(--slate-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Progress */}
          <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-900)' }}>Order Progress</span>
              <span><StatusBadge status={order.status} />{order.refundDue && <RefundDueBadge />}</span>
            </div>
            <StatusProgress status={order.status} />
          </div>

          {/* Customer + Dog */}
          <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Customer</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--sky-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: 0, fontSize: 14 }}>{order.user?.firstName} {order.user?.lastName}</p>
                <p style={{ fontSize: 12, color: 'var(--slate-500)', margin: '2px 0 0' }}>{order.user?.email}</p>
                {order.user?.phone && <p style={{ fontSize: 12, color: 'var(--slate-400)', margin: '2px 0 0' }}>{order.user.phone}</p>}
              </div>
            </div>
            {order.dog && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--slate-200b)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>🐾</span>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--slate-900)', margin: 0, fontSize: 13 }}>{order.dog.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{[order.dog.breed, order.dog.size, order.dog.gender].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Shipping address */}
          {addr && (
            <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '16px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Shipping Address</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📍</span>
                <div style={{ fontSize: 13, color: 'var(--slate-800)', lineHeight: 1.7 }}>
                  <strong>{addr.firstName} {addr.lastName}</strong><br />
                  {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                  {addr.city}{addr.postalCode ? ` ${addr.postalCode}` : ''}, {addr.country}<br />
                  <span style={{ color: 'var(--slate-500)' }}>{addr.phone}</span>
                </div>
              </div>
              {order.deliveryMethod && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--slate-200b)', fontSize: 12, color: 'var(--slate-500)' }}>
                  🚚 {order.deliveryMethod.name}{order.deliveryCost > 0 ? ` · ₾${Number(order.deliveryCost).toFixed(2)}` : ' · Free'}
                  {order.deliveryMethod.estimatedDays && ` · ${order.deliveryMethod.estimatedDays} days`}
                </div>
              )}
            </div>
          )}

          {/* Order items */}
          <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Items ({order.items?.length || 0})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(order.items || []).map((item: any, i: number) => {
                const img = item.product?.images?.[0]?.url;
                return (
                  <div key={item.id || i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--slate-200b)' : 'none' }}>
                    {img ? (
                      <img src={img} alt={item.name} style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', border: '1px solid var(--slate-200b)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 7, background: 'var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0, fontSize: 13 }}>{item.name}</p>
                      <ChoiceNote choice={item.personalisation} />
                      {item.sku && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0', fontFamily: 'monospace' }}>{item.sku}</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: 'var(--slate-900)', margin: 0, fontSize: 13 }}>₾{Number(item.total).toFixed(2)}</p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>×{item.quantity} @ ₾{Number(item.price).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Totals */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '2px solid var(--slate-200b)' }}>
              {Number(order.discountAmount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--green-600)', marginBottom: 4 }}>
                  <span>Discount {order.coupon ? `(${order.coupon.code})` : ''}</span>
                  <span>−₾{Number(order.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {Number(order.deliveryCost) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate-500)', marginBottom: 4 }}>
                  <span>Delivery</span><span>₾{Number(order.deliveryCost).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: 'var(--slate-900)', marginTop: 4 }}>
                <span>Total</span><span>₾{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Payment</p>
            {payment ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ ...payBadge, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{paymentStatus}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--slate-900)' }}>{payment.currency} ₾{Number(payment.amount).toFixed(2)}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '6px 0 0' }}>Provider: {payment.provider}</p>
                  {payment.providerPaymentId && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0', fontFamily: 'monospace' }}>ID: {payment.providerPaymentId}</p>}
                  {payment.paidAt && <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>Paid: {new Date(payment.paidAt).toLocaleString('en-GB')}</p>}
                  {payment.refunds?.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--slate-200b)' }}>
                      {payment.refunds.map((r: any) => (
                        <p key={r.id} style={{ fontSize: 11, color: 'var(--red-600)', margin: '2px 0' }}>↩ Refund: ₾{Number(r.amount).toFixed(2)}{r.reason ? ` — ${r.reason}` : ''}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>No payment recorded</p>}
          </div>

          {/* Subscription info */}
          {order.subscription && (
            <div style={{ background: 'var(--teal-50)', borderRadius: 12, border: '1px solid var(--teal-200)', padding: '16px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-600)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Subscription</p>
              <div style={{ fontSize: 13, color: 'var(--slate-800)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span><strong>Plan:</strong> {order.subscription.plan?.name}</span>
                <span><strong>Status:</strong> {order.subscription.status}</span>
                <span><strong>Boxes:</strong> {order.subscription.boxesDelivered} / {order.subscription.boxesTotal} delivered</span>
                {order.subscription.nextRenewalAt && <span><strong>Next renewal:</strong> {new Date(order.subscription.nextRenewalAt).toLocaleDateString('en-GB')}</span>}
              </div>
            </div>
          )}

          {/* Status update */}
          <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Update Status</p>
            {order.refundDue && (
              <div style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--red-700)', background: 'var(--red-50)', border: '1px solid var(--red-200)', borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span><strong>Refund due ₾{Number(order.refundDueValue).toFixed(2)}.</strong> Pay it back in the payment provider’s portal, then record it here.</span>
                <button onClick={recordRefund} disabled={saving} style={{ background: 'var(--red-600)', color: 'var(--white)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Record refund</button>
              </div>
            )}
            {next.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)' }}>This order is {order.status.toLowerCase()} — nothing more to change.</p>
            ) : (
            <>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={newStatus} onChange={e => { setNewStatus(e.target.value); setStatusError(''); }} style={{ flex: 1, border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--white)' }}>
                {[order.status, ...next].map(s => <option key={s} value={s}>{s === order.status ? `${s} (now)` : s}</option>)}
              </select>
              <button onClick={saveStatus} disabled={saving || newStatus === order.status} style={{ padding: '8px 16px', background: newStatus === order.status ? 'var(--slate-200)' : 'var(--teal-600)', color: newStatus === order.status ? 'var(--slate-400)' : 'var(--white)', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: saving || newStatus === order.status ? 'default' : 'pointer' }}>
                {saving ? '…' : 'Save'}
              </button>
            </div>
            {newStatus !== order.status && STEP_HELP[newStatus] && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--slate-500)' }}>{STEP_HELP[newStatus]}</p>}
            {statusError && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--red-600)' }}>{statusError}</p>}
            </>
            )}
          </div>

          {/* Tracking + notes */}
          <div style={{ background: 'var(--slate-50)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Tracking & Notes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Tracking number" style={{ border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--white)' }} />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes (not visible to customer)…" rows={3} style={{ border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--white)', resize: 'vertical', fontFamily: 'inherit' }} />
              <button onClick={saveTracking} disabled={saving} style={{ alignSelf: 'flex-start', padding: '8px 16px', background: 'var(--teal-600)', color: 'var(--white)', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>Save tracking</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  const token = () => localStorage.getItem('admin_token');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) q.set('status', statusFilter);
      if (typeFilter) q.set('type', typeFilter);
      if (planFilter) q.set('planId', planFilter);
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);
      if (search) q.set('search', search);
      if (sort) { q.set('sortBy', sort.split('_')[0]); q.set('sortDir', sort.split('_')[1]); }
      const res = await fetch(`${API}/orders/admin?${q}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setSummary(data.summary || null);
    } catch { } finally { setLoading(false); }
  }, [page, statusFilter, typeFilter, planFilter, dateFrom, dateTo, search, sort]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    fetch(`${API}/admin/subscription-plans`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => setPlans((d.items || d || []).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))))
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>Orders</h1>
        <p style={{ fontSize: 13, color: 'var(--slate-400)', marginTop: 4 }}>
          Subscription boxes and shop products in one list — filter by channel below.
        </p>
      </div>

      {/* Summary — reflects every active filter, not just this page */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            {
              label: 'Orders matching filters', value: summary.totalOrders.toLocaleString(), accent: 'var(--slate-900)',
              sub: `${gel(summary.totalValue)} order value`,
            },
            {
              label: 'Revenue collected', value: gel(summary.paidRevenue), accent: 'var(--emerald-600)',
              sub: summary.totalValue > 0 ? `${Math.round((summary.paidRevenue / summary.totalValue) * 100)}% of order value` : '—',
            },
            {
              label: 'In progress', value: summary.paidCount.toLocaleString(), accent: 'var(--blue-600)',
              sub: `${summary.pendingCount} awaiting payment`,
            },
            {
              label: 'Problem orders', value: (summary.failedCount + summary.refundedCount).toLocaleString(),
              accent: summary.failedCount + summary.refundedCount > 0 ? 'var(--red-600)' : 'var(--emerald-600)',
              sub: `${summary.refundDueCount ? `${summary.refundDueCount} refund due · ` : ''}${summary.failedCount} failed · ${summary.refundedCount} refunded or cancelled`,
            },
          ].map((c) => (
            <div key={c.label} style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--slate-200b)', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
              <div style={{ fontSize: 23, fontWeight: 800, color: c.accent, lineHeight: 1.15, marginTop: 4 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 3 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Status</span>
        {[{ value: '', label: 'All' }, ...ORDER_STATUSES.map(s => ({ value: s, label: s }))].map(({ value, label }) => (
          <button key={value} onClick={() => { setStatusFilter(value); setPage(1); }} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${statusFilter === value ? 'var(--teal-600)' : 'var(--slate-200)'}`, background: statusFilter === value ? 'var(--teal-600)' : 'var(--white)', color: statusFilter === value ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Channel filter — pills come from the types actually present in the data */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Channel</span>
        {[
          {
            value: '', label: 'All', icon: '',
            // Sum of byType, which ignores the type filter — using the filtered
            // total would make "All" shrink to the channel already selected.
            count: summary ? ((summary.byType ?? []) as { count: number }[]).reduce((s, t) => s + t.count, 0) : null,
          },
          ...((summary?.byType ?? []) as { type: string; count: number }[]).map((t) => ({
            value: t.type,
            label: TYPE_LABELS[t.type] ?? t.type,
            icon: TYPE_ICONS[t.type] ?? '',
            count: t.count,
          })),
        ].map(({ value, label, icon, count }) => {
          const active = typeFilter === value;
          return (
            <button key={value} onClick={() => { setTypeFilter(value); setPage(1); }} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? 'var(--teal-600)' : 'var(--slate-200)'}`, background: active ? 'var(--teal-600)' : 'var(--white)', color: active ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {icon && <span>{icon}</span>}
              <span>{label}</span>
              {count !== null && count !== undefined && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 999, background: active ? 'rgba(255,255,255,0.25)' : 'var(--slate-100)', color: active ? 'var(--white)' : 'var(--slate-500)' }}>{count}</span>
              )}
            </button>
          );
        })}
        {typeFilter === 'MIXED' && (
          <span style={{ fontSize: 11, color: 'var(--slate-400)', marginLeft: 4 }}>
            orders containing a plan <em>and</em> shop products
          </span>
        )}
      </div>

      {/* Subscription plan filter pills — auto-populated from API */}
      {plans.length > 0 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Plan</span>
          {[{ id: '', name: 'All Plans' }, ...plans].map(p => (
            <button key={p.id} onClick={() => { setPlanFilter(p.id); setPage(1); }} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${planFilter === p.id ? 'var(--violet-700)' : 'var(--slate-200)'}`, background: planFilter === p.id ? 'var(--violet-700)' : 'var(--white)', color: planFilter === p.id ? 'var(--white)' : 'var(--slate-500)', transition: 'all 0.15s' }}>
              {p.name}
              {p.badge === 'popular' && <span style={{ marginLeft: 5, fontSize: 9, background: 'rgba(255,255,255,0.25)', borderRadius: 4, padding: '1px 4px' }}>★</span>}
            </button>
          ))}
        </div>
      )}

      {/* Sort + date range + search toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Sort icon buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--slate-100)', borderRadius: 10, padding: '3px 4px' }}>
          {([
            { field: 'createdAt', icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label: 'Date' },
            { field: 'total',     icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label: 'Total' },
          ] as const).map(({ field, icon, label }) => {
            const active = sort.startsWith(field);
            const asc = sort === `${field}_asc`;
            return (
              <button
                key={field}
                title={label}
                onClick={() => { setSort(active ? (asc ? `${field}_desc` : '') : `${field}_asc`); setPage(1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: active ? 'var(--white)' : 'transparent', color: active ? 'var(--teal-600)' : 'var(--slate-400)', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.12s' }}
              >
                {icon}
                <span>{label}</span>
                {active && (
                  <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {asc ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600 }}>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            style={{ border: `1.5px solid ${dateFrom ? 'var(--teal-600)' : 'var(--slate-200)'}`, borderRadius: 9, padding: '5px 10px', fontSize: 12, outline: 'none', background: dateFrom ? 'var(--teal-50)' : 'var(--white)', color: dateFrom ? 'var(--teal-600)' : 'var(--slate-500)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600 }}>To</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            style={{ border: `1.5px solid ${dateTo ? 'var(--teal-600)' : 'var(--slate-200)'}`, borderRadius: 9, padding: '5px 10px', fontSize: 12, outline: 'none', background: dateTo ? 'var(--teal-50)' : 'var(--white)', color: dateTo ? 'var(--teal-600)' : 'var(--slate-500)', cursor: 'pointer' }}
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} style={{ background: 'var(--red-50)', border: 'none', borderRadius: 7, padding: '5px 9px', fontSize: 11, color: 'var(--red-600)', cursor: 'pointer', fontWeight: 600 }}>× Clear</button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', pointerEvents: 'none' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order #, name, email…"
            style={{ paddingLeft: 32, paddingRight: search ? 32 : 14, paddingTop: 7, paddingBottom: 7, fontSize: 13, border: '1.5px solid var(--slate-200)', borderRadius: 999, outline: 'none', background: 'var(--white)', width: 240 }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--slate-200b)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid var(--teal-200)', borderTopColor: 'var(--teal-600)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', color: 'var(--slate-300)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            <p style={{ fontSize: 13 }}>No orders found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Order #', 'Type', 'Customer', 'Items', 'Date', 'Total', 'Payment', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--slate-200b)', background: 'var(--slate-50)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => {
                const payment = order.payments?.[0];
                return (
                  <tr key={order.id} onClick={() => setSelected(order)} style={{ borderBottom: '1px solid var(--slate-50)', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-50)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--slate-900)', background: 'var(--slate-100)', padding: '4px 8px', borderRadius: 6 }}>
                        #{(order.orderNumber || order.id).slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}><TypeBadge type={order.type} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>{order.user?.firstName} {order.user?.lastName}</p>
                      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '2px 0 0' }}>{order.user?.email}</p>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--slate-500)' }}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--slate-500)', whiteSpace: 'nowrap' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--slate-900)' }}>₾{Number(order.total).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {payment ? <StatusBadge status={payment.status} /> : <span style={{ color: 'var(--slate-200)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={order.status} />{order.refundDue && <RefundDueBadge />}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/dashboard/orders/${order.id}/invoice`} target="_blank" onClick={e => e.stopPropagation()} style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal-600)', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', borderRadius: 7, padding: '4px 8px', textDecoration: 'none' }}>🧾</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--slate-400)' }}>Page {page} of {totalPages} · {total} orders</p>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 8, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: page === p ? 'var(--teal-600)' : 'var(--white)', color: page === p ? 'var(--white)' : 'var(--slate-500)', outline: page === p ? 'none' : '1px solid var(--slate-200)' }}>{p}</button>;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 8, cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
      )}

      {/* Order detail drawer */}
      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={() => { load(); setSelected(null); }}
          onTrackingUpdate={() => { load(); }}
        />
      )}
    </div>
  );
}
