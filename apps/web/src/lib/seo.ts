import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';
export type Lang = 'ka' | 'en';

export const asLang = (l: string | undefined): Lang => (l === 'en' ? 'en' : 'ka');

/** A page's address in a language: ('/shop', 'en') → /en/shop. */
export const atLang = (path: string, lang: Lang) => `/${lang}${path === '/' ? '' : path}`;

/** Shortened for search results and link previews, on a word boundary. */
export function clip(text: string | null | undefined, max = 160) {
  const s = (text ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).trimEnd()}…`;
}

/** The generated share picture (see app/og/route.tsx) for a title, a short line and an optional photo. */
export function ogImage(title: string, sub?: string, photo?: string | null) {
  const q = new URLSearchParams({ title: clip(title, 90) });
  if (sub) q.set('sub', clip(sub, 120));
  if (photo && /^https?:\/\//.test(photo)) q.set('img', photo);
  return `/og?${q}`;
}

/**
 * Everything search engines and link previews need for one page: title,
 * description, the address in this language with its Georgian/English
 * twin, and the share picture with title and description (Facebook,
 * Messenger, Instagram, WhatsApp, Viber, Telegram, X). Private pages pass
 * `noindex`.
 */
export function seo({ lang, path, title, description, photo, sub, type = 'website', noindex = false, absoluteTitle = false, publishedTime, modifiedTime }: {
  lang: Lang;
  /** The address without its language, e.g. /shop/chicken-treats. */
  path: string;
  title: string;
  description?: string | null;
  /** The page's own photo (product, blog post), shown in the share picture. */
  photo?: string | null;
  /** The short line under the title in the share picture; the description by default. */
  sub?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  /** Use the title as is, without "| Pupbox" after it. */
  absoluteTitle?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const desc = clip(description);
  const url = atLang(path, lang);
  const image = { url: ogImage(title, sub ?? desc, photo), width: 1200, height: 630, alt: title };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc || undefined,
    alternates: {
      canonical: url,
      languages: { ka: atLang(path, 'ka'), en: atLang(path, 'en'), 'x-default': atLang(path, 'ka') },
    },
    openGraph: {
      type,
      siteName: 'Pupbox',
      url,
      title,
      description: desc || undefined,
      locale: lang === 'en' ? 'en_US' : 'ka_GE',
      alternateLocale: lang === 'en' ? ['ka_GE'] : ['en_US'],
      images: [image],
      ...(type === 'article' ? { publishedTime, modifiedTime } : {}),
    },
    twitter: { card: 'summary_large_image', title, description: desc || undefined, images: [image.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Words for pages whose titles live in code, in both languages. */
export const T = (lang: Lang, ka: string, en: string) => (lang === 'en' ? en : ka);
