'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { signOut } from '@/lib/signOut';
import { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const LINKS = [
  { href: '/account', k: 'acc.profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { href: '/account/orders', k: 'acc.ordersPlans', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { href: '/account/dogs', k: 'acc.dogs', icon: 'M4.3 6.3a4.5 4.5 0 000 6.4L12 20.4l7.7-7.7a4.5 4.5 0 00-6.4-6.4L12 7.6l-1.3-1.3a4.5 4.5 0 00-6.4 0z' },
  { href: '/account/referrals', k: 'acc.referrals', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
];

/**
 * Every account page shares this frame: a menu of all sections on the left
 * (a scrolling row of tabs on phones) and a wide content area.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const active = (href: string) => (href === '/account' ? pathname === '/account' : pathname.startsWith(href) || (href === '/account/orders' && pathname.startsWith('/account/subscriptions')));

  const [askOut, setAskOut] = useState(false);
  function leave() {
    signOut();
    router.push('/');
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-14 flex flex-col lg:flex-row gap-6 lg:gap-10">
        <aside className="lg:w-64 shrink-0">
          <nav aria-label={t('acc.title')} className="lg:sticky lg:top-24">
            <p className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-3">{t('acc.title')}</p>
            <ul className="flex lg:flex-col gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
              {LINKS.map((l) => (
                <li key={l.href} className="shrink-0">
                  <Link href={l.href} aria-current={active(l.href) ? 'page' : undefined}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors ${
                      active(l.href) ? 'bg-white text-teal-700 ring-1 ring-teal-100' : 'text-gray-500 hover:bg-white/70 hover:text-gray-800'}`}>
                    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={l.icon} /></svg>
                    {t(l.k)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden lg:block mt-6 space-y-2">
              <Link href="/prices" className="flex items-center justify-center gap-2 w-full bg-teal-600 text-white text-sm font-semibold py-2.5 hover:bg-teal-700">
                + {t('acc.subscribe')}
              </Link>
              <button type="button" onClick={() => setAskOut(true)} className="w-full text-sm font-semibold text-gray-500 hover:text-red-600 py-2.5 rounded-xl hover:bg-white transition">
                {t('acc.signOut')}
              </button>
            </div>
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      <ConfirmDialog open={askOut} onClose={() => setAskOut(false)} onConfirm={leave}
        title={t('acc.signOutQ')} message={t('acc.signOutInfo')} confirmLabel={t('acc.signOut')} />
    </main>
  );
}
