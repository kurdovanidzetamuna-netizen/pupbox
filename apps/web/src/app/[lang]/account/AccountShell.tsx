'use client';
import Button from '@/components/ui/Button';
import Link from '@/components/LangLink';
import { useRouter } from 'next/navigation';
import { usePath } from '@/lib/path';
import { useLanguage } from '@/context/LanguageContext';
import { signOut } from '@/lib/signOut';
import { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import IconButton from '@/components/ui/IconButton';
import { useUnread } from '@/lib/notifications';

const LINKS = [
  { href: '/account', k: 'acc.profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { href: '/account/orders', k: 'acc.ordersPlans', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { href: '/account/notifications', k: 'ntf.title', icon: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { href: '/account/dogs', k: 'acc.dogs', icon: 'M4.3 6.3a4.5 4.5 0 000 6.4L12 20.4l7.7-7.7a4.5 4.5 0 00-6.4-6.4L12 7.6l-1.3-1.3a4.5 4.5 0 00-6.4 0z' },
  { href: '/account/referrals', k: 'acc.referrals', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
];

/**
 * Every account page shares this frame: a menu of all sections on the left
 * (a scrolling row of tabs on phones) and a wide content area.
 */
export default function AccountShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePath();
  const router = useRouter();
  const active = (href: string) => (href === '/account' ? pathname === '/account' : pathname.startsWith(href) || (href === '/account/orders' && pathname.startsWith('/account/subscriptions')));

  const [askOut, setAskOut] = useState(false);
  const unread = useUnread(false);
  function leave() {
    signOut();
    router.push('/');
  }

  return (
    <main className="min-h-screen bg-pastel-grey">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 lg:pt-10 pb-14 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-10">
        <aside className="lg:w-64 shrink-0">
          <nav aria-label={t('acc.title')} className="lg:sticky lg:top-24">
            <p className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-3">{t('acc.title')}</p>
            <ul className="flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
              {LINKS.map((l) => (
                <li key={l.href} className="shrink-0">
                  <Link href={l.href} aria-current={active(l.href) ? 'page' : undefined}
                    className={`flex items-center gap-2 lg:gap-2.5 h-10 lg:h-auto px-3.5 lg:py-2.5 rounded-full lg:rounded-[14px] text-[13px] font-semibold whitespace-nowrap ring-1 ring-inset transition-colors ${
                      active(l.href) ? 'bg-teal-50 lg:bg-white text-teal-700 ring-teal-300 lg:ring-teal-100' : 'bg-white lg:bg-transparent text-gray-600 lg:text-gray-500 ring-gray-200 lg:ring-transparent hover:bg-white/70 hover:text-gray-800'}`}>
                    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={l.icon} /></svg>
                    {t(l.k)}
                    {l.href === '/account/notifications' && unread > 0 && <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] font-bold leading-[18px] text-center tabular-nums">{unread}</span>}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden lg:block mt-6 space-y-2">
              <Button href="/prices" icon="box" label={t('acc.subscribe').replace(/^\+\s*/, '')} className="w-full" />
              <div className="flex justify-center">
                <IconButton icon="logout" size="sm" label={t('acc.signOut')} onClick={() => setAskOut(true)} />
              </div>
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
