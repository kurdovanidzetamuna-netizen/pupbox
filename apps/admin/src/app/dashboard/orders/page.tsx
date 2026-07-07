'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'FAILED'];
const ORDER_TYPES = ['SUBSCRIPTION', 'PRODUCT', 'MIXED', 'RENEWAL', 'FREE_REWARD'];

const STATUS_COLORS: Record<string, any> = {
  PENDING:    { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
  PAID:       { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  PROCESSING: { background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' },
  PACKED:     { background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' },
  SHIPPED:    { background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' },
  DELIVERED:  { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
  CANCELLED:  { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  REFUNDED:   { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' },
  FAILED:     { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
};

const TYPE_COLORS: Record<string, any> = {
  SUBSCRIPTION: { background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4' },
  PRODUCT:      { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' },
  MIXED:        { background: '#fdf4ff', color: '#9333ea', border: '1px solid #e9d5ff' },
  RENEWAL:      { background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' },
  FREE_REWARD:  { background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d' },
};

const TYPE_ICONS: Record<string, string> = {
  SUBSCRIPTION: '🔄', PRODUCT: '🛍️', MIXED: '📦', RENEWAL: '♻️', FREE_REWARD: '🎁',
};

const STATUS_FLOW = ['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

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
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#0d9488' : '#e2e8f0', border: active ? '3px solid #0d9488' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
                {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 9, color: done ? '#0d9488' : '#94a3b8', fontWeight: done ? 700 : 400, marginTop: 4, whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < idx ? '#0d9488' : '#e2e8f0', margin: '0 0 16px', transition: 'background 0.2s' }} />
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

  async function saveStatus() {
    setSaving(true);
    await fetch(`${API}/orders/admin/${order.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
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
  const payBadge = STATUS_COLORS[paymentStatus] || { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 50, backdropFilter: 'blur(2px)' }} />
      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, width: 580, height: '100%', background: '#fff', zIndex: 51, overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}>
        {/* Drawer header */}
        <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #e8ecf0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '4px 10px', borderRadius: 7 }}>#{(order.orderNumber || order.id).slice(-10).toUpperCase()}</span>
              <TypeBadge type={order.type} />
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{new Date(order.createdAt).toLocaleString('en-GB')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href={`/dashboard/orders/${order.id}/invoice`} target="_blank" style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: '6px 12px', textDecoration: 'none' }}>🧾 Invoice</Link>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 18, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Progress */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Order Progress</span>
              <StatusBadge status={order.status} />
            </div>
            <StatusProgress status={order.status} />
          </div>

          {/* Customer + Dog */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Customer</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
              <div>
                <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 14 }}>{order.user?.firstName} {order.user?.lastName}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{order.user?.email}</p>
                {order.user?.phone && <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{order.user.phone}</p>}
              </div>
            </div>
            {order.dog && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e8ecf0', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>🐾</span>
                <div>
                  <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 13 }}>{order.dog.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{[order.dog.breed, order.dog.size, order.dog.gender].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Shipping address */}
          {addr && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Shipping Address</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📍</span>
                <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7 }}>
                  <strong>{addr.firstName} {addr.lastName}</strong><br />
                  {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                  {addr.city}{addr.postalCode ? ` ${addr.postalCode}` : ''}, {addr.country}<br />
                  <span style={{ color: '#64748b' }}>{addr.phone}</span>
                </div>
              </div>
              {order.deliveryMethod && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e8ecf0', fontSize: 12, color: '#64748b' }}>
                  🚚 {order.deliveryMethod.name}{order.deliveryCost > 0 ? ` · ₾${Number(order.deliveryCost).toFixed(2)}` : ' · Free'}
                  {order.deliveryMethod.estimatedDays && ` · ${order.deliveryMethod.estimatedDays} days`}
                </div>
              )}
            </div>
          )}

          {/* Order items */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Items ({order.items?.length || 0})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(order.items || []).map((item: any, i: number) => {
                const img = item.product?.images?.[0]?.url;
                return (
                  <div key={item.id || i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: i < order.items.length - 1 ? '1px solid #e8ecf0' : 'none' }}>
                    {img ? (
                      <img src={img} alt={item.name} style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', border: '1px solid #e8ecf0', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: 7, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: '#1e293b', margin: 0, fontSize: 13 }}>{item.name}</p>
                      {item.sku && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>{item.sku}</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 13 }}>₾{Number(item.total).toFixed(2)}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>×{item.quantity} @ ₾{Number(item.price).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Totals */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '2px solid #e8ecf0' }}>
              {Number(order.discountAmount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#16a34a', marginBottom: 4 }}>
                  <span>Discount {order.coupon ? `(${order.coupon.code})` : ''}</span>
                  <span>−₾{Number(order.discountAmount).toFixed(2)}</span>
                </div>
              )}
              {Number(order.deliveryCost) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                  <span>Delivery</span><span>₾{Number(order.deliveryCost).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                <span>Total</span><span>₾{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Payment</p>
            {payment ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20 }}>💳</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ ...payBadge, display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{paymentStatus}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{payment.currency} ₾{Number(payment.amount).toFixed(2)}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>Provider: {payment.provider}</p>
                  {payment.providerPaymentId && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', fontFamily: 'monospace' }}>ID: {payment.providerPaymentId}</p>}
                  {payment.paidAt && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>Paid: {new Date(payment.paidAt).toLocaleString('en-GB')}</p>}
                  {payment.refunds?.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e8ecf0' }}>
                      {payment.refunds.map((r: any) => (
                        <p key={r.id} style={{ fontSize: 11, color: '#dc2626', margin: '2px 0' }}>↩ Refund: ₾{Number(r.amount).toFixed(2)}{r.reason ? ` — ${r.reason}` : ''}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : <p style={{ fontSize: 13, color: '#94a3b8' }}>No payment recorded</p>}
          </div>

          {/* Subscription info */}
          {order.subscription && (
            <div style={{ background: '#f0fdfa', borderRadius: 12, border: '1px solid #99f6e4', padding: '16px 20px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Subscription</p>
              <div style={{ fontSize: 13, color: '#1e293b', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span><strong>Plan:</strong> {order.subscription.plan?.name}</span>
                <span><strong>Status:</strong> {order.subscription.status}</span>
                <span><strong>Boxes:</strong> {order.subscription.boxesDelivered} / {order.subscription.boxesTotal} delivered</span>
                {order.subscription.nextRenewalAt && <span><strong>Next renewal:</strong> {new Date(order.subscription.nextRenewalAt).toLocaleDateString('en-GB')}</span>}
              </div>
            </div>
          )}

          {/* Status update */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Update Status</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fff' }}>
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={saveStatus} disabled={saving || newStatus === order.status} style={{ padding: '8px 16px', background: newStatus === order.status ? '#e2e8f0' : '#0d9488', color: newStatus === order.status ? '#94a3b8' : '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: saving || newStatus === order.status ? 'default' : 'pointer' }}>
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Tracking + notes */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Tracking & Notes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Tracking number" style={{ border: '1px solid #e2e8f0', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fff' }} />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes (not visible to customer)…" rows={3} style={{ border: '1px solid #e2e8f0', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: '#fff', resize: 'vertical', fontFamily: 'inherit' }} />
              <button onClick={saveTracking} disabled={saving} style={{ alignSelf: 'flex-start', padding: '8px 16px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>Save tracking</button>
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Orders</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{total} orders total</p>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Status</span>
        {[{ value: '', label: 'All' }, ...ORDER_STATUSES.map(s => ({ value: s, label: s }))].map(({ value, label }) => (
          <button key={value} onClick={() => { setStatusFilter(value); setPage(1); }} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${statusFilter === value ? '#0d9488' : '#e2e8f0'}`, background: statusFilter === value ? '#0d9488' : '#fff', color: statusFilter === value ? '#fff' : '#64748b', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Type + Subscription plan filter row */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Type</span>
        {[{ value: '', label: 'All', icon: '' }, ...ORDER_TYPES.map(t => ({ value: t, label: t, icon: TYPE_ICONS[t] }))].map(({ value, label, icon }) => (
          <button key={value} onClick={() => { setTypeFilter(value); setPage(1); }} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${typeFilter === value ? '#0d9488' : '#e2e8f0'}`, background: typeFilter === value ? '#0d9488' : '#fff', color: typeFilter === value ? '#fff' : '#64748b', transition: 'all 0.15s' }}>
            {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
          </button>
        ))}
      </div>

      {/* Subscription plan filter pills — auto-populated from API */}
      {plans.length > 0 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Plan</span>
          {[{ id: '', name: 'All Plans' }, ...plans].map(p => (
            <button key={p.id} onClick={() => { setPlanFilter(p.id); setPage(1); }} style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${planFilter === p.id ? '#6d28d9' : '#e2e8f0'}`, background: planFilter === p.id ? '#6d28d9' : '#fff', color: planFilter === p.id ? '#fff' : '#64748b', transition: 'all 0.15s' }}>
              {p.name}
              {p.badge === 'popular' && <span style={{ marginLeft: 5, fontSize: 9, background: 'rgba(255,255,255,0.25)', borderRadius: 4, padding: '1px 4px' }}>★</span>}
            </button>
          ))}
        </div>
      )}

      {/* Sort + date range + search toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Sort icon buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: '3px 4px' }}>
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
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: active ? '#fff' : 'transparent', color: active ? '#0d9488' : '#94a3b8', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.12s' }}
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
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            style={{ border: `1.5px solid ${dateFrom ? '#0d9488' : '#e2e8f0'}`, borderRadius: 9, padding: '5px 10px', fontSize: 12, outline: 'none', background: dateFrom ? '#f0fdfa' : '#fff', color: dateFrom ? '#0d9488' : '#64748b', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>To</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            style={{ border: `1.5px solid ${dateTo ? '#0d9488' : '#e2e8f0'}`, borderRadius: 9, padding: '5px 10px', fontSize: 12, outline: 'none', background: dateTo ? '#f0fdfa' : '#fff', color: dateTo ? '#0d9488' : '#64748b', cursor: 'pointer' }}
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} style={{ background: '#fef2f2', border: 'none', borderRadius: 7, padding: '5px 9px', fontSize: 11, color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>× Clear</button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order #, name, email…"
            style={{ paddingLeft: 32, paddingRight: search ? 32 : 14, paddingTop: 7, paddingBottom: 7, fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 999, outline: 'none', background: '#fff', width: 240 }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 32, height: 32, border: '4px solid #99f6e4', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', color: '#cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
            <p style={{ fontSize: 13 }}>No orders found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Order #', 'Type', 'Customer', 'Items', 'Date', 'Total', 'Payment', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8ecf0', background: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => {
                const payment = order.payments?.[0];
                return (
                  <tr key={order.id} onClick={() => setSelected(order)} style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#0f172a', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>
                        #{(order.orderNumber || order.id).slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}><TypeBadge type={order.type} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>{order.user?.firstName} {order.user?.lastName}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{order.user?.email}</p>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>₾{Number(order.total).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {payment ? <StatusBadge status={payment.status} /> : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={order.status} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/dashboard/orders/${order.id}/invoice`} target="_blank" onClick={e => e.stopPropagation()} style={{ fontSize: 11, fontWeight: 600, color: '#0d9488', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 7, padding: '4px 8px', textDecoration: 'none' }}>🧾</Link>
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
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Page {page} of {totalPages} · {total} orders</p>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: page === p ? '#0d9488' : '#fff', color: page === p ? '#fff' : '#64748b', outline: page === p ? 'none' : '1px solid #e2e8f0' }}>{p}</button>;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
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
