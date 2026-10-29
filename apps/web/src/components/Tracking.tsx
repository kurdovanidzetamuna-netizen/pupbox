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
  return (
    <section role="dialog" aria-modal="false" aria-labelledby="cookie-title"
      className="fixed z-[60] inset-x-3 sm:inset-x-auto sm:right-5 sm:w-[420px] bottom-[calc(76px+env(safe-area-inset-bottom))] lg:bottom-5 max-h-[calc(100dvh-110px)] overflow-y-auto rounded-3xl bg-white ring-1 ring-gray-200 p-5 animate-[pop_0.3s_ease-out]">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-2xl bg-teal-50 grid place-items-center text-xl">🍪</span>
        <div className="min-w-0">
          <h2 id="cookie-title" className="font-bold text-gray-900 text-[15px]">{say('title')}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
            {say('text')}{' '}
            <SmartLink href={policy} className="font-semibold text-teal-700 underline underline-offset-2">{t('cookie.policy')}</SmartLink>
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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => answer({ analytics: false, ads: false }, 'needed')}
          className="h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-[13px] font-semibold transition-colors">{say('needed')}</button>
        <button type="button" onClick={() => answer({ analytics: true, ads: true }, 'all')}
          className="h-11 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold transition-colors">{say('accept')}</button>
      </div>
      {choosing ? (
        <button type="button" onClick={() => answer(pick, pick.analytics && pick.ads ? 'all' : !pick.analytics && !pick.ads ? 'needed' : 'custom')}
          className="mt-2 w-full h-11 rounded-2xl ring-1 ring-teal-600 text-teal-800 hover:bg-teal-50 text-[13px] font-semibold transition-colors">{say('save')}</button>
      ) : (
        <button type="button" onClick={() => { setPick(getConsent() ?? { analytics: false, ads: false }); setChoosing(true); }}
          className="mt-2 w-full h-10 rounded-2xl text-teal-700 hover:bg-teal-50 text-[13px] font-semibold transition-colors">{say('choose')}</button>
      )}
    </section>
  );
}

/** One group of cookies with its switch (necessary: always on). */
function Group({ title, hint, on, locked, onChange }: { title: string; hint: string; on: boolean; locked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-gray-900">{title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-gray-500">{hint}</div>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={title} disabled={locked} onClick={() => onChange?.(!on)}
        className={`mt-0.5 shrink-0 w-11 h-6 rounded-full p-0.5 flex transition-colors ${on ? 'bg-teal-600 justify-end' : 'bg-gray-300 justify-start'} ${locked ? 'opacity-60' : ''}`}>
        <span className="w-5 h-5 rounded-full bg-white" />
      </button>
    </li>
  );
}
