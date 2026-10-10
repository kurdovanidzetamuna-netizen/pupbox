'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/signOut';
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => { if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [accountOpen]);

  function leave() {
    signOut();
    setSignedIn(false);
    setAccountOpen(false);
    setMenuOpen(false);
    router.push('/');
  }

  const accountLinks = [
    { href: '/account', label: t('nav.account') },
    { href: '/account/orders', label: t('acc.orders') },
    { href: '/account/subscriptions', label: t('acc.subscriptions') },
    { href: '/account/dogs', label: t('acc.dogs') },
  ];

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
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b-2 border-ink/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Logo brand={c.brand} />

        <nav className="hidden md:flex gap-8 text-[15px] font-semibold text-ink/80" aria-label="Main">
          {nav.map((n, i) => (
            <SmartLink key={i} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
              className={`transition-colors hover:text-teal-600 ${isActive(n.href) ? 'text-teal-600 font-semibold' : ''}`}>
              {n.label}
            </SmartLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {signedIn ? (
            <div className="relative hidden md:block" ref={accountRef}>
              <button type="button" onClick={() => setAccountOpen(o => !o)} aria-haspopup="menu" aria-expanded={accountOpen}
                className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-teal-600 border-2 border-ink/80 hover:border-teal-600 px-5 py-2 rounded-full transition-colors">
                {account.label}
                <svg className={`w-3 h-3 ml-0.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {accountOpen && (
                <div role="menu" className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
                  {accountLinks.map(l => (
                    <Link key={l.href} href={l.href} role="menuitem" className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">{l.label}</Link>
                  ))}
                  <button type="button" role="menuitem" onClick={leave} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 border-t border-gray-100">
                    {t('acc.signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href={account.href} className="hidden md:block text-sm font-bold text-gray-600 hover:text-teal-600 border-2 border-ink/80 hover:border-teal-600 px-5 py-2 rounded-full transition-colors">
              {account.label}
            </Link>
          )}
          {c.header.buttonText && (
            <SmartLink href={c.header.buttonHref} className="hidden sm:inline-flex items-center justify-center bg-coral-400 text-white text-sm font-extrabold px-5 py-2.5 hover:bg-coral-600">
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
              className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-teal-600 border-2 border-ink/15 hover:border-teal-600 rounded-full px-4 py-2 transition-colors">
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
        <nav id="mobile-menu" aria-label="Main" className="md:hidden border-t border-ink/10 bg-cream px-4 pb-5 pt-2">
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
            <SmartLink href={c.header.buttonHref} className="mt-4 flex w-full items-center justify-center bg-coral-400 text-white font-extrabold py-3.5 hover:bg-coral-600">
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
