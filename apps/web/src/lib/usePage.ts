'use client';
import { useMemo } from 'react';
import { localizePage, type PageDef, type StoredContent } from '@pupbox/content';
import { useLanguage } from '@/context/LanguageContext';

/** A page's admin content in the visitor's language: `c.hero.heading`, `c.on('stats')`. */
export function usePage(page: PageDef, stored: StoredContent | null | undefined) {
  const { lang } = useLanguage();
  return useMemo(() => localizePage(page, stored, lang), [page, stored, lang]);
}
