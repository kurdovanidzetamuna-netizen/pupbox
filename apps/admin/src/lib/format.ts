/** How admin screens write money and dates. */

/** ₾12.5, ₾12.50 → "₾12.50", ₾12 → "₾12". */
export const gel = (n: unknown) => `₾${Number(n || 0).toFixed(2).replace(/\.00$/, '')}`;

/** "30 Oct 2026", or a dash when there's no date. */
export const day = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
