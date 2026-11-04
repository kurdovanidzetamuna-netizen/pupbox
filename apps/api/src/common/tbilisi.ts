/**
 * PupBox runs on Tbilisi time: a day, a month and "today" are Tbilisi's,
 * whatever clock the server itself is set to. Georgia is UTC+4 all year
 * (no summer time). Moments are still stored in UTC.
 */
export const TBILISI = 'Asia/Tbilisi';
export const TBILISI_OFFSET = 4 * 3600_000;

/** The day a moment falls on in Tbilisi, e.g. "2026-11-04". Today when no date is given. */
export const tbilisiDay = (d: Date = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TBILISI });
