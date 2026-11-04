import { allergenLabel } from '@/lib/allergens';
import { fill } from '@/context/strings/purchase';
import { daysBetween } from '@pupbox/content';
import { myToday } from '@/lib/dates';

type T = (key: string, fallback?: string) => string;

/** "2 წლის და 3 თვის", "5 თვის", from a birthday. */
export function dogAge(birthday: string | null | undefined, t: T): string | null {
  if (!birthday) return null;
  const [by, bm, bd] = birthday.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = myToday().split('-').map(Number); // the owner's own today
  let months = (ty - by) * 12 + tm - bm;
  if (td < bd) months--;
  if (months < 1) return t('dogs.ageNew');
  const y = Math.floor(months / 12), m = months % 12;
  if (!y) return fill(t('dogs.ageM'), { n: m });
  return m ? fill(t('dogs.ageYM'), { y, m }) : fill(t('dogs.ageY'), { n: y });
}

/** Days until the next birthday (0 = today), or null without one. */
export function daysToBirthday(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  // A birthday is a calendar day; "today" is the owner's own, wherever they are
  const md = birthday.slice(5, 10), today = myToday(), year = Number(today.slice(0, 4));
  const on = (y: number) => (md === '02-29' && new Date(Date.UTC(y, 1, 29)).getUTCMonth() !== 1 ? `${y}-02-28` : `${y}-${md}`);
  let next = on(year);
  if (next < today) next = on(year + 1);
  return daysBetween(today, next);
}

/** "Birthday in 12 days", only when it's within a month. */
export function birthdayLine(birthday: string | null | undefined, t: T): string | null {
  const d = daysToBirthday(birthday);
  if (d == null || d > 30) return null;
  return d === 0 ? t('dogs.bdayToday') : d === 1 ? t('dogs.bdayTomorrow') : fill(t('dogs.bdayIn'), { n: d });
}

/** An allergy, food or toy key in the visitor's language. */
export function dogOption(key: string, lang: string, t: T) {
  return allergenLabel(key, lang) ?? t(`dog.opt.${key}`, key);
}

export const SIZE_SHORT: Record<string, string> = { EXTRA_SMALL: 'XS', SMALL: 'S', MEDIUM: 'M', LARGE: 'L', EXTRA_LARGE: 'XL' };
