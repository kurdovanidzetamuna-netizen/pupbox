'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { signOut } from '@/lib/signOut';
import { useEffect, useState } from 'react';
import { sitePage, type StoredContent } from '@pupbox/content';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { usePage } from '@/lib/usePage';
import Logo from '@/components/Logo';
import SmartLink from '@/components/SmartLink';
import NotificationBell from '@/components/NotificationBell';
import MiniCart from '@/components/shop/MiniCart';
import { Icon } from '@/components/ui/icons';

/** An icon for a menu link, picked from where it goes. */
const iconFor = (href: string) =>
  href.startsWith('/prices?gift') ? 'gift'
  : href.startsWith('/prices') ? 'box'
  : href.startsWith('/shop') ? 'bag'
  : href.startsWith('/how-it-works') ? 'info'
  : href.startsWith('/blog') ? 'chat'
  : href.startsWith('/build-box') ? 'sparkle'
  : href.startsWith('/faq') ? 'info'
  : 'arrow';

/**
 * Pages with their own sticky action bar at the bottom (buy, build) or a
 * focused flow (checkout) don't get the tab bar on phones.
 */
const NO_TAB_BAR = [/^\/checkout/, /^\/build-box/, /^\/shop\/[^/]+$/];

/**
 * Logo, menu and button come from admin → Page Builder → Header & Footer.
 *
 * Desktop: logo, the four main pages, then language, sign in / sign up (or
 * the customer's bell and avatar), basket and Subscribe.
 * Phones and tablets: a slim top bar (logo, sign in or bell, basket), a tab
 * bar at the bottom with the four main pages + "More", and "More" opens a
 * side drawer with everything else.
 */
