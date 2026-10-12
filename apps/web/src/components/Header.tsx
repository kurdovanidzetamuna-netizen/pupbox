'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/signOut';
import { useEffect, useState } from 'react';
import { sitePage, type StoredContent } from '@pupbox/content';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import Logo from '@/components/Logo';
import SmartLink from '@/components/SmartLink';
import NotificationBell from '@/components/NotificationBell';
import MiniCart from '@/components/shop/MiniCart';

/** Logo, menu and button come from admin → Page Builder → Header & Footer. */
export default function Header({ site }: { site: StoredContent | null }) {
  const { lang, setLang, t } = useLanguage();
  const c = usePage(sitePage, site);
  const nav: { label: string; href: string }[] = c.header.links.filter((n: any) => n.label);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // The signed-in customer's initial for the avatar button.
  const [initial, setInitial] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();

  // Compare paths only: a menu link may carry a query (/prices?gift=true).
  const isActive = (href: string) => {
    const path = href.split(/[?#]/)[0];
    return path.startsWith('/') && (path === '/' ? pathname === '/' : pathname.startsWith(path));
  };

  // Read after every navigation: signing in and out happen on other pages.
  useEffect(() => {
    setSignedIn(!!localStorage.getItem('pupbox_token'));
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!signedIn) { setInitial(''); return; }
    const token = localStorage.getItem('pupbox_token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setInitial((u?.firstName?.[0] || u?.email?.[0] || '').toUpperCase()))
      .catch(() => {});
  }, [signedIn]);

  function leave() {
    signOut();
    setSignedIn(false);
    setMenuOpen(false);
    router.push('/');
  }



  const chooseLang = (l: 'en' | 'ka') => setLang(l);
  const account = signedIn ? { href: '/account', label: t('nav.account') } : { href: '/login', label: t('nav.signIn') };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Logo brand={c.brand} />

        {/* The menu: compact pills, close together; the current page lightly marked. */}
        <nav className="hidden md:flex items-center gap-0.5 text-[13.5px] font-medium text-gray-600" aria-label={t('aria.mainNav')}>
          {nav.map((n, i) => (
            <SmartLink key={i} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
              className={`h-9 px-3 lg:px-3.5 inline-flex items-center rounded-full whitespace-nowrap transition-colors ${isActive(n.href) ? 'bg-teal-50 text-teal-700 font-semibold' : 'hover:bg-gray-50 hover:text-teal-700'}`}>
              {n.label}
            </SmartLink>
          ))}
        </nav>

        {/*
          Right side, quietest to loudest: language (rarely changed), then the
          customer's own things (alerts, account, basket), then the one action
          we want most — Subscribe — last, where the eye ends.
        */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div role="radiogroup" aria-label={t('nav.language')}
            className="relative hidden lg:grid grid-cols-2 items-center h-7 p-0.5 mr-1.5 rounded-full bg-gray-100">
            <span aria-hidden="true"
              className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-white ring-1 ring-gray-200/80 transition-transform duration-300 ease-out ${lang === 'en' ? 'translate-x-full' : 'translate-x-0'}`}
              style={{ left: 2 }} />
            {([['ka', 'ქა', 'ქართული'], ['en', 'EN', 'English']] as const).map(([code, short, full]) => (
              <button key={code} type="button" role="radio" aria-checked={lang === code} aria-label={full} title={full}
                onClick={() => chooseLang(code)}
                className={`relative z-10 h-6 px-2 text-[10.5px] font-bold rounded-full transition-colors ${lang === code ? 'text-teal-700' : 'text-gray-400 hover:text-gray-700'}`}>
                {short}
              </button>
            ))}
          </div>

          {signedIn && <NotificationBell />}

          {/* Account: one tap straight to My account. */}
          {signedIn ? (
            <Link href="/account" aria-label={t('nav.account')} title={t('nav.account')}
              className={`hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-full text-[13px] font-bold transition-colors ${
                pathname.startsWith('/account') ? 'bg-teal-100 text-teal-800' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
              {initial || (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
            </Link>
          ) : (
            <Link href="/login" className="hidden lg:inline-flex items-center h-9 px-3.5 rounded-full text-[13px] font-semibold text-gray-700 hover:text-teal-700 hover:bg-teal-50 transition">
              {t('nav.signIn')}
            </Link>
          )}

          {/* Basket: opens a small panel with what's in it and a way to the basket page. */}
          <MiniCart />

          {c.header.buttonText && (
            <SmartLink href={c.header.buttonHref} className="group hidden sm:inline-flex items-center justify-center gap-1.5 ml-1.5 bg-teal-600 text-white text-[13px] font-semibold h-9 pl-4 pr-3 hover:bg-teal-700">
              {c.header.buttonText}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </SmartLink>
          )}

          {/* Phone & tablet menu */}
          <button type="button" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={t('nav.menu')}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label={t('aria.mainNav')} className="lg:hidden border-t border-gray-100 bg-white px-4 pb-5 pt-2">
          <ul className="flex flex-col">
            {nav.map((n, i) => (
              <li key={i}>
                <SmartLink href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
                  className={`block py-3 text-base font-semibold border-b border-gray-50 ${isActive(n.href) ? 'text-teal-600' : 'text-gray-800'}`}>
                  {n.label}
                </SmartLink>
              </li>
            ))}
            <li>
              <Link href={account.href} className="block py-3 text-base font-semibold text-gray-800 border-b border-gray-50">{account.label}</Link>
            </li>
            {signedIn && (
              <li>
                <button type="button" onClick={leave} className="block w-full text-left py-3 text-base font-semibold text-red-600 border-b border-gray-50">{t('acc.signOut')}</button>
              </li>
            )}
          </ul>
          {c.header.buttonText && (
            <SmartLink href={c.header.buttonHref} className="mt-4 flex w-full items-center justify-center bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700">
              {c.header.buttonText}
            </SmartLink>
          )}
          <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-full bg-gray-100" role="radiogroup" aria-label={t('nav.language')}>
            {([['ka', 'ქართული'], ['en', 'English']] as const).map(([code, label]) => (
              <button key={code} type="button" role="radio" onClick={() => chooseLang(code)} aria-checked={lang === code}
                className={`py-2.5 rounded-full text-sm font-bold transition-colors ${lang === code ? 'bg-white text-teal-700 ring-1 ring-gray-200/80' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
