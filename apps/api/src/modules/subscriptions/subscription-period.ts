import { DurationUnit } from '@prisma/client';
import { TBILISI_OFFSET } from '../../common/tbilisi';

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
  // Counted on Tbilisi's calendar whatever clock the server runs on, so a plan
  // bought at 1am on the 1st ends on the 1st, not the last day of the month.
  const end = new Date(start.getTime() + TBILISI_OFFSET);
  const n = plan.durationValue;
  switch (plan.durationUnit) {
    case 'DAY': end.setUTCDate(end.getUTCDate() + n); break;
    case 'WEEK': end.setUTCDate(end.getUTCDate() + 7 * n); break;
    case 'MONTH': addMonths(end, n); break;
    case 'YEAR': addMonths(end, 12 * n); break;
  }
  end.setTime(end.getTime() - TBILISI_OFFSET);
  return { startDate: start, endDate: end, nextRenewalAt: autoRenewal ? end : null };
}

/**
 * Moves a date on by whole months, keeping the day — or the month's last day
 * when it's shorter: 31 January + 1 month is 28 February, not 3 March.
 */
function addMonths(d: Date, n: number) {
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
}
