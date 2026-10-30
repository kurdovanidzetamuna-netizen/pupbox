'use client';
import Link from '@/components/LangLink';
import { useRouter } from 'next/navigation';
import { usePath } from '@/lib/path';
import { createPortal } from 'react-dom';
import { signOut } from '@/lib/signOut';
import { useEffect, useRef, useState } from 'react';
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
import { savedToken } from '@/lib/authFetch';

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
// Pages with their own bottom bar (pay, build, add to basket) keep the bottom of the screen to themselves.
const NO_TAB_BAR = [/^\/cart/, /^\/checkout/, /^\/build-box/, /^\/shop\/[^/]+$/];

/**
 * Logo, menu and button come from admin → Page Builder → Header & Footer.
 *
 * Desktop: logo, the four main pages, then language, bell, basket, your
 * avatar (or sign in) and Subscribe. The avatar opens a small menu: your
 * account pages and a red sign-out.
 * Phones and tablets: a slim top bar, a tab bar at the bottom with the four
 * main pages + "More", and "More" opens a plain side menu with the rest.
 */
export default function Header({ site }: { site: StoredContent | null }) {
  const { t } = useLanguage();
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
  const [me, setMe] = useState<Me>({ initial: '', name: '', email: '' });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Compare paths only: a menu link may carry a query (/prices?gift=true).
  const isActive = (href: string) => {
    const path = href.split(/[?#]/)[0];
    return path.startsWith('/') && (path === '/' ? pathname === '/' : pathname.startsWith(path));
  };

  // Read after every navigation: signing in and out happen on other pages.
  // <html data-auth> follows, for the next refresh's first paint.
  useEffect(() => {
    const yes = !!savedToken();
    setSignedIn(yes);
    document.documentElement.dataset.auth = yes ? 'in' : 'out';
    setDrawer(false);
  }, [pathname]);

  // Who you are: shown at once from what this device remembers, then refreshed.
  useEffect(() => {
    if (!signedIn) { setMe({ initial: '', name: '', email: '' }); return; }
    const token = savedToken() || '';
    // Only if it was saved for this same sign-in (another account may have signed in since).
    try { const saved = JSON.parse(localStorage.getItem('pupbox_me') || 'null'); if (saved?.t === token.slice(-16)) setMe(saved); } catch { /* ignore */ }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u) return;
        const next = { initial: (u.firstName?.[0] || u.email?.[0] || '').toUpperCase(), name: [u.firstName, u.lastName].filter(Boolean).join(' '), email: u.email || '' };
        setMe(next);
        localStorage.setItem('pupbox_me', JSON.stringify({ ...next, t: token.slice(-16) }));
      })
      .catch(() => {});
  }, [signedIn]);

  // Until React takes over, both versions are drawn and CSS (html[data-auth])
  // hides the wrong one, so a refresh never flashes "Sign in".
  const showIn = !mounted || signedIn;
  const showOut = !mounted || !signedIn;
  // Each item on the right is its own box, so it can play the entrance below.
  const pre = (cls: string) => (mounted ? 'inline-flex' : `inline-flex ${cls}`);

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
    // Before React starts both are drawn and CSS keeps the right one (see showIn).
    ...[{ href: '/account', icon: 'paw', label: t('nav.me'), cls: 'when-in' }, { href: '/login', icon: 'key', label: t('nav.signIn'), cls: 'when-out' }]
      .filter((x) => !mounted || (x.href === '/account') === signedIn)
      .map((x) => ({ ...x, cls: mounted ? '' : x.cls })),
  ] as { href: string; icon: string; label: string; main?: boolean; cls?: string }[];
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
          <Logo brand={c.brand} className="hdr-logo" />

          {/* The four main pages: compact pills; the current page lightly marked. */}
          <nav className="hidden lg:flex items-center text-[13px] font-semibold text-gray-600" aria-label={t('aria.mainNav')}>
            {main.map((n, i) => (
              <SmartLink key={i} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined} style={{ animationDelay: `${60 + i * 45}ms` }}
                className={`hdr-item h-9 px-2.5 inline-flex items-center rounded-[10px] whitespace-nowrap transition-colors ${isActive(n.href) ? 'bg-teal-50 text-teal-700 font-semibold' : 'hover:bg-gray-50 hover:text-teal-700'}`}>
                <Caps text={n.label} />
              </SmartLink>
            ))}
          </nav>

          {/* Right side, quietest to loudest, all with the same soft round corners.
              On a page load the whole header sweeps in left to right — logo, pages, then
              these items one after another (hdr-*, globals.css);
              moving between pages keeps the header, so it plays once per refresh. */}
          <div className="flex items-center gap-1 sm:gap-2">
            <LangSwitch className="hidden lg:grid h-10 rounded-[16px] hdr-item hdr-d0" />

            {showIn && <span className={`${pre('when-in')} hdr-item hdr-d1`}><NotificationBell /></span>}

            {/* The basket is for customers; a guest sees it only once something is in it. */}
            {(showIn || (cart?.itemCount ?? 0) > 0) && <span className={`${(cart?.itemCount ?? 0) > 0 ? 'inline-flex' : pre('when-in')} hdr-item hdr-d2`}><MiniCart /></span>}

            {showIn && (
              <span className={`${pre('when-in')} hdr-item hdr-pop hdr-d3`}>
                {/* Phones and tablets: straight to the account; the side menu has the rest. */}
                <Link href="/account" aria-label={t('nav.account')} title={t('nav.account')}
                  className={`lg:hidden inline-flex items-center gap-2 h-10 pl-1 pr-1 sm:pr-3.5 rounded-[16px] transition-colors ${pathname.startsWith('/account') ? 'bg-teal-50' : 'bg-gray-100 hover:bg-gray-200/70'}`}>
                  <span className="me-initial w-8 h-8 rounded-[12px] bg-teal-600 text-white inline-flex items-center justify-center text-[13px] font-bold">
                    {me.initial || (mounted ? <Icon name="paw" className="w-4 h-4" /> : null)}
                  </span>
                  <span className="me-name hidden sm:inline max-w-[120px] truncate text-[13px] font-semibold text-gray-900">{me.name || (mounted ? t('nav.account') : '')}</span>
                </Link>
                <AccountMenu me={me} mounted={mounted} onSignOut={() => setAskOut(true)} />
              </span>
            )}
            {showOut && <span className={`${pre('when-out')} hdr-item hdr-pop hdr-d3`}><SignInButton /></span>}

            {c.header.buttonText && (
              <SmartLink href={c.header.buttonHref} className="group hidden lg:inline-flex hdr-item hdr-d4 items-center gap-1.5 ml-1 h-10 pl-3.5 pr-4 !rounded-[16px] bg-teal-600 text-white text-[13px] font-semibold hover:bg-teal-700 transition-colors">
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

      {/* ── Bottom tab bar (phones & tablets) — drawn with the page, so it's there from the first frame ── */}
      {tabBar && (
        <nav aria-label={t('aria.mainNav')}
          className="hdr-tabbar lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
          <ul className="max-w-xl mx-auto grid grid-cols-5 h-16">
            {tabs.map((tab) => {
              const on = tab.href === '/' ? pathname === '/' : isActive(tab.href);
              if (tab.main) return (
                <li key={tab.href} className="relative">
                  <Link href={tab.href} aria-current={on ? 'page' : undefined}
                    className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center gap-1 text-[10.5px] font-bold text-teal-700">
                    <span className={`w-14 h-14 rounded-[18px] text-white flex items-center justify-center ring-4 ring-white transition-transform active:scale-95 ${on ? 'bg-teal-700' : 'bg-teal-600'}`}>
                      <Icon name={tab.icon} className="w-6 h-6" strokeWidth={2.1} />
                    </span>
                    <span className="max-w-[80px] truncate"><Caps text={tab.label} /></span>
                  </Link>
                </li>
              );
              return (
                <li key={tab.href} className={tab.cls}>
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
      )}

      {mounted && createPortal(
        <>
          {/* Room at the end of the page so the tab bar never covers the footer */}
          {tabBar && <div className="lg:hidden h-16" aria-hidden="true" />}

          {/* ── Side menu: the rest of the site ── */}
          <div className={`lg:hidden fixed inset-0 z-[60] ${drawer ? '' : 'pointer-events-none'}`} aria-hidden={!drawer} {...(drawer ? {} : ({ inert: '' } as object))}>
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
                  <LangSwitch full tabIndex={f} className="grid rounded-full" />
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

type Me = { initial: string; name: string; email: string };

/**
 * Language as a two-part switch: "ქა | EN" on the bar, the full names in
 * menus. Corners come from the caller so it matches what sits beside it.
 */
function LangSwitch({ full = false, tabIndex, className = '' }: { full?: boolean; tabIndex?: number; className?: string }) {
  const { lang, setLang, t } = useLanguage();
  return (
    <div role="radiogroup" aria-label={t('nav.language')} className={`grid-cols-2 gap-1 p-1 bg-gray-100 ${className}`}>
      {([['ka', 'ქა', 'ქართული'], ['en', 'EN', 'English']] as const).map(([code, short, name]) => (
        <button key={code} type="button" role="radio" aria-checked={lang === code} aria-label={name} title={name} tabIndex={tabIndex}
          onClick={() => setLang(code)}
          className={`h-8 min-w-[36px] px-2 ${full ? 'rounded-full' : 'rounded-[12px]'} font-semibold transition-colors ${full ? 'text-[12.5px]' : 'text-[12px] font-bold'} ${lang === code ? 'bg-white text-teal-700 ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-800'}`}>
          {full ? name : short}
        </button>
      ))}
    </div>
  );
}

/**
 * Desktop, signed in: just your avatar on the bar. It opens a small card —
 * who you are, the main account pages, the language and sign out — so the
 * bar itself stays calm. Closes on outside click, Escape or navigation.
 */
function AccountMenu({ me, mounted, onSignOut }: { me: Me; mounted: boolean; onSignOut: () => void }) {
  const { t } = useLanguage();
  const pathname = usePath();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const links = [
    { href: '/account', icon: 'user', label: t('nav.account') },
    { href: '/account/orders', icon: 'box', label: t('acc.ordersPlans') },
    { href: '/account/dogs', icon: 'paw', label: t('acc.dogs') },
  ];

  return (
    <div ref={box} className="relative hidden lg:block">
      {/* The solid teal tile, like the main buttons; on hover it deepens and lifts a touch. */}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open}
        aria-label={t('nav.account')} title={me.name || t('nav.account')}
        className={`group inline-flex items-center justify-center w-10 h-10 rounded-[16px] transition-colors ${open || pathname.startsWith('/account') ? 'bg-teal-50' : 'hover:bg-teal-50'}`}>
        <span className={`me-initial w-8 h-8 rounded-[12px] text-white inline-flex items-center justify-center text-[13px] font-bold transition-all duration-200 ease-out motion-safe:group-hover:-translate-y-px group-hover:bg-teal-700 ${open ? 'bg-teal-700' : 'bg-teal-600'}`}>
          {me.initial || (mounted ? <Icon name="paw" className="w-4 h-4" /> : null)}
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label={t('nav.account')}
          className="absolute right-0 top-full mt-2 z-50 w-[232px] rounded-2xl bg-white ring-1 ring-gray-200/80 shadow-[0_12px_32px_-12px_rgba(36,48,58,0.25)] p-1.5 animate-[fadeUp_0.15s_ease-out]">
          {/* Who you are, with sign out as a red icon beside it */}
          <div className="flex items-center gap-2 pl-2.5 pr-0.5 py-1.5">
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-gray-900 truncate capitalize">{me.name || t('nav.account')}</span>
              {me.email && <span className="block text-[11.5px] text-gray-500 truncate">{me.email}</span>}
            </span>
            <span className="relative group/tip">
              <button type="button" onClick={() => { setOpen(false); onSignOut(); }} aria-label={t('acc.signOut')}
                className="w-8 h-8 rounded-full inline-flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                <Icon name="logout" className="w-4 h-4" />
              </button>
              <span role="tooltip" className="pointer-events-none absolute top-full mt-1 right-0 whitespace-nowrap rounded-lg bg-gray-800 text-white text-[11px] font-medium px-2 py-1 z-30 hidden group-hover/tip:block group-focus-within/tip:block">{t('acc.signOut')}</span>
            </span>
          </div>

          <div className="my-1 mx-2 h-px bg-gray-100" role="separator" />
          {links.map((l) => {
            const on = l.href === '/account' ? pathname === '/account' : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-2.5 h-9 px-2.5 rounded-xl text-[13px] font-medium transition-colors ${on ? 'bg-teal-50 text-teal-800' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Icon name={l.icon} className={`w-4 h-4 ${on ? 'text-teal-600' : 'text-gray-400'}`} />{l.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
