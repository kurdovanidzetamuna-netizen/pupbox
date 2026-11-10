import { TBILISI } from '@pupbox/content';

/** How admin screens write money and dates. */

/**
 * Every admin screen writes money this one way, so the same amount always
 * looks the same, to the tetri: ₾12.5 → "₾12.50", ₾12 → "₾12.00", ₾7879.9 → "₾7,879.90".
 */
export const gel = (n: unknown) => `₾${(Math.round(Number(n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "30 Oct 2026", or a dash when there's no date. */
export const day = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { timeZone: TBILISI, day: 'numeric', month: 'short', year: 'numeric' }) : '—';
