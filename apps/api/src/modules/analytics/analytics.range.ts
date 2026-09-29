/**
 * Shared date-range vocabulary for the admin dashboard.
 *
 * Every analytics endpoint takes the same `range` key so the dashboard's single
 * period dropdown drives all cards at once. Each range also defines the bucket
 * width its time series should use — an hourly series over a year would be
 * unreadable, a monthly series over 24h would be a single bar.
 */

export const RANGE_KEYS = ['24h', '7d', '1m', '2m', '3m', '1y'] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export type Bucket = 'hour' | 'day' | 'week' | 'month';

export interface RangeSpec {
  key: RangeKey;
  label: string;
  /** Length of the window in milliseconds. */
  ms: number;
  bucket: Bucket;
}

const DAY = 86_400_000;

export const RANGES: Record<RangeKey, RangeSpec> = {
  '24h': { key: '24h', label: 'Last 24 hours', ms: DAY, bucket: 'hour' },
  '7d': { key: '7d', label: 'Last 7 days', ms: 7 * DAY, bucket: 'day' },
  '1m': { key: '1m', label: 'Last month', ms: 30 * DAY, bucket: 'day' },
  '2m': { key: '2m', label: 'Last 2 months', ms: 61 * DAY, bucket: 'week' },
  '3m': { key: '3m', label: 'Last 3 months', ms: 91 * DAY, bucket: 'week' },
  '1y': { key: '1y', label: 'Last year', ms: 365 * DAY, bucket: 'month' },
};

export function resolveRange(raw?: string): RangeSpec {
  const key = (raw ?? '1m') as RangeKey;
  return RANGES[key] ?? RANGES['1m'];
}

export interface ResolvedWindow {
  spec: RangeSpec;
  from: Date;
  to: Date;
  /** Immediately preceding window of identical length, for period-over-period deltas. */
  prevFrom: Date;
  prevTo: Date;
}

export function resolveWindow(raw?: string, now = new Date()): ResolvedWindow {
  const spec = resolveRange(raw);
  const to = now;
  const from = new Date(now.getTime() - spec.ms);
  const prevTo = from;
  const prevFrom = new Date(from.getTime() - spec.ms);
  return { spec, from, to, prevFrom, prevTo };
}

// ── Bucketing ───────────────────────────────────────────────────────────────

function startOfBucket(d: Date, bucket: Bucket): Date {
  const x = new Date(d);
  switch (bucket) {
    case 'hour':
      x.setMinutes(0, 0, 0);
      return x;
    case 'day':
      x.setHours(0, 0, 0, 0);
      return x;
    case 'week': {
      x.setHours(0, 0, 0, 0);
      // ISO-ish weeks starting Monday.
      const dow = (x.getDay() + 6) % 7;
      x.setDate(x.getDate() - dow);
      return x;
    }
    case 'month':
      return new Date(x.getFullYear(), x.getMonth(), 1);
  }
}

function advance(d: Date, bucket: Bucket): Date {
  const x = new Date(d);
  switch (bucket) {
    case 'hour':
      x.setHours(x.getHours() + 1);
      return x;
    case 'day':
      x.setDate(x.getDate() + 1);
      return x;
    case 'week':
      x.setDate(x.getDate() + 7);
      return x;
    case 'month':
      return new Date(x.getFullYear(), x.getMonth() + 1, 1);
  }
}

function labelFor(d: Date, bucket: Bucket): string {
  switch (bucket) {
    case 'hour':
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    case 'day':
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    case 'week':
      return `w/c ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
    case 'month':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
}

export interface TimeBucket {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Every bucket between `from` and `to`, including empty ones — a chart with
 * gaps silently lies about zero-activity periods.
 */
export function buildBuckets(from: Date, to: Date, bucket: Bucket): TimeBucket[] {
  const out: TimeBucket[] = [];
  let cursor = startOfBucket(from, bucket);
  // Guard against a pathological loop if a caller passes an inverted window.
  let guard = 0;
  while (cursor < to && guard++ < 2000) {
    const end = advance(cursor, bucket);
    out.push({ start: cursor, end, label: labelFor(cursor, bucket) });
    cursor = end;
  }
  return out;
}

/** Index of the bucket containing `d`, or -1. Assumes ascending, contiguous buckets. */
export function bucketIndex(buckets: TimeBucket[], d: Date): number {
  for (let i = 0; i < buckets.length; i++) {
    if (d >= buckets[i].start && d < buckets[i].end) return i;
  }
  // Anything at or past the final boundary belongs to the last bucket.
  if (buckets.length > 0 && d >= buckets[buckets.length - 1].start) return buckets.length - 1;
  return -1;
}

/**
 * Period-over-period change, or `null` when there is no baseline to compare to.
 *
 * Returning a number when the previous period was empty would render as
 * "↑100% vs previous period", which reads as measured growth rather than
 * "nothing happened last period". The UI shows an explicit label for null.
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return +(((current - previous) / previous) * 100).toFixed(1);
}
