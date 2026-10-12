import { ALLERGENS } from '@pupbox/content';
import { fill } from '@/context/strings/purchase';

type T = (key: string, fallback?: string) => string;

/** "2 წლის და 3 თვის", "5 თვის", from a birthday. */
export function dogAge(birthday: string | null | undefined, t: T): string | null {
  if (!birthday) return null;
  const b = new Date(birthday), now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months--;
  if (months < 1) return t('dogs.ageNew');
  const y = Math.floor(months / 12), m = months % 12;
  if (!y) return fill(t('dogs.ageM'), { n: m });
  return m ? fill(t('dogs.ageYM'), { y, m }) : fill(t('dogs.ageY'), { n: y });
}

/** Days until the next birthday (0 = today), or null without one. */
export function daysToBirthday(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const b = new Date(birthday), now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (next < today) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86400_000);
}

/** "Birthday in 12 days", only when it's within a month. */
export function birthdayLine(birthday: string | null | undefined, t: T): string | null {
  const d = daysToBirthday(birthday);
  if (d == null || d > 30) return null;
  return d === 0 ? t('dogs.bdayToday') : d === 1 ? t('dogs.bdayTomorrow') : fill(t('dogs.bdayIn'), { n: d });
}

/** An allergy, food or toy key in the visitor's language. */
export function dogOption(key: string, lang: string, t: T) {
  const known = ALLERGENS.find((x) => x.key.toLowerCase() === key.toLowerCase());
  return known ? (lang === 'ka' ? known.ka : known.key) : t(`dog.opt.${key}`, key);
}

export const SIZE_SHORT: Record<string, string> = { EXTRA_SMALL: 'XS', SMALL: 'S', MEDIUM: 'M', LARGE: 'L', EXTRA_LARGE: 'XL' };