export default function Header({ site }: { site: StoredContent | null }) {
  const { lang, setLang, t } = useLanguage();
  const c = usePage(sitePage, site);
  const nav: { label: string; href: string }[] = c.header.links.filter((n: any) => n.label);
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
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
      .then((u) => setMe({ initial: (u?.firstName?.[0] || u?.email?.[0] || '').toUpperCase(), name: u?.firstName || '' }))
      .catch(() => {});
  }, [signedIn]);

  // The drawer: Escape closes it and the page behind doesn't scroll.
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
    router.push('/');
  }

  const tabBar = !NO_TAB_BAR.some((r) => r.test(pathname));
  const tabs = [
    { href: '/', icon: 'home', label: t('nav.home') },
    { href: '/prices', icon: 'box', label: t('nav.plans') },
    { href: '/shop', icon: 'bag', label: t('nav.shopShort') },
    signedIn ? { href: '/account', icon: 'paw', label: t('nav.me') } : { href: '/login', icon: 'key', label: t('nav.signIn') },
  ];
  // Everything the four tabs don't cover, for the drawer.
  const explore = [
    ...nav,
    { label: t('nav.buildBox'), href: '/build-box' },
    { label: t('nav.gift'), href: '/prices?gift=true' },
  ].filter((l, i, all) => all.findIndex((x) => x.href === l.href) === i);
  const help = [
    { label: t('nav.faq'), href: '/faq' },
    { label: t('nav.blog'), href: '/blog' },
  ].filter((l) => !explore.some((x) => x.href === l.href));

  const langSwitch = (big = false) => (
    <div role="radiogroup" aria-label={t('nav.language')}
      className={`relative grid grid-cols-2 items-center rounded-full bg-gray-100 ${big ? 'h-11 p-1' : 'h-7 p-0.5'}`}>
      <span aria-hidden="true"
        className={`absolute rounded-full bg-white ring-1 ring-gray-200/80 transition-transform duration-300 ease-out ${big ? 'top-1 bottom-1 w-[calc(50%-4px)]' : 'top-0.5 bottom-0.5 w-[calc(50%-2px)]'} ${lang === 'en' ? 'translate-x-full' : 'translate-x-0'}`}
        style={{ left: big ? 4 : 2 }} />
      {([['ka', 'ქა', 'ქართული'], ['en', 'EN', 'English']] as const).map(([code, short, full]) => (
        <button key={code} type="button" role="radio" aria-checked={lang === code} aria-label={full} title={full}
          onClick={() => setLang(code)}
          className={`relative z-10 rounded-full font-bold transition-colors ${big ? 'h-9 text-[13px]' : 'h-6 px-2 text-[10.5px]'} ${lang === code ? 'text-teal-700' : 'text-gray-400 hover:text-gray-700'}`}>
          {big ? full : short}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 lg:h-[68px] flex items-center justify-between gap-3">
          <Logo brand={c.brand} />

          {/* The four main pages. The current page lightly marked. */}
          <nav className="hidden lg:flex items-center gap-1 text-[14px] font-medium text-gray-600" aria-label={t('aria.mainNav')}>
            {nav.slice(0, 4).map((n, i) => (
              <SmartLink key={i} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
                className={`h-10 px-4 inline-flex items-center rounded-full whitespace-nowrap transition-colors ${isActive(n.href) ? 'bg-teal-50 text-teal-700 font-semibold' : 'hover:bg-gray-50 hover:text-teal-700'}`}>
                {n.label}
              </SmartLink>
            ))}
          </nav>

          {/* Right side, quietest to loudest, ending on Subscribe. */}
          <div className="flex items-center gap-1">
            <div className="hidden lg:block mr-1">{langSwitch()}</div>

            {signedIn && <NotificationBell />}

            {signedIn ? (
              <Link href="/account" aria-label={t('nav.account')} title={t('nav.account')}
                className={`hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-full text-[13px] font-bold transition-colors ${
                  pathname.startsWith('/account') ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                {me.initial || <Icon name="paw" className="w-[18px] h-[18px]" />}
              </Link>
            ) : (
              <>
                <Link href="/login" className="inline-flex items-center h-9 px-3 lg:px-4 rounded-full text-[13px] font-semibold text-gray-700 hover:text-teal-700 hover:bg-teal-50 transition">
                  {t('nav.signIn')}
                </Link>
                <Link href="/register" className="hidden sm:inline-flex items-center h-9 px-4 rounded-full text-[13px] font-semibold text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50 transition">
                  {t('nav.signUp')}
                </Link>
              </>
            )}

            <MiniCart />

            {c.header.buttonText && (
              <SmartLink href={c.header.buttonHref} className="group hidden lg:inline-flex items-center justify-center gap-1.5 ml-1 rounded-full bg-teal-600 text-white text-[13.5px] font-semibold h-10 pl-5 pr-4 shadow-glow hover:bg-teal-700 transition-colors">
                {c.header.buttonText}
                <Icon name="arrow" className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
              </SmartLink>
            )}

            {/* Tablets with no tab bar on this page still need a way in. */}
            <button type="button" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="site-drawer" aria-label={t('nav.menu')}
              className={`${tabBar ? 'hidden' : 'inline-flex'} lg:hidden items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
            </button>
          </div>
        </div>
      </header>

      {mounted && createPortal(
        <>
          {/* ── Bottom tab bar (phones & tablets) ── */}
          {tabBar && (
            <>
              <div className="lg:hidden h-[68px]" aria-hidden="true" />
              <nav aria-label={t('aria.mainNav')}
                className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgba(36,48,58,0.25)]">
                <ul className="max-w-xl mx-auto grid grid-cols-5 h-[68px]">
                  {tabs.map((tab) => {
                    const on = tab.href === '/' ? pathname === '/' : isActive(tab.href);
                    return (
                      <li key={tab.href}>
                        <Link href={tab.href} aria-current={on ? 'page' : undefined}
                          className={`h-full flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors ${on ? 'text-teal-700' : 'text-gray-500 active:text-teal-700'}`}>
                          <span className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${on ? 'bg-teal-100' : ''}`}>
                            <Icon name={tab.icon} className="w-[22px] h-[22px]" strokeWidth={on ? 2.1 : 1.8} />
                          </span>
                          <span className="max-w-full truncate px-1">{tab.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                  <li>
                    <button type="button" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="site-drawer"
                      className={`w-full h-full flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors ${drawer ? 'text-teal-700' : 'text-gray-500'}`}>
                      <span className={`w-12 h-7 rounded-full flex items-center justify-center ${drawer ? 'bg-teal-100' : ''}`}>
                        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
                      </span>
                      {t('nav.more')}
                    </button>
                  </li>
                </ul>
              </nav>
            </>
          )}

          {/* ── Side drawer: everything else ── */}
          <div className={`lg:hidden fixed inset-0 z-[60] ${drawer ? '' : 'pointer-events-none'}`} aria-hidden={!drawer}>
            <div onClick={() => setDrawer(false)}
              className={`absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${drawer ? 'opacity-100' : 'opacity-0'}`} />
            <aside id="site-drawer" role="dialog" aria-modal="true" aria-label={t('nav.menu')}
              className={`absolute right-0 top-0 bottom-0 w-[86%] max-w-[360px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${drawer ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 shrink-0">
                <Logo brand={c.brand} />
                <button type="button" onClick={() => setDrawer(false)} aria-label={t('nav.close')} tabIndex={drawer ? 0 : -1}
                  className="w-10 h-10 -mr-2 rounded-full inline-flex items-center justify-center text-gray-500 hover:bg-gray-100">
                  <Icon name="close" className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                {/* Who you are, or a way in */}
                <div className="rounded-3xl bg-gradient-to-br from-teal-500 to-teal-700 text-white p-5 relative overflow-hidden">
                  <span aria-hidden="true" className="absolute -right-4 -bottom-6 text-[84px] opacity-15 rotate-12">🐾</span>
                  {signedIn ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-full bg-white/20 ring-2 ring-white/40 flex items-center justify-center text-[16px] font-bold">{me.initial || '🐶'}</span>
                        <p className="text-[16px] font-bold">{me.name ? fill(t('nav.hello'), { name: me.name }) : t('nav.account')}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 relative">
                        <Link href="/account/orders" tabIndex={drawer ? 0 : -1} className="h-[52px] rounded-2xl bg-white/15 hover:bg-white/25 text-[12px] font-semibold flex flex-col items-center justify-center gap-0.5 text-center leading-tight"><Icon name="bag" className="w-4 h-4" />{t('nav.orders')}</Link>
                        <Link href="/account/dogs" tabIndex={drawer ? 0 : -1} className="h-[52px] rounded-2xl bg-white/15 hover:bg-white/25 text-[12px] font-semibold flex flex-col items-center justify-center gap-0.5 text-center leading-tight"><Icon name="heart" className="w-4 h-4" />{t('nav.dogs')}</Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[17px] font-bold">{t('nav.helloGuest')}</p>
                      <p className="text-[13px] text-white/85 mt-1">{t('nav.guestSub')}</p>
                      <div className="grid grid-cols-2 gap-2 mt-4 relative">
                        <Link href="/login" tabIndex={drawer ? 0 : -1} className="h-11 rounded-full bg-white text-teal-700 text-[13.5px] font-bold inline-flex items-center justify-center">{t('nav.signIn')}</Link>
                        <Link href="/register" tabIndex={drawer ? 0 : -1} className="h-11 rounded-full bg-white/15 ring-1 ring-white/50 text-white text-[13.5px] font-bold inline-flex items-center justify-center">{t('nav.signUp')}</Link>
                      </div>
                    </>
                  )}
                </div>

                <DrawerList title={t('nav.explore')} links={explore} isActive={isActive} focusable={drawer} />
                <DrawerList title={t('nav.help')} links={help} isActive={isActive} focusable={drawer} />

                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t('nav.language')}</p>
                  {langSwitch(true)}
                </div>

                {signedIn && (
                  <button type="button" onClick={leave} tabIndex={drawer ? 0 : -1}
                    className="w-full h-11 rounded-full text-[13.5px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center gap-2 transition">
                    <Icon name="logout" className="w-4 h-4" />{t('acc.signOut')}
                  </button>
                )}
              </div>

              {c.header.buttonText && (
                <div className="shrink-0 p-4 border-t border-gray-100 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <SmartLink href={c.header.buttonHref} tabIndex={drawer ? 0 : -1}
                    className="w-full h-12 rounded-full bg-teal-600 text-white text-[15px] font-bold inline-flex items-center justify-center gap-2 shadow-glow hover:bg-teal-700">
                    <Icon name="box" className="w-5 h-5" />
                    {c.header.buttonText}
                  </SmartLink>
                </div>
              )}
            </aside>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

function DrawerList({ title, links, isActive, focusable }: { title: string; links: { label: string; href: string }[]; isActive: (h: string) => boolean; focusable: boolean }) {
  if (!links.length) return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
      <ul className="space-y-1">
        {links.map((l) => {
          const on = isActive(l.href);
          return (
            <li key={l.href}>
              <SmartLink href={l.href} aria-current={on ? 'page' : undefined} tabIndex={focusable ? 0 : -1}
                className={`group flex items-center gap-3 h-12 px-3 -mx-3 rounded-2xl text-[15px] font-semibold transition-colors ${on ? 'bg-teal-50 text-teal-700' : 'text-gray-800 hover:bg-gray-50'}`}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${on ? 'bg-white text-teal-600' : 'bg-teal-50 text-teal-600'}`}>
                  <Icon name={iconFor(l.href)} className="w-[18px] h-[18px]" />
                </span>
                <span className="flex-1">{l.label}</span>
                <Icon name="arrow" className="w-4 h-4 text-gray-300 group-hover:text-teal-600 transition-colors" />
              </SmartLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
