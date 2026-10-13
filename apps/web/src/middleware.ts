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
  // Behind Caddy the site is reached over plain http; send people to the
  // address they actually used (https://pupbox.ge), in one hop.
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  const host = req.headers.get('x-forwarded-host')?.split(',')[0].trim();
  if (proto === 'https' || proto === 'http') url.protocol = `${proto}:`;
  const port = req.headers.get('x-forwarded-port')?.split(',')[0].trim();
  if (host) {
    url.host = host;
    // Public addresses never carry a port (Next adds its own internal one);
    // only local development on localhost keeps it.
    if (!host.includes(':')) url.port = /^(localhost|127\.0\.0\.1)$/.test(host) && port ? port : '';
  }
  return NextResponse.redirect(url);
}

export const config = {
  // Pages only: not Next's own files, robots/sitemap, or anything with a file extension.
  matcher: ['/((?!_next|api|og|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest|favicon.ico|.*\\..*).*)'],
};
