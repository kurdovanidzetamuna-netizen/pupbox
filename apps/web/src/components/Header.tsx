'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { sitePage, type StoredContent } from '@pupbox/content';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { usePage } from '@/lib/usePage';
import Logo from '@/components/Logo';
import SmartLink from '@/components/SmartLink';

/** Logo, menu and button come from admin → Page Builder → Header & Footer. */
export default function Header({ site }: { site: StoredContent | null }) {
  const { lang, setLang, t } = useLanguage();
  const c = usePage(sitePage, site);
  const nav: { label: string; href: string }[] = c.header.links.filter((n: any) => n.label);
  const { cart } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const count = cart?.itemCount ?? 0;
  // Compare paths only: a menu link may carry a query (/prices?gift=true).
  const isActive = (href: string) => {
    const path = href.split(/[?#]/)[0];
    return path.startsWith('/') && (path === '/' ? pathname === '/' : pathname.startsWith(path));
  };

  // Read after every navigation: signing in and out happen on other pages.
  useEffect(() => {
    setSignedIn(!!localStorage.getItem('pupbox_token'));
    setMenuOpen(false);
    setLangOpen(false);
  }, [pathname]);

  // The language menu opens on click (not hover) so it works by touch and
  // keyboard; it closes on an outside click or Escape.
  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: MouseEvent) => { if (!langRef.current?.contains(e.target as Node)) setLangOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLangOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [langOpen]);

  const chooseLang = (l: 'en' | 'ka') => { setLang(l); setLangOpen(false); };
  const account = signedIn ? { href: '/account', label: t('nav.account') } : { href: '/login', label: t('nav.signIn') };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Logo brand={c.brand} />

        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600" aria-label="Main">
          {nav.map((n, i) => (
            <SmartLink key={i} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
              className={`transition-colors hover:text-teal-600 ${isActive(n.href) ? 'text-teal-600 font-semibold' : ''}`}>
              {n.label}
            </SmartLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href={account.href} className="hidden md:block text-sm font-bold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 px-5 py-2 rounded-xl transition-colors">
            {account.label}
          </Link>
          {c.header.buttonText && (
            <SmartLink href={c.header.buttonHref} className="hidden sm:inline-flex items-center justify-center bg-teal-600 text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm">
              {c.header.buttonText}
            </SmartLink>
          )}

          {/* Cart — the only way back to the basket from any page. */}
          <Link href="/cart" aria-label={`${t('nav.cart')}${count ? ` (${count})` : ''}`}
            className="relative inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-700 hover:bg-gray-100 hover:text-teal-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-teal-600 text-white text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>

          {/* Language */}
          <div className="relative hidden md:block" ref={langRef}>
            <button type="button" onClick={() => setLangOpen(o => !o)} aria-haspopup="menu" aria-expanded={langOpen} aria-label={t('nav.language')}
              className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-4 py-2 transition-colors">
              {lang === 'en' ? 'EN' : 'KA'}
              <svg className={`w-3 h-3 ml-0.5 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {langOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1.5 w-32 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
                {([['ka', 'ქართული'], ['en', 'English']] as const).map(([code, label]) => (
                  <button key={code} type="button" role="menuitemradio" aria-checked={lang === code} onClick={() => chooseLang(code)}
                    className={`w-full px-4 py-2.5 text-sm font-medium text-left transition-colors ${lang === code ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone & tablet menu */}
          <button type="button" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={t('nav.menu')}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Main" className="md:hidden border-t border-gray-100 bg-white px-4 pb-5 pt-2">
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
          </ul>
          {c.header.buttonText && (
            <SmartLink href={c.header.buttonHref} className="mt-4 flex w-full items-center justify-center bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700">
              {c.header.buttonText}
            </SmartLink>
          )}
          <div className="mt-4 flex gap-2" role="group" aria-label={t('nav.language')}>
            {([['ka', 'ქართული'], ['en', 'English']] as const).map(([code, label]) => (
              <button key={code} type="button" onClick={() => chooseLang(code)} aria-pressed={lang === code}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${lang === code ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
