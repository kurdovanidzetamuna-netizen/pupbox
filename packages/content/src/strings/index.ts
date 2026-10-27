import { BASE_STRINGS } from './base';
import { PURCHASE_STRINGS } from './purchase';
import { STORE_STRINGS } from './store';
import { ACCOUNT_STRINGS } from './account';
import { SITE_STRINGS } from './site';

export { BASE_STRINGS, PURCHASE_STRINGS, STORE_STRINGS, ACCOUNT_STRINGS, SITE_STRINGS };
export { fill } from './purchase';

type Text = { en: string; ka: string };

/** Where on the site a built-in text shows, for the admin Translations filter. */
export const STRING_AREAS = [
  { key: 'shared', label: 'Shared', icon: '🌐', strings: BASE_STRINGS },
  { key: 'purchase', label: 'Basket & checkout', icon: '🛒', strings: PURCHASE_STRINGS },
  { key: 'store', label: 'Shop & plans', icon: '🛍️', strings: STORE_STRINGS },
  { key: 'account', label: 'Account & sign-in', icon: '👤', strings: ACCOUNT_STRINGS },
  { key: 'site', label: 'Other pages', icon: '📄', strings: SITE_STRINGS },
] as const;

/**
 * Every built-in text on the site, key → English and Georgian. When a key is
 * in two tables, the first area above wins (as it always has on the site).
 * Admin → Translations saves changes on top of these.
 */
export const BUILT_IN_STRINGS: Record<string, Text> = Object.assign({}, ...[...STRING_AREAS].reverse().map((a) => a.strings));

/** The area a key belongs to (the first table that has it). */
export const stringArea = (key: string) => STRING_AREAS.find((a) => key in a.strings)?.key ?? 'shared';
