'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import SmartLink from '@/components/SmartLink';
import { API_URL } from '@/lib/api';
import {
  anyTracking, asksAboutCookies, getConsent, setConsent, loadTracking, trackingLoaded, pageView, rememberSource, placeSnippets, setConsentVersion,
  COOKIE_EVENT, type Consent, type PublicMarketing,
} from '@/lib/tracking';

/**
 * The cookie question and what follows from the answer. A card at the
 * bottom asks every new visitor (admin → SEO & tracking → Cookies can limit
 * it to when something tracks): accept all, only necessary, or choose
 * analytics and ads one by one. The answer is kept in the browser and, as
 * proof, on our server; the services for the groups said yes to start. If
 * admin switched the banner off, everything loads straight away.
 */
export default function Tracking({ config }: { config: PublicMarketing | null }) {
  const { t, lang } = useLanguage();
  const pathname = usePathname();
  const [ask, setAsk] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [pick, setPick] = useState<Consent>({ analytics: false, ads: false });
  const [on, setOn] = useState(false);
  const asks = asksAboutCookies(config);
  const tracks = anyTracking(config);
  // Admin's words for the banner, else the site's own.
  const say = (k: string) => (config?.consent.texts?.[lang]?.[k] || '').trim() || t(`cookie.${k}`);

  useEffect(() => {
    if (!config) return;
    setConsentVersion(config.consent.version);
    const start = (c: Consent) => { if (tracks) { loadTracking(config, c); setOn(trackingLoaded()); } };
    if (!config.consent.banner) { start({ analytics: true, ads: true }); return; }
    let current = getConsent();
    if (current) start(current);
    else if (asks) setAsk(true);
    const onChoice = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (v === 'open') { setPick(getConsent() ?? { analytics: false, ads: false }); setChoosing(true); setAsk(true); return; }
      setAsk(false); setChoosing(false);
      const was = current ?? { analytics: false, ads: false };
      current = v;
      // Taking a yes back: what's already running stops on the next page load.
      if (trackingLoaded() && ((was.analytics && !v.analytics) || (was.ads && !v.ads))) { location.reload(); return; }
      start(v);
    };
    window.addEventListener(COOKIE_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_EVENT, onChoice);
  }, [config, asks, tracks]);

  // Ad clicks and campaign links, from whichever page they open.
  useEffect(() => { rememberSource(); }, [pathname]);
  useEffect(() => { if (on) pageView(); }, [on, pathname]);
  // Pasted code that doesn't track (a chat widget, say) needs no yes.
  useEffect(() => { if (config?.snippets) placeSnippets(config.snippets.filter((x) => !x.consent)); }, [config]);

  if (!ask) return null;
  const answer = (c: Consent, choice: 'all' | 'needed' | 'custom') => setConsent(c, choice, API_URL);
  const policy = config?.consent.policy || '/pages/privacy';
  const btn = 'h-11 w-full rounded-2xl px-3 text-[13px] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2';
  return (
    <section role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-text"
      className="cookie-in fixed z-[60] inset-x-3 sm:inset-x-auto sm:right-5 sm:w-[min(520px,calc(100vw-40px))] bottom-[calc(98px+env(safe-area-inset-bottom))] lg:bottom-5 max-h-[calc(100dvh-118px-env(safe-area-inset-bottom))] lg:max-h-[calc(100dvh-40px)] overflow-y-auto overscroll-contain rounded-[28px] bg-white ring-1 ring-gray-200/80 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 ring-1 ring-teal-100 grid place-items-center text-[22px]">🍪</span>
        <div className="min-w-0 flex-1">
          <h2 id="cookie-title" className="font-bold text-gray-900 text-[15.5px] leading-snug">{say('title')}</h2>
          <p id="cookie-text" className="mt-1 text-[13px] leading-relaxed text-gray-600 break-words">
            {say('text')}{' '}
            <SmartLink href={policy} className="font-semibold text-teal-700 underline underline-offset-2 decoration-teal-300 hover:decoration-teal-700">{t('cookie.policy')}</SmartLink>
          </p>
        </div>
      </div>

      {choosing && (
        <ul className="mt-4 grid gap-2">
          <Group title={t('cookie.necessary')} hint={say('necessaryHint')} on locked />
          <Group title={t('cookie.analytics')} hint={say('analyticsHint')} on={pick.analytics} onChange={(v) => setPick((p) => ({ ...p, analytics: v }))} />
          <Group title={t('cookie.ads')} hint={say('adsHint')} on={pick.ads} onChange={(v) => setPick((p) => ({ ...p, ads: v }))} />
        </ul>
      )}

      {/* Three answers of the same size: a row on wider screens, a stack on phones with "accept" on top. */}
      <div className="sticky -bottom-4 sm:-bottom-5 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 px-4 sm:px-5 pb-4 sm:pb-5 pt-3 mt-1 bg-white rounded-b-[28px] flex flex-col-reverse gap-2 sm:grid sm:grid-cols-3">
        {choosing ? (
          <button type="button" onClick={() => answer(pick, pick.analytics && pick.ads ? 'all' : !pick.analytics && !pick.ads ? 'needed' : 'custom')}
            className={`${btn} bg-white ring-1 ring-inset ring-teal-600 text-teal-800 hover:bg-teal-50`}>{say('save')}</button>
        ) : (
          <button type="button" onClick={() => { setPick(getConsent() ?? { analytics: false, ads: false }); setChoosing(true); }}
            className={`${btn} bg-white ring-1 ring-inset ring-gray-300 text-gray-800 hover:bg-gray-50`}>{say('choose')}</button>
        )}
        <button type="button" onClick={() => answer({ analytics: false, ads: false }, 'needed')}
          className={`${btn} bg-teal-50 text-teal-800 hover:bg-teal-100`}>{say('needed')}</button>
        <button type="button" onClick={() => answer({ analytics: true, ads: true }, 'all')}
          className={`${btn} bg-teal-600 text-white hover:bg-teal-700`}>{say('accept')}</button>
      </div>
    </section>
  );
}

/** One group of cookies with its switch (necessary: always on). */
function Group({ title, hint, on, locked, onChange }: { title: string; hint: string; on: boolean; locked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <li>
      {/* The whole row is the switch: an easy target on a phone. */}
      <button type="button" role="switch" aria-checked={on} disabled={locked} onClick={() => onChange?.(!on)}
        className={`w-full flex items-start gap-3 rounded-2xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${on && !locked ? 'bg-teal-50/70' : 'bg-gray-50'} ${locked ? 'cursor-default' : 'hover:bg-teal-50'}`}>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-gray-900">{title}</span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-gray-500">{hint}</span>
        </span>
        <span aria-hidden="true" className={`mt-0.5 shrink-0 w-11 h-6 rounded-full p-0.5 flex transition-colors ${on ? 'bg-teal-600 justify-end' : 'bg-gray-300 justify-start'} ${locked ? 'opacity-50' : ''}`}>
          <span className="w-5 h-5 rounded-full bg-white" />
        </span>
      </button>
    </li>
  );
}
