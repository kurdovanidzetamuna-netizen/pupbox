'use client';
import CookieSettingsLink from '@/components/CookieSettingsLink';
import { useState } from 'react';
import { sitePage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { useLanguage } from '@/context/LanguageContext';
import Logo from '@/components/Logo';
import SmartLink from '@/components/SmartLink';
import { Icon } from '@/components/ui/icons';
import { API_URL as API } from '@/lib/api';


const SOCIAL: { key: 'instagram' | 'facebook' | 'tiktok'; label: string; path: string }[] = [
  { key: 'instagram', label: 'Instagram', path: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.9a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 8.1a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.1-9.4a1.1 1.1 0 100 2.3 1.1 1.1 0 000-2.3z' },
  { key: 'facebook', label: 'Facebook', path: 'M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0022 12z' },
  { key: 'tiktok', label: 'TikTok', path: 'M16.6 5.8A4.3 4.3 0 0113.4 2h-3.1v13.4a2.6 2.6 0 11-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 104.9 5.7V8.6a7.3 7.3 0 004.3 1.4V6.9a4.3 4.3 0 01-1.1-1.1z' },
];

type L = { label: string; href: string };

function LinkColumn({ title, links }: { title: string; links: L[] }) {
  const shown = links.filter((l) => l.label);
  if (!shown.length) return null;
  return (
    <div>
      <p className="text-[13px] font-bold text-gray-900 mb-3">{title}</p>
      <ul className="space-y-1">
        {shown.map((l) => (
          <li key={l.href + l.label}>
            <SmartLink href={l.href} className="inline-flex items-center min-h-[32px] text-[13.5px] text-gray-500 hover:text-teal-700 transition-colors">{l.label}</SmartLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The newsletter box: email in, a friendly thank-you out. */
function Newsletter() {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'bad' | 'fail'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setState('bad');
    setState('busy');
    try {
      const r = await fetch(`${API}/newsletter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), language: lang }) });
      setState(r.ok ? 'done' : r.status === 400 ? 'bad' : 'fail');
    } catch { setState('fail'); }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 rounded-[24px] bg-gray-50 ring-1 ring-gray-100 px-5 py-5 sm:px-8 sm:py-7">
      <div className="md:flex-1">
        <p className="text-[16px] sm:text-[17px] font-bold text-gray-900">{t('ftr.newsTitle')}</p>
        <p className="text-[13.5px] text-gray-500 mt-1">{t('ftr.newsSub')}</p>
      </div>
      {state === 'done' ? (
        <p role="status" className="md:flex-1 inline-flex items-center gap-2 text-[14px] font-semibold text-teal-700">
          <Icon name="check" className="w-5 h-5" strokeWidth={2.4} />
          {t('ftr.newsDone')}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="md:flex-1 w-full">
          <div className="flex gap-2">
            <label htmlFor="news-email" className="sr-only">{t('ftr.newsPlaceholder')}</label>
            <input id="news-email" type="email" inputMode="email" autoComplete="email" value={email}
              onChange={(e) => { setEmail(e.target.value); if (state !== 'busy') setState('idle'); }}
              placeholder={t('ftr.newsPlaceholder')} aria-invalid={state === 'bad'}
              className="flex-1 min-w-0 h-11 px-4 rounded-full bg-white ring-1 ring-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-teal-500" />
            <button type="submit" disabled={state === 'busy'} aria-label={t('ftr.newsBtn')} title={t('ftr.newsBtn')}
              className="shrink-0 w-11 h-11 rounded-full bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center justify-center transition-colors disabled:opacity-60">
              <Icon name="send" className="w-5 h-5" />
            </button>
          </div>
          {(state === 'bad' || state === 'fail') && (
            <p role="alert" className="mt-2 text-[12.5px] font-medium text-red-600">{t(state === 'bad' ? 'ftr.newsBad' : 'ftr.newsFail')}</p>
          )}
        </form>
      )}
    </div>
  );
}

/**
 * On every page: newsletter, then the brand with socials and contact, then
 * Shop · Help · Account links, then copyright, legal links and payment marks.
 * The tagline, links, contact and socials are edited in admin → Page Builder
 * → Header & Footer.
 */
export default function Footer({ site, cookies = false }: { site: StoredContent | null; /** The site asks about cookies: offer to change the answer. */ cookies?: boolean }) {
  const c = usePage(sitePage, site);
  const { t } = useLanguage();
  const { footer, contact, social } = c;
  const showContact = c.on('contact') && (contact.email || contact.phone || contact.address || contact.hours);
  const socials = c.on('social') ? SOCIAL.filter((s) => social[s.key]) : [];

  const shop: L[] = [
    ...footer.column1Links.filter((l: L) => !/^\/(blog|how-it-works|faq)/.test(l.href)),
    { label: t('nav.buildBox'), href: '/build-box' },
    { label: t('nav.gift'), href: '/prices?gift=true' },
  ].filter((l, i, all) => all.findIndex((x) => x.href === l.href) === i);
  const help: L[] = [
    { label: t('nav.howItWorks'), href: '/how-it-works' },
    { label: t('nav.faq'), href: '/faq' },
    { label: t('nav.blog'), href: '/blog' },
    ...(contact.email ? [{ label: t('ftr.contact'), href: `mailto:${contact.email}` }] : []),
  ];

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        <Newsletter />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-x-6 gap-y-8 py-8 sm:py-12">
          <div className="col-span-2 sm:col-span-3 lg:col-span-5">
            <Logo brand={c.brand} />
            {footer.tagline && <p className="text-[13.5px] text-gray-500 leading-relaxed mt-3 max-w-sm">{footer.tagline}</p>}
            {showContact && (
              <ul className="mt-4 space-y-2 text-[13.5px] text-gray-500">
                {contact.email && <li><a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-teal-700"><Icon name="mail" className="w-4 h-4 text-teal-600" />{contact.email}</a></li>}
                {contact.phone && <li><a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-teal-700"><Icon name="phone" className="w-4 h-4 text-teal-600" />{contact.phone}</a></li>}
                {contact.address && <li className="flex items-center gap-2"><Icon name="pin" className="w-4 h-4 text-teal-600" />{contact.address}</li>}
                {contact.hours && <li className="flex items-center gap-2"><Icon name="calendar" className="w-4 h-4 text-teal-600" />{contact.hours}</li>}
              </ul>
            )}
            {socials.length > 0 && (
              <div className="mt-5">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">{t('ftr.follow')}</p>
                <div className="flex gap-2.5">
                  {socials.map((s) => (
                    <a key={s.key} href={social[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                      className="w-10 h-10 rounded-full bg-white ring-1 ring-gray-200 text-gray-500 flex items-center justify-center hover:text-teal-600 hover:ring-teal-300 transition">
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 lg:col-start-7"><LinkColumn title={t('ftr.shop')} links={shop} /></div>
          <div className="lg:col-span-2"><LinkColumn title={t('ftr.help')} links={help} /></div>
          <div className="lg:col-span-2"><LinkColumn title={footer.column2Title || t('ftr.account')} links={footer.column2Links} /></div>
        </div>

        <div className="border-t border-gray-100 py-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 text-[12.5px] text-gray-400">
          <p>© {new Date().getFullYear()} {c.brand.name || 'Pupbox'}. {footer.copyright}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {footer.legalLinks.filter((l: L) => l.label).map((l: L, i: number) => (
              <SmartLink key={i} href={l.href} className="hover:text-teal-700 transition-colors">{l.label}</SmartLink>
            ))}
            {cookies && <CookieSettingsLink className="hover:text-teal-700 transition-colors" />}
            <span className="inline-flex items-center gap-1.5">
              <Icon name="lock" className="w-3.5 h-3.5" />{t('ftr.pay')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
