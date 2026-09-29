'use client';
import React from 'react';
import Link from 'next/link';

/**
 * Presentational building blocks for the admin dashboard.
 *
 * Everything here is styled with the CSS custom properties from globals.css
 * (never raw hex) so the whole dashboard follows the light/dark theme toggle.
 */

// ── Channel identity ────────────────────────────────────────────────────────
// The two sales channels are colour-coded consistently everywhere they appear.
export const CHANNEL = {
  subscription: { accent: 'var(--teal-600)', soft: 'var(--teal-200)', bg: 'var(--teal-50)', label: 'Subscription boxes', emoji: '🔄' },
  ecommerce: { accent: 'var(--violet-500)', soft: 'var(--violet-200)', bg: 'var(--violet-50)', label: 'Shop products', emoji: '🛍️' },
} as const;

export const card: React.CSSProperties = {
  background: 'var(--white)',
  borderRadius: 16,
  border: '1px solid var(--slate-200b)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

export const money = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `₾${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `₾${(v / 1000).toFixed(1)}k`;
  return `₾${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

// ── Change indicator ────────────────────────────────────────────────────────

/**
 * A percentage delta against the previous period of equal length.
 * `inverse` flips the colour meaning for metrics where up is bad (churn, failures).
 */
export function Delta({ value, inverse = false, suffix = 'vs previous period' }: { value?: number | null; inverse?: boolean; suffix?: string }) {
  if (value === undefined) return null;
  // null means the previous period had nothing to compare against — saying
  // "↑100%" there would invent a trend out of an empty baseline.
  if (value === null) {
    return (
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--slate-400)', marginTop: 6 }}>
        no activity in previous period
      </div>
    );
  }
  const up = value >= 0;
  const good = inverse ? !up : up;
  // A flat period is neither good nor bad — don't paint it green.
  const color = value === 0 ? 'var(--slate-400)' : good ? 'var(--emerald-600)' : 'var(--red-600)';
  return (
    <div style={{ fontSize: 11.5, fontWeight: 600, color, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{value === 0 ? '–' : up ? '↑' : '↓'}</span>
      <span>{Math.abs(value)}%</span>
      <span style={{ color: 'var(--slate-400)', fontWeight: 500 }}>{suffix}</span>
    </div>
  );
}

// ── Metric card ─────────────────────────────────────────────────────────────

export function MetricCard({
  label, value, sub, change, inverseChange, emoji, accent = 'var(--teal-600)', bg = 'var(--teal-50)', href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  change?: number | null;
  inverseChange?: boolean;
  emoji?: string;
  accent?: string;
  bg?: string;
  href?: string;
}) {
  const body = (
    <div style={{ ...card, padding: 20, display: 'flex', gap: 14, alignItems: 'flex-start', height: '100%', boxSizing: 'border-box' }}>
      {emoji && (
        <div style={{ width: 42, height: 42, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
          {emoji}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 25, fontWeight: 800, color: accent, lineHeight: 1.05, wordBreak: 'break-word' }}>{value}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 5 }}>{sub}</div>}
        <Delta value={change} inverse={inverseChange} />
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{body}</Link> : body;
}

// ── Composition bar ─────────────────────────────────────────────────────────

export interface Segment { label: string; value: number; color: string }

/**
 * A single bar split into mutually-exclusive parts, with a legend underneath.
 * Only pass segments that genuinely partition the whole — overlapping counts
 * (like per-channel order counts, where MIXED sits in both) would mislead.
 */
export function CompositionBar({ segments, total, format }: {
  segments: Segment[];
  total: number;
  /** Renders each legend figure — pass `money` for currency segments. */
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => v.toLocaleString());
  const visible = segments.filter((s) => s.value > 0);
  if (total <= 0 || visible.length === 0) {
    return <div style={{ height: 6, borderRadius: 3, background: 'var(--slate-100)', marginTop: 10 }} />;
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--slate-100)', gap: 1.5 }}>
        {visible.map((s) => (
          <div key={s.label} title={`${s.label}: ${fmt(s.value)} (${Math.round((s.value / total) * 100)}%)`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 7 }}>
        {visible.map((s) => (
          <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--slate-500)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <strong style={{ color: 'var(--slate-800)', fontWeight: 700 }}>{fmt(s.value)}</strong>
            <span>{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Headline card with a primary figure, an optional composition bar, and a row
 * of secondary figures — for cases where one number alone hides the story.
 */
export function InsightCard({
  label, emoji, bg, accent = 'var(--slate-900)', value, valueSuffix, change, inverseChange,
  segments, segmentTotal, segmentFormat, stats, footer, href,
}: {
  label: string;
  emoji: string;
  bg: string;
  accent?: string;
  value: React.ReactNode;
  valueSuffix?: string;
  change?: number | null;
  inverseChange?: boolean;
  segments?: Segment[];
  segmentTotal?: number;
  segmentFormat?: (v: number) => string;
  stats?: { label: string; value: React.ReactNode; color?: string }[];
  footer?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div style={{ ...card, padding: 20, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{emoji}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</span>
        {valueSuffix && <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>{valueSuffix}</span>}
      </div>
      {change !== undefined && <Delta value={change} inverse={inverseChange} />}

      {segments && <CompositionBar segments={segments} total={segmentTotal ?? segments.reduce((s, x) => s + x.value, 0)} format={segmentFormat} />}

      {stats && stats.length > 0 && (
        <div style={{ display: 'flex', gap: 18, marginTop: 'auto', paddingTop: 12, flexWrap: 'wrap' }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.color ?? 'var(--slate-800)', lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--slate-400)', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {footer && <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 10 }}>{footer}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{body}</Link> : body;
}

// ── Section header ──────────────────────────────────────────────────────────

export function SectionHeader({ emoji, title, subtitle, accent, action }: {
  emoji: string; title: string; subtitle: string; accent: string; action?: { label: string; href: string };
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 14px' }}>
      <div style={{ width: 4, height: 34, borderRadius: 3, background: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span>{emoji}</span>{title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: 1 }}>{subtitle}</div>
      </div>
      {action && (
        <Link href={action.href} style={{ fontSize: 12, fontWeight: 600, color: accent, textDecoration: 'none', whiteSpace: 'nowrap', border: `1px solid ${accent}`, borderRadius: 8, padding: '5px 12px' }}>
          {action.label} →
        </Link>
      )}
    </div>
  );
}

export function Panel({ title, subtitle, children, action, minHeight }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: { label: string; href: string }; minHeight?: number;
}) {
  return (
    <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', minHeight }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-900)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: 'var(--slate-400)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action && (
          <Link href={action.href} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--teal-600)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {action.label} →
          </Link>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}

export function EmptyState({ emoji, text, height = 120 }: { emoji: string; text: string; height?: number }) {
  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--slate-300)' }}>
      <div style={{ fontSize: 26 }}>{emoji}</div>
      <div style={{ fontSize: 12.5 }}>{text}</div>
    </div>
  );
}

// ── Stacked channel chart ───────────────────────────────────────────────────

export interface SeriesPoint {
  label: string;
  subscriptionRevenue: number;
  ecommerceRevenue: number;
  subscriptionOrders: number;
  ecommerceOrders: number;
  registrations: number;
}

type ChartMetric = 'revenue' | 'orders';

/**
 * Revenue or order volume per bucket, stacked so the channel mix is readable
 * at a glance and the column height still shows the combined total.
 */
export function StackedChannelChart({ series, metric, height = 200 }: { series: SeriesPoint[]; metric: ChartMetric; height?: number }) {
  const valueOf = (p: SeriesPoint) =>
    metric === 'revenue'
      ? { sub: p.subscriptionRevenue, ecom: p.ecommerceRevenue }
      : { sub: p.subscriptionOrders, ecom: p.ecommerceOrders };

  const totals = series.map((p) => { const v = valueOf(p); return v.sub + v.ecom; });
  const max = Math.max(...totals, 1);
  const fmt = (v: number) => (metric === 'revenue' ? money(v) : String(v));

  // With many buckets, printing every label turns the axis into a smear.
  const labelStep = series.length > 24 ? 4 : series.length > 14 ? 2 : 1;

  if (series.length === 0) return <EmptyState emoji="📊" text="No activity in this period" height={height} />;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: series.length > 20 ? 2 : 5, height, marginBottom: 8 }}>
        {series.map((p, i) => {
          const v = valueOf(p);
          const total = v.sub + v.ecom;
          const subH = (v.sub / max) * height;
          const ecomH = (v.ecom / max) * height;
          return (
            <div
              key={i}
              title={`${p.label}\n${CHANNEL.subscription.label}: ${fmt(v.sub)}\n${CHANNEL.ecommerce.label}: ${fmt(v.ecom)}\nTotal: ${fmt(total)}`}
              style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', cursor: 'default' }}
            >
              <div style={{ width: '100%', height: Math.max(0, ecomH), background: CHANNEL.ecommerce.accent, borderRadius: '4px 4px 0 0', minHeight: v.ecom > 0 ? 2 : 0 }} />
              <div style={{ width: '100%', height: Math.max(0, subH), background: CHANNEL.subscription.accent, borderRadius: v.ecom > 0 ? 0 : '4px 4px 0 0', minHeight: v.sub > 0 ? 2 : 0 }} />
              {total === 0 && <div style={{ width: '100%', height: 2, background: 'var(--slate-200)', borderRadius: 2 }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: series.length > 20 ? 2 : 5, borderTop: '1px solid var(--slate-200b)', paddingTop: 6 }}>
        {series.map((p, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, fontSize: 9.5, color: 'var(--slate-400)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {i % labelStep === 0 ? p.label : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { color: string; label: string; value?: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: 'var(--slate-500)', fontWeight: 500 }}>{it.label}</span>
          {it.value && <span style={{ fontSize: 11.5, color: 'var(--slate-900)', fontWeight: 700 }}>{it.value}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Single-series bar chart (registrations) ─────────────────────────────────

export function SimpleBarChart({ series, color, height = 130 }: {
  series: { label: string; value: number }[]; color: string; height?: number;
}) {
  if (series.length === 0) return <EmptyState emoji="👥" text="No registrations in this period" height={height} />;
  const max = Math.max(...series.map((s) => s.value), 1);
  const labelStep = series.length > 24 ? 4 : series.length > 14 ? 2 : 1;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: series.length > 20 ? 2 : 5, height, marginBottom: 8 }}>
        {series.map((s, i) => (
          <div key={i} title={`${s.label}: ${s.value} registered`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', height: Math.max(s.value > 0 ? 3 : 2, (s.value / max) * height), background: s.value > 0 ? color : 'var(--slate-200)', borderRadius: '4px 4px 0 0' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: series.length > 20 ? 2 : 5, borderTop: '1px solid var(--slate-200b)', paddingTop: 6 }}>
        {series.map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, fontSize: 9.5, color: 'var(--slate-400)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {i % labelStep === 0 ? s.label : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payments breakdown ──────────────────────────────────────────────────────

export interface PaymentsSummary {
  paidCount: number;
  failedCount: number;
  refundedCount: number;
  pendingCount: number;
  paidAmount: number;
  failedAmount: number;
  refundedAmount: number;
  successRate: number;
}

export function PaymentsPanel({ payments, accent }: { payments: PaymentsSummary; accent: string }) {
  const rows = [
    { key: 'Paid', count: payments.paidCount, amount: payments.paidAmount, color: 'var(--emerald-600)', bg: 'var(--green-50)' },
    { key: 'Failed', count: payments.failedCount, amount: payments.failedAmount, color: 'var(--red-600)', bg: 'var(--red-50)' },
    { key: 'Refunded', count: payments.refundedCount, amount: payments.refundedAmount, color: 'var(--amber-700)', bg: 'var(--amber-50)' },
    { key: 'Pending', count: payments.pendingCount, amount: 0, color: 'var(--slate-500)', bg: 'var(--slate-100)' },
  ];
  const attempts = rows.reduce((s, r) => s + r.count, 0);

  if (attempts === 0) return <EmptyState emoji="💳" text="No payment attempts in this period" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1 }}>{payments.successRate}%</span>
          <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>success rate · {attempts} attempts</span>
        </div>
        {/* Proportional bar — the whole point is seeing failure share at a glance. */}
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10, background: 'var(--slate-100)' }}>
          {rows.filter((r) => r.count > 0).map((r) => (
            <div key={r.key} title={`${r.key}: ${r.count}`} style={{ width: `${(r.count / attempts) * 100}%`, background: r.color }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: 'var(--slate-600)', flex: 1 }}>{r.key}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--slate-800)' }}>{r.count}</span>
            <span style={{ fontSize: 11.5, color: 'var(--slate-400)', width: 66, textAlign: 'right' }}>
              {r.key === 'Pending' ? '—' : money(r.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ranked list rows ────────────────────────────────────────────────────────

export function RankRow({ rank, title, meta, value, valueSub, share, accent, badge }: {
  rank: number; title: string; meta: string; value: string; valueSub?: string; share?: number; accent: string; badge?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--slate-100)' }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, fontSize: 10.5, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: rank === 1 ? accent : 'var(--slate-100)', color: rank === 1 ? 'var(--white)' : 'var(--slate-500)',
      }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--slate-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {badge}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--slate-400)', marginTop: 1 }}>{meta}</div>
        {share !== undefined && (
          <div style={{ height: 3, background: 'var(--slate-100)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, share)}%`, height: '100%', background: accent, borderRadius: 2 }} />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate-900)' }}>{value}</div>
        {valueSub && <div style={{ fontSize: 10.5, color: 'var(--slate-400)', marginTop: 1 }}>{valueSub}</div>}
      </div>
    </div>
  );
}

export function StockBadge({ outOfStock, lowStock }: { outOfStock: boolean; lowStock: boolean }) {
  if (!outOfStock && !lowStock) return null;
  const out = outOfStock;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
      background: out ? 'var(--red-50)' : 'var(--amber-50)',
      color: out ? 'var(--red-600)' : 'var(--amber-700)',
      border: `1px solid ${out ? 'var(--red-200)' : 'var(--amber-200)'}`,
    }}>{out ? 'OUT OF STOCK' : 'LOW STOCK'}</span>
  );
}
