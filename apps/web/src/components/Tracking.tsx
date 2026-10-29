'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { anyTracking, getConsent, setConsent, loadTracking, trackingLoaded, pageView, rememberSource, placeSnippets, COOKIE_EVENT, type PublicMarketing } from '@/lib/tracking';

/**
 * Starts the ads and analytics admin connected, once the visitor says yes,
 * and asks them first with a small card at the bottom. With nothing
 * connected there's nothing to ask, so no card. If admin switched the card
 * off, everything loads straight away.
 */
export default function Tracking({ config }: { config: PublicMarketing | null }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [ask, setAsk] = useState(false);
  const [on, setOn] = useState(false);
  const wanted = anyTracking(config);

  // Pasted code that doesn't track (a chat widget, say) needs no yes.
  useEffect(() => { if (config?.snippets) placeSnippets(config.snippets.filter((x) => !x.consent)); }, [config]);

  useEffect(() => {
    if (!config || !wanted) return;
    const choice = config.consent.banner ? getConsent() : 'all';
    if (choice === 'all') { loadTracking(config); setOn(true); }
    else if (!choice) setAsk(true);
    const onChoice = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (v === 'open') { setAsk(true); return; }
      setAsk(false);
      if (v === 'all') { loadTracking(config); setOn(true); }
      // Taking a yes back: the services already running stop on the next page load.
      else if (v === 'needed' && trackingLoaded()) location.reload();
    };
    window.addEventListener(COOKIE_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_EVENT, onChoice);
  }, [config, wanted]);

  // Ad clicks and campaign links, from whichever page they open.
  useEffect(() => { rememberSource(); }, [pathname]);
  useEffect(() => { if (on) pageView(); }, [on, pathname]);

  if (!ask) return null;
  return (
    <section role="dialog" aria-modal="false" aria-labelledby="cookie-title"
      className="fixed z-[60] inset-x-3 sm:inset-x-auto sm:right-5 sm:w-[400px] bottom-[calc(76px+env(safe-area-inset-bottom))] lg:bottom-5 rounded-3xl bg-white ring-1 ring-gray-200 p-5 animate-[pop_0.3s_ease-out]">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-2xl bg-teal-50 grid place-items-center text-xl">🍪</span>
        <div className="min-w-0">
          <h2 id="cookie-title" className="font-bold text-gray-900 text-[15px]">{t('cookie.title')}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-600">{t('cookie.text')}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setConsent('needed')}
          className="h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-[13px] font-semibold transition-colors">{t('cookie.needed')}</button>
        <button type="button" onClick={() => setConsent('all')}
          className="h-11 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold transition-colors">{t('cookie.accept')}</button>
      </div>
    </section>
  );
}
