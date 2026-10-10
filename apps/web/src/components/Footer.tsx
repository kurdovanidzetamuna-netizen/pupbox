'use client';
import { sitePage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import Logo from '@/components/Logo';
import SmartLink from '@/components/SmartLink';

const SOCIAL: { key: 'instagram' | 'facebook' | 'tiktok'; label: string; path: string }[] = [
  { key: 'instagram', label: 'Instagram', path: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.9a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 8.1a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.1-9.4a1.1 1.1 0 100 2.3 1.1 1.1 0 000-2.3z' },
  { key: 'facebook', label: 'Facebook', path: 'M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0022 12z' },
  { key: 'tiktok', label: 'TikTok', path: 'M16.6 5.8A4.3 4.3 0 0113.4 2h-3.1v13.4a2.6 2.6 0 11-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 104.9 5.7V8.6a7.3 7.3 0 004.3 1.4V6.9a4.3 4.3 0 01-1.1-1.1z' },
];

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  const shown = links.filter((l) => l.label);
  if (!title && !shown.length) return null;
  return (
    <div>
      {title && <p className="text-ink font-extrabold text-sm mb-4">{title}</p>}
      <ul className="space-y-2 text-sm">
        {shown.map((l, i) => (
          <li key={i}><SmartLink href={l.href} className="text-ink/70 hover:text-teal-600 transition-colors">{l.label}</SmartLink></li>
        ))}
      </ul>
    </div>
  );
}

/** On every page. Everything in it is edited in admin → Page Builder → Header & Footer. */
export default function Footer({ site }: { site: StoredContent | null }) {
  const c = usePage(sitePage, site);
  const { footer, contact, social } = c;
  const showContact = c.on('contact') && (contact.email || contact.phone || contact.address || contact.hours);
  const socials = c.on('social') ? SOCIAL.filter((s) => social[s.key]) : [];

  return (
    <footer className="bg-sun-100 border-t-[3px] border-ink py-12 px-6">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <Logo brand={c.brand} className="mb-3" />
            {footer.tagline && <p className="text-sm text-ink/70 leading-relaxed max-w-xs">{footer.tagline}</p>}
            {showContact && (
              <ul className="mt-5 space-y-1.5 text-sm text-ink/70">
                {contact.email && <li><a href={`mailto:${contact.email}`} className="hover:text-teal-600">✉️ {contact.email}</a></li>}
                {contact.phone && <li><a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="hover:text-teal-600">📞 {contact.phone}</a></li>}
                {contact.address && <li>📍 {contact.address}</li>}
                {contact.hours && <li>🕘 {contact.hours}</li>}
              </ul>
            )}
            {socials.length > 0 && (
              <div className="flex gap-3 mt-5">
                {socials.map((s) => (
                  <a key={s.key} href={social[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="w-10 h-10 rounded-full bg-white border-2 border-ink flex items-center justify-center text-ink hover:bg-sun-400 transition">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
                  </a>
                ))}
              </div>
            )}
          </div>
          <LinkColumn title={footer.column1Title} links={footer.column1Links} />
          <LinkColumn title={footer.column2Title} links={footer.column2Links} />
        </div>
        <div className="border-t-2 border-ink/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink/60">
          <p>© {new Date().getFullYear()} {c.brand.name || 'Pupbox'}. {footer.copyright}</p>
          <div className="flex gap-6">
            {footer.legalLinks.filter((l: any) => l.label).map((l: any, i: number) => (
              <SmartLink key={i} href={l.href} className="hover:text-teal-600 transition-colors">{l.label}</SmartLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
