/**
 * A plan is Live (on the site and sold), Hidden (off the site, current
 * subscribers still renew) or Off (retired: no sales, no renewals).
 */
export function planStatus(p: { isActive?: boolean; listed?: boolean }) {
  if (!p.isActive) return { label: 'Off', bg: 'var(--slate-100)', color: 'var(--slate-400)', hint: 'Retired — no sales, no renewals' };
  if (p.listed === false) return { label: 'Hidden', bg: 'var(--amber-50)', color: 'var(--amber-800)', hint: 'Not on the site — current subscribers still renew' };
  return { label: 'Live', bg: 'var(--green-50)', color: 'var(--green-800)', hint: 'On the site and sold' };
}
