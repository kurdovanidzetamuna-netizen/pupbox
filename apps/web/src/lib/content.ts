import type { Metadata } from 'next';
import { cmsSlug, FAQ_SLUG, localizePage, type FaqItem, type PageDef, type StoredContent } from '@pupbox/content';
import { fetchAPI } from './api';
import { asLang, seo } from './seo';

/**
 * How long the site keeps a page's admin content before asking again. Short,
 * so an edit in admin shows up within half a minute without a redeploy.
 */
const FRESH_FOR = 30;

/** What admin saved for a page, or null — then the page shows its defaults. */
export async function getStoredContent(page: PageDef): Promise<StoredContent | null> {
  try {
    const row = await fetchAPI<any>(`/cms/${cmsSlug(page)}`, { next: { revalidate: FRESH_FOR } });
    return row?.content ?? null;
  } catch {
    return null;
  }
}

/** Questions saved in the FAQ manager, or null — then the defaults are used. */
export async function getFaq(): Promise<FaqItem[] | null> {
  try {
    const row = await fetchAPI<any>(`/cms/${FAQ_SLUG}`, { next: { revalidate: FRESH_FOR } });
    return row?.content?.items ?? null;
  } catch {
    return null;
  }
}

/**
 * A page's title, description and share picture from its "Google & sharing"
 * section in admin, in the page's language (/ka or /en). `fullTitle` skips
 * the " | Pupbox" suffix.
 */
export async function pageMetadata(page: PageDef, { fullTitle = false, lang = 'ka' }: { fullTitle?: boolean; lang?: string } = {}): Promise<Metadata> {
  const l = asLang(lang);
  const content = localizePage(page, await getStoredContent(page), l);
  const s = content.seo ?? {};
  // No share picture set in admin: the page's own top photo, if it has one.
  const photo = s.shareImage || content.hero?.imageUrl;
  return seo({ lang: l, path: page.path, title: s.title || 'Pupbox', description: s.description, photo, absoluteTitle: fullTitle });
}
