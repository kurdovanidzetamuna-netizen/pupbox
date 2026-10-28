'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { atLang } from '@/lib/seo';
import { useAuthPopup } from '@/components/AuthPopup';

/**
 * Sign in | Sign up as one switch, at the top of both forms (pop-up and full
 * page), styled like the plans toggle: a white pill slides under the chosen
 * side. Switching keeps the place to return to and replaces the address, so
 * Back still closes the pop-up.
 */
export default function AuthTabs({ current }: { current: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const { t, lang } = useLanguage();
  const popup = useAuthPopup();
  const go = (to: 'login' | 'register') => {
    if (to === current) return;
    const redirect = params.get('redirect') ?? new URLSearchParams(window.location.search).get('redirect');
    const href = atLang(`/${to}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`, lang);
    // In the pop-up it switches in place; on the full page it goes to the other page.
    if (popup) popup.switchTo(to, href);
    else router.replace(href, { scroll: false });
  };
  return (
    <div role="tablist" aria-label={`${t('nav.signIn')} / ${t('nav.signUp')}`}
      className="relative grid grid-cols-2 p-1 mb-6 rounded-full bg-gray-200/80 ring-1 ring-inset ring-gray-300/60">
      <span aria-hidden="true"
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white ring-1 ring-gray-200 transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${current === 'register' ? 'translate-x-full' : 'translate-x-0'}`} />
      {(['login', 'register'] as const).map((k) => (
        <button key={k} type="button" role="tab" aria-selected={current === k} onClick={() => go(k)}
          className={`relative z-10 h-10 rounded-full text-[13.5px] font-bold transition-colors ${current === k ? 'text-teal-700' : 'text-gray-600 hover:text-gray-900'}`}>
          {t(k === 'login' ? 'nav.signIn' : 'nav.signUp')}
        </button>
      ))}
    </div>
  );
}
