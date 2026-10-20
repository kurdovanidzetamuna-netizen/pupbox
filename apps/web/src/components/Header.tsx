'use client';
import Link from '@/components/LangLink';
import { useRouter } from 'next/navigation';
import { usePath } from '@/lib/path';
import { createPortal } from 'react-dom';
import { signOut } from '@/lib/signOut';
import { useEffect, useState } from 'react';
import { sitePage, type StoredContent } from '@pupbox/content';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import Logo from '@/components/Logo';
import SmartLink from '@/components/SmartLink';
import NotificationBell from '@/components/NotificationBell';
import MiniCart from '@/components/shop/MiniCart';
import { useCart } from '@/context/CartContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/icons';
import IconButton from '@/components/ui/IconButton';
import Caps from '@/components/ui/Caps';

/** An icon for a menu link, picked from where it goes. */
const iconFor = (href: string) =>
  href.startsWith('/prices?gift') ? 'gift'
  : href.startsWith('/prices') ? 'box'
  : href.startsWith('/shop') ? 'bag'
  : href.startsWith('/build-box') ? 'sparkle'
  : href.startsWith('/blog') ? 'chat'
  : 'info';

/**
 * Pages with their own sticky action bar at the bottom (buy, build) or a
 * focused flow (checkout) don't get the tab bar on phones.
 */
const NO_TAB_BAR = [/^\/checkout/, /^\/build-box/, /^\/shop\/[^/]+$/];

/**
 * Logo, menu and button come from admin → Page Builder → Header & Footer.
 *
 * Desktop: logo, the four main pages, then language, bell, basket,
 * the "me" pill (sign in, or your initial and name) and Subscribe.
 * Phones and tablets: a slim top bar, a tab bar at the bottom with the four
 * main pages + "More", and "More" opens a plain side menu with the rest.
 */
