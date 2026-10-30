'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from '@/components/LangLink';
import { usePath } from '@/lib/path';
import { useLanguage } from '@/context/LanguageContext';
import { Icon } from '@/components/ui/icons';
import { API_URL as API } from '@/lib/api';
import { savedToken } from '@/lib/authFetch';

interface Popup {
  id: string;
  active: boolean;
  type: string;
  titleEn: string; titleKa: string;
  bodyEn: string; bodyKa: string;
  ctaTextEn: string; ctaTextKa: string;
  ctaUrl: string;
  couponCode: string;
  imageUrl: string;
  trigger: string;
  delaySeconds: number;
  showOnPages: string[];
  showOncePerSession: boolean;
  showOncePerDay: boolean;
  /** all · guests (not signed in) · customers (signed in). */
  audience?: string;
  /** YYYY-MM-DD, inclusive. */
  startsAt?: string;
  endsAt?: string;
}

const DISMISSED_KEY = 'pupbox_dismissed_popups';
const SHOWN_TODAY_KEY = 'pupbox_popups_shown_today';
/** Phones have no mouse to "leave" with: an exit offer waits this long instead. */
const TOUCH_EXIT_MS = 25_000;

const read = <T,>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };
const getDismissed = () => read(() => new Set<string>(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]')), new Set<string>());
function getShownToday(): Set<string> {
  return read(() => {
    const { date, ids } = JSON.parse(localStorage.getItem(SHOWN_TODAY_KEY) || '{}');
    return date === new Date().toDateString() ? new Set<string>(ids) : new Set<string>();
  }, new Set<string>());
}
function markShownToday(id: string) {
  const ids = getShownToday(); ids.add(id);
  read(() => localStorage.setItem(SHOWN_TODAY_KEY, JSON.stringify({ date: new Date().toDateString(), ids: [...ids] })), undefined);
}
function markDismissed(id: string) {
  const ids = getDismissed(); ids.add(id);
  read(() => sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids])), undefined);
}

