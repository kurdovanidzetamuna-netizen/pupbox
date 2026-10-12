import { NextResponse, type NextRequest } from 'next/server';
import { LANG_COOKIE } from '@/lib/lang';

const LANGS = ['ka', 'en'];

/**
 * Every page lives under its language: /ka/... (Georgian, the default) or
 * /en/.... An address without one (/shop, or a link from inside the site)
 * goes to the visitor's last language, Georgian if they have none yet. The
 * language in the address is remembered for server-rendered pages.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split('/')[1];
  if (LANGS.includes(first)) {
    const res = NextResponse.next();
    if (req.cookies.get(LANG_COOKIE)?.value !== first) {
      res.cookies.set(LANG_COOKIE, first, { path: '/', maxAge: 31536000, sameSite: 'lax' });
    }
    return res;
  }
  const saved = req.cookies.get(LANG_COOKIE)?.value;
  const lang = saved && LANGS.includes(saved) ? saved : 'ka';
  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname === '/' ? '' : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Pages only: not Next's own files, robots/sitemap, or anything with a file extension.
  matcher: ['/((?!_next|api|robots.txt|sitemap.xml|favicon.ico|.*\\..*).*)'],
};
