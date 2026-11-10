'use client';
import Link from 'next/link';
import type { PlanBuilderState } from './usePlanBuilder';

/**
 * Where this plan's discounts come from. Only the plan's own discount lives
 * on the plan (Plan Settings → What it costs); promo codes and friend codes
 * are their own pages, where a code can be limited to box types and lengths.
 * Checkout reads those — nothing set here would reach it.
 */
export default function DiscountsTab({ b }: { b: PlanBuilderState }) {
  const { form, pricingTotal, pricingDiscount, setTab } = b;
  const row: React.CSSProperties = { background: 'var(--slate-50)', borderRadius: 12, border: '1px solid var(--slate-200b)', padding: '16px 18px' };
  const link: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--teal-600)', textDecoration: 'none' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={row}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>🏷️ This plan's own discount</p>
        <p style={{ fontSize: 12.5, color: 'var(--slate-500)', margin: '0 0 10px' }}>
          {pricingDiscount > 0
            ? `${pricingDiscount}% off the monthly price — customers pay ₾${pricingTotal.toFixed(2)}.`
            : 'None. Set one under Plan Settings → What it costs, for example to make longer plans cheaper per month.'}
        </p>
        <button type="button" onClick={() => setTab('form')} style={{ ...link, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Change it →</button>
      </div>
      <div style={row}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>🎟️ Promo codes</p>
        <p style={{ fontSize: 12.5, color: 'var(--slate-500)', margin: '0 0 10px' }}>
          Codes customers type at checkout. Each code can be limited to box types{form.tierId ? ' (like this one)' : ''}, plan lengths, gifts or first orders.
        </p>
        <Link href="/dashboard/coupons" style={link}>Open Promo codes →</Link>
      </div>
      <div style={row}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>🔗 Friend codes</p>
        <p style={{ fontSize: 12.5, color: 'var(--slate-500)', margin: '0 0 10px' }}>The discount a new customer gets with a friend's code. One setting for the whole shop, at the top of Promo codes.</p>
        <Link href="/dashboard/coupons" style={link}>Open Friend codes →</Link>
      </div>
    </div>
  );
}