export default function Header({ site }: { site: StoredContent | null }) {
  const { lang, setLang, t } = useLanguage();
  const { cart } = useCart();
  const c = usePage(sitePage, site);
  const nav: { label: string; href: string }[] = c.header.links.filter((n: any) => n.label);
  // The header keeps the main pages; the blog lives in the footer and the side
  // menu, and build-your-own is reached from Prices and the home page.
  const main = nav.filter((n) => !n.href.startsWith('/blog') && !n.href.startsWith('/build-box'))
    .filter((l, i, all) => all.findIndex((x) => x.href === l.href) === i).slice(0, 4);
  const pathname = usePath();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [askOut, setAskOut] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [me, setMe] = useState<{ initial: string; name: string }>({ initial: '', name: '' });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Compare paths only: a menu link may carry a query (/prices?gift=true).
  const isActive = (href: string) => {
    const path = href.split(/[?#]/)[0];
    return path.startsWith('/') && (path === '/' ? pathname === '/' : pathname.startsWith(path));
  };

  // Read after every navigation: signing in and out happen on other pages.
  useEffect(() => {
    setSignedIn(!!localStorage.getItem('pupbox_token'));
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    if (!signedIn) { setMe({ initial: '', name: '' }); return; }
    const token = localStorage.getItem('pupbox_token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setMe({ initial: (u?.firstName?.[0] || u?.email?.[0] || '').toUpperCase(), name: [u?.firstName, u?.lastName].filter(Boolean).join(' ') }))
      .catch(() => {});
  }, [signedIn]);

  // The side menu: Escape closes it and the page behind doesn't scroll.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [drawer]);

  function leave() {
    signOut();
    setSignedIn(false);
    setDrawer(false);
    setAskOut(false);
    router.push('/');
  }

  const tabBar = !NO_TAB_BAR.some((r) => r.test(pathname));
  // Plans sits in the middle as the main, highlighted tab.
  const tabs = [
    { href: '/', icon: 'home', label: t('nav.home') },
    { href: '/shop', icon: 'bag', label: t('nav.shopShort') },
    { href: '/prices', icon: 'box', label: t('nav.plans'), main: true },
    signedIn ? { href: '/account', icon: 'paw', label: t('nav.me') } : { href: '/login', icon: 'key', label: t('nav.signIn') },
  ];
  // Everything the tabs don't cover, for the side menu.
  const more = [
    ...nav,
    { label: t('nav.buildBox'), href: '/build-box' },
    { label: t('nav.gift'), href: '/prices?gift=true' },
    { label: t('nav.faq'), href: '/faq' },
    { label: t('nav.blog'), href: '/blog' },
  ].filter((l, i, all) => all.findIndex((x) => x.href === l.href) === i);
  const f = drawer ? 0 : -1; // links in a closed menu can't be tabbed to

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Logo brand={c.brand} />

          {/* The four main pages: compact pills; the current page lightly marked. */}
          <nav className="hidden lg:flex items-center text-[13px] font-semibold text-gray-600" aria-label={t('aria.mainNav')}>
            {main.map((n, i) => (
              <SmartLink key={i} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
                className={`h-9 px-2.5 inline-flex items-center rounded-[10px] whitespace-nowrap transition-colors ${isActive(n.href) ? 'bg-teal-50 text-teal-700 font-semibold' : 'hover:bg-gray-50 hover:text-teal-700'}`}>
                <Caps text={n.label} />
              </SmartLink>
            ))}
          </nav>

          {/* Right side, quietest to loudest: language, bell, basket, the "me" button, Subscribe — all with the same soft round corners. */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language: a two-part switch with the same corners as the buttons */}
            <div role="radiogroup" aria-label={t('nav.language')} className="hidden lg:grid grid-cols-2 h-10 p-1 rounded-[16px] bg-gray-100">
              {([['ka', 'ქა', 'ქართული'], ['en', 'EN', 'English']] as const).map(([code, short, full]) => (
                <button key={code} type="button" role="radio" aria-checked={lang === code} aria-label={full} title={full}
                  onClick={() => setLang(code)}
                  className={`h-8 min-w-[36px] px-2 rounded-[12px] text-[12px] font-bold transition-colors ${lang === code ? 'bg-white text-teal-700 shadow-[0_1px_3px_rgba(36,48,58,0.12)]' : 'text-gray-500 hover:text-gray-800'}`}>
                  {short}
                </button>
              ))}
            </div>

            {signedIn && <NotificationBell />}

            {/* The basket is for customers; a guest sees it only once something is in it. */}
            {(signedIn || (cart?.itemCount ?? 0) > 0) && <MiniCart />}

            {signedIn ? (
              <>
                <Link href="/account" aria-label={t('nav.account')} title={t('nav.account')}
                  className={`inline-flex items-center gap-2 h-10 pl-1 pr-1 sm:pr-3.5 rounded-[16px] transition-colors ${pathname.startsWith('/account') ? 'bg-teal-50' : 'bg-gray-100 hover:bg-gray-200/70'}`}>
                  <span className="w-8 h-8 rounded-[12px] bg-teal-600 text-white inline-flex items-center justify-center text-[13px] font-bold">
                    {me.initial || <Icon name="paw" className="w-4 h-4" />}
                  </span>
                  <span className="hidden sm:inline max-w-[120px] truncate text-[13px] font-semibold text-gray-900">{me.name || t('nav.account')}</span>
                </Link>
                <span className="hidden lg:inline-flex">
                  <IconButton icon="logout" size="sm" tip="bottom" label={t('acc.signOut')} onClick={() => setAskOut(true)} />
                </span>
              </>
            ) : (
              <SignInButton />
            )}

            {c.header.buttonText && (
              <SmartLink href={c.header.buttonHref} className="group hidden lg:inline-flex items-center gap-1.5 ml-1 h-10 pl-3.5 pr-4 !rounded-[16px] bg-teal-600 text-white text-[13px] font-semibold hover:bg-teal-700 transition-colors">
                <Icon name="box" className="w-[17px] h-[17px] transition-transform group-hover:rotate-[-12deg]" strokeWidth={2.2} />
                <Caps text={c.header.buttonText} />
              </SmartLink>
            )}

            {/* Pages without the tab bar still need a way to the menu on phones. */}
            <button type="button" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="site-drawer" aria-label={t('nav.menu')}
              className={`${tabBar ? 'hidden' : 'inline-flex'} lg:hidden items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
      </header>

      <ConfirmDialog open={askOut} onClose={() => setAskOut(false)} onConfirm={leave}
        title={t('acc.signOutQ')} message={t('acc.signOutInfo')} confirmLabel={t('acc.signOut')} />

      {mounted && createPortal(
        <>
          {/* ── Bottom tab bar (phones & tablets) ── */}
          {tabBar && (
            <>
              <div className="lg:hidden h-16" aria-hidden="true" />
              <nav aria-label={t('aria.mainNav')}
                className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
                <ul className="max-w-xl mx-auto grid grid-cols-5 h-16">
                  {tabs.map((tab) => {
                    const on = tab.href === '/' ? pathname === '/' : isActive(tab.href);
                    if (tab.main) return (
                      <li key={tab.href} className="relative">
                        <Link href={tab.href} aria-current={on ? 'page' : undefined}
                          className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center gap-1 text-[10.5px] font-bold text-teal-700">
                          <span className={`w-14 h-14 rounded-[18px] text-white flex items-center justify-center ring-4 ring-white shadow-[0_8px_18px_-8px_rgba(34,163,139,0.8)] transition-transform active:scale-95 ${on ? 'bg-teal-700' : 'bg-teal-600'}`}>
                            <Icon name={tab.icon} className="w-6 h-6" strokeWidth={2.1} />
                          </span>
                          <span className="max-w-[80px] truncate"><Caps text={tab.label} /></span>
                        </Link>
                      </li>
                    );
                    return (
                      <li key={tab.href}>
                        <Link href={tab.href} aria-current={on ? 'page' : undefined}
                          className={`h-full flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors ${on ? 'text-teal-700' : 'text-gray-500'}`}>
                          <Icon name={tab.icon} className="w-[22px] h-[22px]" strokeWidth={on ? 2.1 : 1.7} />
                          <span className="max-w-full truncate px-1"><Caps text={tab.label} /></span>
                        </Link>
                      </li>
                    );
                  })}
                  <li>
                    <button type="button" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="site-drawer"
                      className={`w-full h-full flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold ${drawer ? 'text-teal-700' : 'text-gray-500'}`}>
                      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                      <Caps text={t('nav.more')} />
                    </button>
                  </li>
                </ul>
              </nav>
            </>
          )}

          {/* ── Side menu: the rest of the site ── */}
          <div className={`lg:hidden fixed inset-0 z-[60] ${drawer ? '' : 'pointer-events-none'}`} aria-hidden={!drawer}>
            <div onClick={() => setDrawer(false)}
              className={`absolute inset-0 bg-gray-900/30 transition-opacity duration-300 ${drawer ? 'opacity-100' : 'opacity-0'}`} />
            <aside id="site-drawer" role="dialog" aria-modal="true" aria-label={t('nav.menu')}
              className={`absolute right-0 top-0 bottom-0 w-[84%] max-w-[340px] bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${drawer ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
                <Logo brand={c.brand} />
                <button type="button" onClick={() => setDrawer(false)} aria-label={t('nav.close')} tabIndex={f}
                  className="w-10 h-10 -mr-2 rounded-full inline-flex items-center justify-center text-gray-500 hover:bg-gray-100">
                  <Icon name="close" className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Who you are, or a quiet way in */}
                <div className="px-5 py-3 border-b border-gray-100">
                  {signedIn ? (
                    <Link href="/account" tabIndex={f} className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[14px] font-bold shrink-0">{me.initial || <Icon name="paw" className="w-4 h-4" />}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-semibold text-gray-900 truncate">{me.name || t('nav.account')}</span>
                        <span className="block text-[12.5px] text-teal-700">{t('nav.account')}</span>
                      </span>
                      <Icon name="arrow" className="w-4 h-4 text-gray-300" />
                    </Link>
                  ) : (
                    <div className="-mx-5 -my-2">
                      <Link href="/login" tabIndex={f} className="flex items-center gap-3 h-10 px-5 text-[14.5px] font-semibold text-gray-900 hover:bg-gray-50">
                        <Icon name="user" className="w-[18px] h-[18px] text-teal-600" />{t('nav.signIn')}
                      </Link>
                      <Link href="/register" tabIndex={f} className="flex items-center gap-3 h-10 px-5 text-[14.5px] font-medium text-gray-800 hover:bg-gray-50">
                        <Icon name="plus" className="w-[18px] h-[18px] text-teal-600" />{t('nav.signUp')}
                      </Link>
                    </div>
                  )}
                </div>

                <ul className="py-1.5">
                  {more.map((l) => {
                    const on = isActive(l.href);
                    return (
                      <li key={l.href}>
                        <SmartLink href={l.href} aria-current={on ? 'page' : undefined} tabIndex={f}
                          className={`flex items-center gap-3 h-10 px-5 text-[14px] font-semibold transition-colors ${on ? 'text-teal-700 bg-teal-50/60' : 'text-gray-800 hover:bg-gray-50'}`}>
                          <Icon name={iconFor(l.href)} className={`w-[18px] h-[18px] ${on ? 'text-teal-600' : 'text-gray-400'}`} />
                          <Caps text={l.label} />
                        </SmartLink>
                      </li>
                    );
                  })}
                </ul>

                <div className="px-5 py-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-gray-100" role="radiogroup" aria-label={t('nav.language')}>
                    {([['ka', 'ქართული'], ['en', 'English']] as const).map(([code, label]) => (
                      <button key={code} type="button" role="radio" onClick={() => setLang(code)} aria-checked={lang === code} tabIndex={f}
                        className={`h-8 rounded-full text-[12.5px] font-semibold transition-colors ${lang === code ? 'bg-white text-teal-700 ring-1 ring-gray-200/80' : 'text-gray-500'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {signedIn && (
                    <div className="mt-3 flex justify-center">
                      <IconButton icon="power" tone="danger" label={t('acc.signOut')} onClick={() => { setDrawer(false); setAskOut(true); }} />
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

/**
 * Signed out: the "me" pill, like bog.ge's — a mint avatar with "Sign in"
 * beside it (just the avatar on small phones). It opens sign in as a pop-up
 * (with "Create account" inside it), the same on phones and computers.
 */
function SignInButton() {
  const { t } = useLanguage();
  return (
    <Link href="/login" aria-label={`${t('nav.signIn')} / ${t('nav.signUp')}`}
      className="inline-flex items-center gap-2 h-10 pl-1 pr-1 sm:pr-3.5 rounded-[16px] bg-gray-100 hover:bg-gray-200/70 transition-colors">
      <span className="w-8 h-8 rounded-[12px] bg-teal-600 text-white inline-flex items-center justify-center">
        <Icon name="user" className="w-[17px] h-[17px]" strokeWidth={2} />
      </span>
      <span className="hidden sm:inline text-[13px] font-semibold text-gray-900"><Caps text={t('nav.signIn')} /></span>
    </Link>
  );
}
