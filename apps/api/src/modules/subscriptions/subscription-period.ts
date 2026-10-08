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
    case 'MONTH': end.setMonth(end.getMonth() + n); break;
    case 'YEAR': end.setFullYear(end.getFullYear() + n); break;
  }
  return { startDate: start, endDate: end, nextRenewalAt: autoRenewal ? end : null };
}
