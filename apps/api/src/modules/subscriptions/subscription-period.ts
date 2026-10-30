import { DurationUnit } from '@prisma/client';

/**
 * The dates a subscription gets when it starts: when it ends, and — only if
 * the customer chose to renew — when the renewal falls due. Without these the
 * customer sees no end date, nothing ever expires, and the renewal job never
 * finds anything due.
 */
export function subscriptionPeriod(
  start: Date,
  plan: { durationValue: number; durationUnit: DurationUnit },
  autoRenewal: boolean,
): { startDate: Date; endDate: Date; nextRenewalAt: Date | null } {
  const end = new Date(start);
  const n = plan.durationValue;
  switch (plan.durationUnit) {
    case 'DAY': end.setDate(end.getDate() + n); break;
    case 'WEEK': end.setDate(end.getDate() + 7 * n); break;
    case 'MONTH': addMonths(end, n); break;
    case 'YEAR': addMonths(end, 12 * n); break;
  }
  return { startDate: start, endDate: end, nextRenewalAt: autoRenewal ? end : null };
}

/**
 * Moves a date on by whole months, keeping the day — or the month's last day
 * when it's shorter: 31 January + 1 month is 28 February, not 3 March.
 */
function addMonths(d: Date, n: number) {
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
}
