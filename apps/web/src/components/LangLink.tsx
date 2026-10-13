'use client';
import NextLink from 'next/link';
import { forwardRef, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import { langOf, withLang } from '@/lib/path';

/**
 * Next's Link, keeping the visitor in their language: href="/shop" becomes
 * /ka/shop or /en/shop. Addresses that already name a language, and links
 * to other sites, are left as they are.
 */
const LangLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(function LangLink({ href, ...rest }, ref) {
  const lang = langOf(usePathname() || '/');
  const to = typeof href === 'string' ? withLang(href, lang) : href.pathname ? { ...href, pathname: withLang(href.pathname, lang) } : href;
  return <NextLink ref={ref} href={to} {...rest} />;
});

export default LangLink;