/** Which part of the site a path is, in the names admin picks from. */
function pageName(path: string): string {
  if (path === '/' || path === '') return 'homepage';
  const first = path.split('/')[1] ?? '';
  if (first === 'subscribe') return 'prices';
  return first;
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function applies(p: Popup, path: string, signedIn: boolean) {
  if (!p.active) return false;
  const pages = p.showOnPages?.length ? p.showOnPages : ['all'];
  if (!pages.includes('all') && !pages.includes(pageName(path))) return false;
  if (p.audience === 'guests' && signedIn) return false;
  if (p.audience === 'customers' && !signedIn) return false;
  const d = today();
  if (p.startsAt && d < p.startsAt) return false;
  if (p.endsAt && d > p.endsAt) return false;
  return true;
}

const count = (id: string, what: 'seen' | 'clicked') => { fetch(`${API}/cms/popups/${id}/${what}`, { method: 'POST', keepalive: true }).catch(() => {}); };

/**
 * The promo pop-up set in admin → Promo pop-ups: the first live one for this
 * page, visitor and date, shown on its trigger. A centred card on wider
 * screens, a sheet from the bottom on phones. Its words follow the site's
 * language; the button opens a page here or another site in a new tab;
 * a promo code copies with one tap. Views and taps are counted for admin.
 */
export default function PromoPopup() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const path = usePath();
  const { lang, t } = useLanguage();
  const seen = useRef('');

  const show = useCallback((p: Popup) => {
    setVisible(true);
    if (seen.current !== p.id) { seen.current = p.id; markShownToday(p.id); count(p.id, 'seen'); }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setPopup(null), 300);
    if (popup) markDismissed(popup.id);
  }, [popup]);

  useEffect(() => {
    setVisible(false); setPopup(null);
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    (async () => {
      try {
        const res = await fetch(`${API}/cms/config-promo-popups`);
        if (!res.ok || cancelled) return;
        const all: Popup[] = (await res.json())?.content?.popups || [];
        const signedIn = !!read(() => savedToken(), null);
        const dismissed = getDismissed(), shownToday = getShownToday();
        const p = all.find((x) => applies(x, path, signedIn) && !(x.showOncePerSession && dismissed.has(x.id)) && !(x.showOncePerDay && shownToday.has(x.id)));
        if (!p || cancelled) return;
        setPopup(p);
        const later = (ms: number) => { const id = setTimeout(() => show(p), ms); cleanups.push(() => clearTimeout(id)); };
        if (p.trigger === 'on_load') later(300);
        else if (p.trigger === 'after_delay') later((p.delaySeconds || 5) * 1000);
        else if (p.trigger === 'on_scroll') {
          const onScroll = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (max <= 0 || window.scrollY / max >= 0.5) { show(p); window.removeEventListener('scroll', onScroll); }
          };
          window.addEventListener('scroll', onScroll, { passive: true });
          cleanups.push(() => window.removeEventListener('scroll', onScroll));
        } else if (p.trigger === 'exit_intent') {
          if (window.matchMedia('(hover: none)').matches) later(TOUCH_EXIT_MS);
          else {
            const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) { show(p); document.removeEventListener('mouseleave', onLeave); } };
            document.addEventListener('mouseleave', onLeave);
            cleanups.push(() => document.removeEventListener('mouseleave', onLeave));
          }
        }
      } catch { /* no pop-up is fine */ }
    })();
    return () => { cancelled = true; cleanups.forEach((c) => c()); };
  }, [path, show]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, dismiss]);

  if (!popup) return null;

  const pick = (ka: string, en: string) => (lang === 'ka' ? ka || en : en || ka);
  const title = pick(popup.titleKa, popup.titleEn);
  const body = pick(popup.bodyKa, popup.bodyEn);
  const cta = pick(popup.ctaTextKa, popup.ctaTextEn);
  const external = /^https?:\/\//.test(popup.ctaUrl || '');

  function copy() {
    if (!popup?.couponCode) return;
    navigator.clipboard?.writeText(popup.couponCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }
  const tapped = () => { count(popup.id, 'clicked'); dismiss(); };
  const button = 'flex w-full items-center justify-center gap-2 h-12 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-[15px] font-bold transition-colors';

  return (
    <div className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      role="dialog" aria-modal="true" aria-label={title} aria-hidden={!visible}>
      <div onClick={dismiss} className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" />
      <div className={`relative w-full sm:max-w-[420px] sm:mx-4 bg-white rounded-t-[28px] sm:rounded-[28px] overflow-hidden transition-transform duration-300 ${visible ? 'translate-y-0 sm:scale-100' : 'translate-y-6 sm:scale-95'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button type="button" onClick={dismiss} aria-label={t('popup.close')}
          className="absolute top-3 right-3 z-[1] w-9 h-9 rounded-full bg-white/90 ring-1 ring-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center">
          <Icon name="close" className="w-4 h-4" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {popup.imageUrl ? <img src={popup.imageUrl} alt="" className="block w-full h-40 sm:h-44 object-cover" />
          : <div className="pt-8 flex justify-center"><span className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center"><Icon name={popup.couponCode ? 'gift' : 'sparkle'} className="w-7 h-7" /></span></div>}
        <div className="px-6 pt-5 pb-6 text-center">
          {title && <h2 className="text-[21px] font-extrabold text-gray-900 leading-tight">{title}</h2>}
          {body && <p className="mt-2 text-[14px] text-gray-500 leading-relaxed">{body}</p>}
          {popup.couponCode && (
            <button type="button" onClick={copy} className="mt-4 inline-flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl border-[1.5px] border-dashed border-teal-300 bg-teal-50 hover:bg-teal-100/70 transition-colors">
              <span className="font-mono text-[18px] font-extrabold tracking-[0.1em] text-teal-800 whitespace-nowrap">{popup.couponCode}</span>
              <span className="text-[11.5px] font-semibold text-teal-700 inline-flex items-center gap-1 whitespace-nowrap"><Icon name={copied ? 'check' : 'copy'} className="w-3.5 h-3.5" />{copied ? t('popup.copied') : t('popup.copy')}</span>
            </button>
          )}
          {cta && popup.ctaUrl && (
            <div className="mt-5">
              {external
                ? <a href={popup.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={tapped} className={button}>{cta}<Icon name="arrow" className="w-4 h-4" /></a>
                : <Link href={popup.ctaUrl} onClick={tapped} className={button}>{cta}<Icon name="arrow" className="w-4 h-4" /></Link>}
            </div>
          )}
          <button type="button" onClick={dismiss} className="mt-3 text-[13px] font-semibold text-gray-400 hover:text-gray-600">{t('popup.noThanks')}</button>
        </div>
      </div>
    </div>
  );
}
