import { TBILISI, TBILISI_OFFSET } from '../../common/tbilisi';

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
  key: RangeKey | 'custom';
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

/**
 * A period the admin picked: "2026-10-01~2026-10-31", both days included,
 * as Tbilisi days. Anything malformed, back to front or longer than two
 * years is ignored (the caller falls back to the default range).
 */
const CUSTOM = /^(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})$/;
const MAX_CUSTOM_DAYS = 731;

function customWindow(raw: string | undefined, now: Date): ResolvedWindow | null {
  const m = CUSTOM.exec(raw ?? '');
  if (!m) return null;
  const from = new Date(Date.parse(`${m[1]}T00:00:00Z`) - TBILISI_OFFSET);
  const end = new Date(Date.parse(`${m[2]}T00:00:00Z`) + DAY - TBILISI_OFFSET);
  if (isNaN(from.getTime()) || isNaN(end.getTime()) || end <= from || from > now) return null;
  const ms = end.getTime() - from.getTime();
  if (ms > MAX_CUSTOM_DAYS * DAY) return null;
  // A period that runs into the future stops at now, but is compared with
  // the same number of whole days before it.
  // The last moment of the last day: queries include `to`, and the next
  // day's midnight belongs to the next period.
  const to = end > now ? now : new Date(end.getTime() - 1);
  const bucket: Bucket = ms <= 2 * DAY ? 'hour' : ms <= 45 * DAY ? 'day' : ms <= 190 * DAY ? 'week' : 'month';
  const day = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
  const label = m[1] === m[2] ? day(m[1]) : `${day(m[1])} – ${day(m[2])}`;
  return { spec: { key: 'custom', label, ms, bucket }, from, to, prevFrom: new Date(from.getTime() - ms), prevTo: from };
}

export function resolveWindow(raw?: string, now = new Date()): ResolvedWindow {
  const custom = customWindow(raw, now);
  if (custom) return custom;
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
      return d.toLocaleTimeString('en-GB', { timeZone: TBILISI, hour: '2-digit', minute: '2-digit' });
    case 'day':
      return d.toLocaleDateString('en-GB', { timeZone: TBILISI, day: '2-digit', month: 'short' });
    case 'week':
      return `w/c ${d.toLocaleDateString('en-GB', { timeZone: TBILISI, day: '2-digit', month: 'short' })}`;
    case 'month':
      return d.toLocaleDateString('en-US', { timeZone: TBILISI, month: 'short', year: '2-digit' });
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
