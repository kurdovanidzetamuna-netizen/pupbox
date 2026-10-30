'use client';
import type { Api } from '@pupbox/content';
/** Shared bits of the orders screens: labels, colours and badges. */

export const money = (v: Api.Money | null | undefined) => `₾${Number(v || 0).toFixed(2)}`;

/** Words a person uses, not the enum. Order follows the life of an order. */
export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Unpaid', PAID: 'To pack', PROCESSING: 'Preparing', PACKED: 'Packed', SHIPPED: 'Shipped',
  DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REFUNDED: 'Refunded', FAILED: 'Failed',
};
export const ORDER_STATUSES = Object.keys(STATUS_LABEL);
export const STATUS_FLOW = ['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];

/** Plain-language names for the OrderType enum, matching the dashboard. */
export const TYPE_LABELS: Record<string, string> = { SUBSCRIPTION: 'Boxes', PRODUCT: 'Shop', MIXED: 'Both', RENEWAL: 'Renewals', FREE_REWARD: 'Rewards' };
export const TYPE_ICONS: Record<string, string> = { SUBSCRIPTION: '🔄', PRODUCT: '🛍️', MIXED: '📦', RENEWAL: '♻️', FREE_REWARD: '🎁' };

/** An order that hasn't left can still be edited. */
export const EDITABLE = ['PENDING', 'PAID', 'PROCESSING', 'PACKED'];

export const STATUS_COLORS: Record<string, any> = {
  PENDING:    { background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-200)' },
  PAID:       { background: 'var(--blue-50)', color: 'var(--blue-700)', border: '1px solid var(--blue-200)' },
  PROCESSING: { background: 'var(--violet-50)', color: 'var(--violet-700)', border: '1px solid var(--violet-200)' },
  PACKED:     { background: 'var(--indigo-50)', color: 'var(--indigo-800)', border: '1px solid var(--indigo-200)' },
  SHIPPED:    { background: 'var(--emerald-50)', color: 'var(--emerald-800)', border: '1px solid var(--emerald-300)' },
  DELIVERED:  { background: 'var(--green-50)', color: 'var(--green-800)', border: '1px solid var(--green-200)' },
  CANCELLED:  { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' },
  REFUNDED:   { background: 'var(--slate-50)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)' },
  PARTIALLY_REFUNDED: { background: 'var(--slate-50)', color: 'var(--slate-500)', border: '1px solid var(--slate-200)' },
  FAILED:     { background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)' },
};
const TYPE_COLORS: Record<string, any> = {
  SUBSCRIPTION: { background: 'var(--teal-50)', color: 'var(--teal-600)', border: '1px solid var(--teal-200)' },
  PRODUCT:      { background: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)' },
  MIXED:        { background: 'var(--fuchsia-50)', color: 'var(--purple-600)', border: '1px solid var(--purple-200)' },
  RENEWAL:      { background: 'var(--green-50)', color: 'var(--green-700)', border: '1px solid var(--green-300)' },
  FREE_REWARD:  { background: 'var(--amber-50)', color: 'var(--amber-600)', border: '1px solid var(--amber-300)' },
};

const pill = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' } as const;

export function StatusBadge({ status, payment = false }: { status: string; payment?: boolean }) {
  const label = payment ? status.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : STATUS_LABEL[status] ?? status;
  return <span style={{ ...pill, ...(STATUS_COLORS[status] || STATUS_COLORS.PENDING) }}>{label}</span>;
}

export function TypeBadge({ type }: { type: string }) {
  return <span style={{ ...pill, padding: '2px 9px', ...(TYPE_COLORS[type] || TYPE_COLORS.PRODUCT) }}>{TYPE_ICONS[type] || '📦'} {TYPE_LABELS[type] ?? type}</span>;
}

export function RefundDueBadge() {
  return <span style={{ ...pill, marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px', background: 'var(--red-50)', color: 'var(--red-700)', border: '1px solid var(--red-200)' }}>Refund due</span>;
}

/** A product line's small picture, or its kind of line. */
export function Thumb({ item, size = 36 }: { item: { product?: { images?: { url: string }[] } | null; subscriptionPlanId?: string | null; customBoxId?: string | null }; size?: number }) {
  const img = item.product?.images?.[0]?.url;
  const box = { width: size, height: size, borderRadius: Math.round(size / 4), flexShrink: 0 } as const;
  return img
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={img} alt="" style={{ ...box, objectFit: 'cover', border: '1px solid var(--slate-200b)' }} />
    : <span style={{ ...box, background: item.subscriptionPlanId ? 'var(--teal-50)' : 'var(--slate-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size / 2.2) }}>{item.subscriptionPlanId ? '🔄' : item.customBoxId ? '🧩' : '📦'}</span>;
}

export const sectionTitle = { fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' } as const;
export const card = { background: 'var(--slate-50)', borderRadius: 12, padding: '16px 20px' } as const;
export const input = { border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--white)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' } as const;
export const btn = (primary = true) => ({ padding: '8px 16px', background: primary ? 'var(--teal-600)' : 'var(--white)', color: primary ? 'var(--white)' : 'var(--slate-700)', border: primary ? 'none' : '1px solid var(--slate-200)', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' } as const);
