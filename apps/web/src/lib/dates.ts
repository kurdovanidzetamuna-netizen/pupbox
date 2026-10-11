/**
 * Dates in Georgian or English. Georgian month names are built in: many
 * browsers ship without Georgian date data and would show English instead.
 */
const KA_MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const KA_SHORT = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

type Opts = { day?: 'numeric'; month?: 'long' | 'short'; year?: 'numeric' };

export function formatDate(date: Date | string, lang: string, opts: Opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (lang !== 'ka') return d.toLocaleDateString('en-GB', opts);
  const month = opts.month ? (opts.month === 'short' ? KA_SHORT : KA_MONTHS)[d.getMonth()] : '';
  // "1 ნოემბერი, 2026", "ნოემბერი 2026", "1 ნოე"
  const dayMonth = [opts.day ? d.getDate() : '', month].filter(Boolean).join(' ');
  if (!opts.year) return dayMonth;
  return opts.day ? `${dayMonth}, ${d.getFullYear()}` : `${dayMonth} ${d.getFullYear()}`;
}
