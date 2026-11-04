import { tbilisiDay } from '@pupbox/content';

/**
 * Dates in Georgian or English. Georgian month names are built in: many
 * browsers ship without Georgian date data and would show English instead.
 *
 * Every date says whose calendar it is on:
 * - 'shop': the shop's rules and deadlines, on Tbilisi's calendar wherever the
 *   visitor is (when a plan renews or ends, when a promo code stops working).
 * - 'mine': something the visitor did or got, on their own device's calendar
 *   (when they ordered or paid, when a notification came).
 * - 'calendar': a day that is just a day and never moves (a birthday, the day
 *   a gift is sent, a box's month), given as "2026-12-02" or made with
 *   new Date(year, month, day).
 */
export type DateZone = 'shop' | 'mine' | 'calendar';

const KA_MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const KA_SHORT = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

type Opts = { day?: 'numeric'; month?: 'long' | 'short'; year?: 'numeric' };

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Today on the visitor's own calendar, as "2026-12-02". */
export const myToday = () => ymd(new Date());

/** The "YYYY-MM-DD" a date stands for on the given calendar. */
export function dayOf(date: Date | string, zone: DateZone): string {
  if (zone === 'calendar') return typeof date === 'string' ? date.slice(0, 10) : ymd(date);
  return zone === 'shop' ? tbilisiDay(date) : ymd(new Date(date));
}

export function formatDate(date: Date | string, lang: string, opts: Opts = { day: 'numeric', month: 'long', year: 'numeric' }, zone: DateZone = 'mine') {
  const [y, m, day] = dayOf(date, zone).split('-').map(Number);
  // Midday UTC of that day, written out in UTC, can't slip to a neighbouring day
  if (lang !== 'ka') return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
  const month = opts.month ? (opts.month === 'short' ? KA_SHORT : KA_MONTHS)[m - 1] : '';
  // "1 ნოემბერი, 2026", "ნოემბერი 2026", "1 ნოე"
  const dayMonth = [opts.day ? day : '', month].filter(Boolean).join(' ');
  if (!opts.year) return dayMonth;
  return opts.day ? `${dayMonth}, ${y}` : `${dayMonth} ${y}`;
}
