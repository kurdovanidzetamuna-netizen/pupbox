'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/icons';

const WAYS = [
  { key: 'box', icon: 'box', href: '/prices#plans', tone: 'teal' },
  { key: 'custom', icon: 'sparkle', href: '/build-box', tone: 'teal', isNew: true },
  { key: 'gift', icon: 'gift', href: '/prices?gift=true', tone: 'peach' },
  { key: 'shop', icon: 'bag', href: '/shop', tone: 'teal' },
] as const;

/**
 * The four ways to buy, side by side: the monthly box, a box you build, a
 * gift box, and the shop. Each card is one big link. Flat, mint line icons
 * (peach for the gift).
 */
export default function WaysToShop({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <section className={`py-12 sm:py-14 bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Heading kind="section" align="center" title={t('ways.title')} subtitle={t('ways.sub')} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {WAYS.map((w, i) => {
            const peach = w.tone === 'peach';
            return (
              <Link key={w.key} href={w.href}
                className={`group relative flex flex-col rounded-3xl p-5 sm:p-6 transition-all hover:-translate-y-1 animate-[fadeUp_0.4s_ease-out_both] ${
                  peach ? 'bg-peach-50/70 hover:bg-peach-50' : 'bg-teal-50/60 hover:bg-teal-50'}`} style={{ animationDelay: `${i * 60}ms` }}>
                {'isNew' in w && w.isNew && <span className="absolute top-4 right-4 text-[11px] font-extrabold text-peach-600 bg-white rounded-full px-2.5 py-0.5">{t('ways.new')}</span>}
                <span className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:-rotate-6 ${peach ? 'text-peach-500' : 'text-teal-600'}`}>
                  <Icon name={w.icon} className="w-6 h-6" strokeWidth={1.7} />
                </span>
                <span className="text-[16px] font-bold text-gray-900">{t(`ways.${w.key}.t`)}</span>
                <span className="mt-1.5 text-[13px] leading-relaxed text-gray-500 flex-1">{t(`ways.${w.key}.s`)}</span>
                <span className={`mt-4 w-9 h-9 rounded-full bg-white flex items-center justify-center transition-colors ${peach ? 'text-peach-600 group-hover:bg-peach-400 group-hover:text-white' : 'text-teal-700 group-hover:bg-teal-600 group-hover:text-white'}`}>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
