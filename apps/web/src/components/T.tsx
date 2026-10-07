'use client';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';

/**
 * Translated text for server components, which can't use the language hook.
 * `<T k="shop.title" />` renders the string in the visitor's language.
 */
export default function T({ k, vars, fallback }: { k: string; vars?: Record<string, string | number>; fallback?: string }) {
  const { t } = useLanguage();
  return <>{vars ? fill(t(k, fallback), vars) : t(k, fallback)}</>;
}

/** Admin-entered content with an optional Georgian version (translations.ka). */
export function L({ en, ka }: { en: string; ka?: string | null }) {
  const { lang } = useLanguage();
  return <>{lang === 'ka' && ka?.trim() ? ka : en}</>;
}
