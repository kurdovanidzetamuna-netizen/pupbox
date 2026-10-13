'use client';
import { usePathname } from 'next/navigation';

export type Lang = 'ka' | 'en';

/** The language at the start of an address (/ka/..., /en/...), Georgian if none. */
export const langOf = (pathname: string): Lang => (pathname.split('/')[1] === 'en' ? 'en' : 'ka');

/** An address without its language: /en/shop → /shop, /ka → /. */
export const stripLang = (pathname: string) => pathname.replace(/^\/(ka|en)(?=\/|$)/, '') || '/';

/** A site address in a language: ('/shop', 'en') → /en/shop. Outside links are left alone. */
export const withLang = (href: string, lang: Lang) =>
  href.startsWith('/') && !/^\/(ka|en)(\/|$)/.test(href) ? `/${lang}${href === '/' ? '' : href}` : href;

/**
 * The current page's address without its language, so "is this the page I'm
 * on?" checks keep comparing against /shop, /account and so on.
 */
export function usePath() {
  return stripLang(usePathname() || '/');
}
