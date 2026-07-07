'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold text-teal-600 flex items-center gap-1">
          🐾 Pupbox
        </Link>

        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
          <Link href="/how-it-works" className={`transition-colors hover:text-teal-600 ${isActive('/how-it-works') ? 'text-teal-600 font-semibold' : ''}`}>
            {t('nav.howItWorks')}
          </Link>
          <Link href="/prices" className={`transition-colors hover:text-teal-600 ${isActive('/prices') || isActive('/subscribe') ? 'text-teal-600 font-semibold' : ''}`}>
            {t('nav.pricing')}
          </Link>
          <Link href="/shop" className={`transition-colors hover:text-teal-600 ${isActive('/shop') ? 'text-teal-600 font-semibold' : ''}`}>
            {t('nav.shop')}
          </Link>
          <Link href="/blog" className={`transition-colors hover:text-teal-600 ${isActive('/blog') ? 'text-teal-600 font-semibold' : ''}`}>
            {t('nav.blog')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:block text-sm font-bold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 px-5 py-2 rounded-xl transition-colors">
            {t('nav.signIn')}
          </Link>
          <Link href="/prices" className="inline-flex items-center justify-center bg-teal-600 text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm">
            {t('nav.subscribe')}
          </Link>

          {/* Language switcher */}
          <div className="relative group">
            <button className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-teal-600 border border-gray-200 hover:border-teal-400 rounded-lg px-5 py-2 transition-colors">
              {lang === 'en' ? 'EN' : 'KA'}
              <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-28 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <button
                onClick={() => setLang('ka')}
                className={`w-full px-4 py-2.5 text-sm font-medium text-left transition-colors ${lang === 'ka' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                ქართული
              </button>
              <button
                onClick={() => setLang('en')}
                className={`w-full px-4 py-2.5 text-sm font-medium text-left transition-colors ${lang === 'en' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
