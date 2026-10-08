import { cmsSlug, FAQ_SLUG, type FaqItem, type PageDef, type StoredContent } from '@pupbox/content';
import { fetchAPI } from './api';

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
