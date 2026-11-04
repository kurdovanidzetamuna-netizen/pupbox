/**
 * PupBox runs on Tbilisi time: "today", a month and every date shown are
 * Tbilisi's, whatever clock the viewer's device or the server is set to.
 * Georgia is UTC+4 all year (no summer time). The API does the same.
 */
export const TBILISI = 'Asia/Tbilisi';
const OFFSET = 4 * 3600_000;
const DAY = 86400_000;

/** The day a moment falls on in Tbilisi, moved on by `days`, as "2026-11-04". Today when no date is given. */
export const tbilisiDay = (d: Date | string | number = Date.now(), days = 0) =>
  new Date(new Date(d).getTime() + OFFSET + days * DAY).toISOString().slice(0, 10);

/** This month in Tbilisi: year, month (1–12) and its first and last day as "2026-11-01" / "2026-11-30"; `shift` moves it by whole months. */
export function tbilisiMonth(shift = 0) {
  const [y, m] = tbilisiDay().split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + shift, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return { year: first.getUTCFullYear(), month: first.getUTCMonth() + 1, first: first.toISOString().slice(0, 10), last: last.toISOString().slice(0, 10) };
}

/** Whole days from Tbilisi day `a` to day `b` (both "YYYY-MM-DD"): 1 when b is the next day. */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DAY);

/** A Tbilisi day as the moment it starts ("…T00:00:00+04:00") or ends ("…T23:59:59+04:00"), for sending to the API. */
export const tbilisiStart = (day: string) => `${day}T00:00:00+04:00`;
export const tbilisiEnd = (day: string) => `${day}T23:59:59+04:00`;
