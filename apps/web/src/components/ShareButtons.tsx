'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Icon } from '@/components/ui/icons';

const BRAND = {
  whatsapp: 'M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 01-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1112 21.8zm0-21.6A11.8 11.8 0 001.8 17.8L.1 24l6.3-1.7A11.8 11.8 0 1012 .2z',
  telegram: 'M22 3.3L2.6 10.8c-1.3.5-1.3 1.3-.2 1.6l5 1.6 11.5-7.3c.5-.3 1-.1.6.2l-9.3 8.4-.4 5.1c.5 0 .8-.2 1.1-.5l2.4-2.3 5 3.7c.9.5 1.6.2 1.8-.9l3.3-15.4c.3-1.4-.5-2-1.4-1.6z',
  facebook: 'M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0022 12z',
  messenger: 'M12 2C6.4 2 2 6.1 2 11.6c0 2.9 1.2 5.4 3.2 7.1v3.3l3-1.7c.9.2 1.8.4 2.8.4 5.6 0 10-4.1 10-9.6S17.6 2 12 2zm1 12.9l-2.5-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.5 5.8z',
  viber: 'M11.4 1C8.6 1 3 1.6 2 6.6c-.5 2.6-.5 5.8 0 8.3.6 3 2.6 4.2 4.4 4.7v3.2c0 .9 1 .9 1.6.3l2.6-2.9c4.4.1 9.6-.4 10.9-5.9.6-2.5.6-5.7 0-8.3C20.3 1.4 14.4 1 11.4 1zm.2 3c2.6 0 5.1 1.8 5.3 5.4 0 .3-.2.5-.5.5s-.5-.2-.5-.5c-.2-3-2.1-4.4-4.3-4.4-.3 0-.5-.2-.5-.5s.2-.5.5-.5zm-3.4.9c.3 0 .6.2.8.5l1 1.6c.3.5.2 1-.2 1.3l-.5.4c-.2.2-.2.5-.1.8.6 1.4 1.6 2.5 3 3.1.3.1.6.1.8-.1l.4-.5c.3-.4.9-.5 1.3-.2l1.6 1.1c.5.3.6 1 .2 1.4l-.6.7c-.6.6-1.4.7-2.2.4-2.9-1.2-5.2-3.5-6.4-6.4-.3-.8-.2-1.6.4-2.2l.7-.6c.2-.2.5-.3.8-.3zm3.5.8c1.5 0 2.7 1.1 2.8 2.9 0 .3-.2.5-.5.5s-.5-.2-.5-.5c-.1-1.2-.8-1.9-1.8-1.9-.3 0-.5-.2-.5-.5s.2-.5.5-.5z',
} as const;

/**
 * Share this page: the phone's own share sheet where there is one, a copy
 * button, and direct links for WhatsApp, Telegram, Facebook, Messenger and
 * Viber. Icons only; each says what it does on hover and to screen readers.
 */
export default function ShareButtons({ title, url: given, className = '', size = 'w-10 h-10', appsOnly = false }: {
  title: string;
  /** What to share; this page when left out. */
  url?: string;
  className?: string;
  size?: string;
  /** Just the app links, when the page has its own Share and Copy buttons. */
  appsOnly?: boolean;
}) {
  const { lang } = useLanguage();
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => { setUrl(given || window.location.href.split('#')[0]); setNative(typeof navigator.share === 'function'); }, [given]);

  const L = (ka: string, en: string) => (lang === 'en' ? en : ka);
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const links = [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${text}%20${u}`, color: 'hover:bg-[#25D366]' },
    { key: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${text}`, color: 'hover:bg-[#229ED9]' },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, color: 'hover:bg-[#1877F2]' },
    { key: 'messenger', label: 'Messenger', href: `fb-messenger://share/?link=${u}`, color: 'hover:bg-[#0084FF]' },
    { key: 'viber', label: 'Viber', href: `viber://forward?text=${text}%20${u}`, color: 'hover:bg-[#7360F2]' },
  ] as const;

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  const btn = `group/tip relative ${size} rounded-full bg-gray-100 text-gray-600 flex items-center justify-center transition-colors hover:text-white`;
  const tip = (label: string) => (
    <span role="tooltip" className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden [@media(hover:hover)]:group-hover/tip:block whitespace-nowrap rounded-lg bg-gray-800 text-white text-[11px] font-medium px-2 py-1 z-30">{label}</span>
  );

  if (!url) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label={L('გაზიარება', 'Share')}>
      {native && !appsOnly && (
        <button type="button" onClick={() => navigator.share({ title, url }).catch(() => {})} aria-label={L('გაზიარება', 'Share')} className={`${btn} hover:bg-teal-600`}>
          <Icon name="send" className="w-[18px] h-[18px]" />{tip(L('გაზიარება', 'Share'))}
        </button>
      )}
      {!appsOnly && <button type="button" onClick={copy} aria-label={L('ბმულის კოპირება', 'Copy link')} className={`${btn} ${copied ? '!bg-teal-600 !text-white' : 'hover:bg-teal-600'}`}>
        <Icon name={copied ? 'check' : 'link'} className="w-[18px] h-[18px]" />{tip(copied ? L('დაკოპირდა', 'Copied') : L('ბმულის კოპირება', 'Copy link'))}
      </button>}
      {links.map((l) => (
        <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.label} className={`${btn} ${l.color}`}>
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={BRAND[l.key]} /></svg>{tip(l.label)}
        </a>
      ))}
    </div>
  );
}
