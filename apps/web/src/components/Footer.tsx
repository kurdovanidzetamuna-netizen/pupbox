'use client';
import { useState } from 'react';
import { sitePage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { useLanguage } from '@/context/LanguageContext';
import Logo from '@/components/Logo';
import SmartLink from '@/components/SmartLink';
import { Icon } from '@/components/ui/icons';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 px-6 py-8 sm:px-10 sm:py-10 text-white">
      <span aria-hidden="true" className="absolute -right-6 -top-8 text-[120px] opacity-10 rotate-12 select-none">🐾</span>
      <span aria-hidden="true" className="absolute left-1/3 -bottom-20 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
      <div className="relative grid lg:grid-cols-2 gap-5 lg:gap-10 items-center text-center lg:text-left">
        <div>
          <p className="text-[20px] sm:text-[24px] font-extrabold tracking-tight">{t('ftr.newsTitle')}</p>
          <p className="text-[13.5px] sm:text-[14px] text-white/85 mt-1.5 max-w-sm mx-auto lg:mx-0">{t('ftr.newsSub')}</p>
        </div>
        {state === 'done' ? (
          <p role="status" className="inline-flex items-center justify-center lg:justify-start gap-2 text-[15px] font-bold animate-[pop_0.35s_ease-out]">
            <span className="w-9 h-9 rounded-full bg-white text-teal-600 flex items-center justify-center"><Icon name="check" className="w-5 h-5" strokeWidth={2.4} /></span>
            {t('ftr.newsDone')}
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="w-full max-w-lg mx-auto lg:max-w-none">
            <div className="flex flex-col sm:flex-row gap-2 p-1.5 sm:rounded-full rounded-3xl bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
              <label htmlFor="news-email" className="sr-only">{t('ftr.newsPlaceholder')}</label>
              <input id="news-email" type="email" inputMode="email" autoComplete="email" value={email}
                onChange={(e) => { setEmail(e.target.value); if (state !== 'busy') setState('idle'); }}
                placeholder={t('ftr.newsPlaceholder')} aria-invalid={state === 'bad'}
                className="flex-1 min-w-0 h-12 px-5 rounded-full bg-white text-gray-900 text-[14.5px] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-peach-300" />
              <button type="submit" disabled={state === 'busy'}
                className="h-12 px-6 rounded-full bg-peach-500 hover:bg-peach-600 text-white text-[14.5px] font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                {t('ftr.newsBtn')}
                <Icon name="arrow" className="w-4 h-4" strokeWidth={2.4} />
              </button>
            </div>
            {(state === 'bad' || state === 'fail') && (
              <p role="alert" className="mt-2 text-[12.5px] font-semibold text-peach-100">{t(state === 'bad' ? 'ftr.newsBad' : 'ftr.newsFail')}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * On every page: newsletter, then the brand with socials and contact, then
 * Shop · Help · Account links, then copyright, legal links and payment marks.
 * The tagline, links, contact and socials are edited in admin → Page Builder
 * → Header & Footer.
 */
export default function Footer({ site }: { site: StoredContent | null }) {
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-x-6 gap-y-9 py-10 sm:py-12">
          <div className="col-span-2 md:col-span-3 lg:col-span-5 text-center lg:text-left">
            <Logo brand={c.brand} className="justify-center lg:justify-start" />
            {footer.tagline && <p className="text-[13.5px] text-gray-500 leading-relaxed mt-3 max-w-xs mx-auto lg:mx-0">{footer.tagline}</p>}
            {showContact && (
              <ul className="mt-4 space-y-2 text-[13.5px] text-gray-500 inline-block text-left">
                {contact.email && <li><a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-teal-700"><Icon name="mail" className="w-4 h-4 text-teal-600" />{contact.email}</a></li>}
                {contact.phone && <li><a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-teal-700"><Icon name="phone" className="w-4 h-4 text-teal-600" />{contact.phone}</a></li>}
                {contact.address && <li className="flex items-center gap-2"><Icon name="pin" className="w-4 h-4 text-teal-600" />{contact.address}</li>}
                {contact.hours && <li className="flex items-center gap-2"><Icon name="calendar" className="w-4 h-4 text-teal-600" />{contact.hours}</li>}
              </ul>
            )}
            {socials.length > 0 && (
              <div className="mt-5">
                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">{t('ftr.follow')}</p>
                <div className="flex gap-2.5 justify-center lg:justify-start">
                  {socials.map((s) => (
                    <a key={s.key} href={social[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                      className="w-11 h-11 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-600 hover:text-white hover:-translate-y-0.5 transition-all">
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 lg:col-start-7"><LinkColumn title={t('ftr.shop')} links={shop} /></div>
          <div className="lg:col-span-2"><LinkColumn title={t('ftr.help')} links={help} /></div>
          <div className="col-span-2 md:col-span-1 lg:col-span-2 max-md:text-center"><LinkColumn title={footer.column2Title || t('ftr.account')} links={footer.column2Links} /></div>
        </div>

        <div className="border-t border-gray-100 py-6 flex flex-col lg:flex-row items-center justify-between gap-4 text-[12.5px] text-gray-400">
          <p className="text-center">© {new Date().getFullYear()} {c.brand.name || 'Pupbox'}. {footer.copyright}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {footer.legalLinks.filter((l: L) => l.label).map((l: L, i: number) => (
              <SmartLink key={i} href={l.href} className="hover:text-teal-700 transition-colors">{l.label}</SmartLink>
            ))}
            <span className="inline-flex items-center gap-1.5" title={t('ftr.pay')}>
              <Icon name="lock" className="w-3.5 h-3.5" />
              <span className="px-1.5 py-0.5 rounded-md ring-1 ring-gray-200 text-[10.5px] font-extrabold italic text-[#1a1f71]">VISA</span>
              <span className="px-1.5 py-0.5 rounded-md ring-1 ring-gray-200 inline-flex" aria-label="Mastercard">
                <span className="w-3 h-3 rounded-full bg-[#eb001b]" /><span className="w-3 h-3 -ml-1 rounded-full bg-[#f79e1b]/90" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
