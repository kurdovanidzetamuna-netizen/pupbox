'use client';
import Link from '@/components/LangLink';
import { useLanguage } from '@/context/LanguageContext';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/icons';

const WAYS = [
  { key: 'box', icon: 'box', href: '/prices#plans', tone: 'teal' },
  { key: 'custom', icon: 'sparkle', href: '/build-box', tone: 'teal', isNew: true },
  { key: 'gift', icon: 'gift', href: '/prices?gift=true', tone: 'lilac' },
  { key: 'shop', icon: 'bag', href: '/shop', tone: 'teal' },
] as const;

/**
 * The four ways to buy: the monthly box, a box you build, a gift box, and the
 * shop. Each card is one link. Full-width rows on phones; on wider screens
 * they share one centred row, so fewer ways never leave a gap.
 */
export default function WaysToShop({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <section className={`py-12 sm:py-14 bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Heading kind="section" align="center" title={t('ways.title')} />
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {WAYS.map((w, i) => {
            const gift = w.tone === 'lilac';
            return (
              <Link key={w.key} href={w.href}
                className="group relative w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0 rounded-2xl bg-white ring-1 ring-gray-100 hover:ring-teal-200 hover:shadow-soft p-4 sm:p-5 transition-all animate-[fadeUp_0.4s_ease-out_both]"
                style={{ animationDelay: `${i * 60}ms` }}>
                <span className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center sm:mb-4 transition-transform group-hover:scale-105 ${gift ? 'bg-lilac-50 text-lilac-600' : 'bg-teal-50 text-teal-600'}`}>
                  <Icon name={w.icon} className="w-6 h-6" strokeWidth={1.7} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-gray-900">{t(`ways.${w.key}.t`)}</span>
                    {'isNew' in w && w.isNew && <span className="text-[10.5px] font-bold text-lilac-600 bg-lilac-50 rounded-full px-2 py-0.5">{t('ways.new')}</span>}
                  </span>
                  <span className="block mt-1 text-[13px] leading-relaxed text-gray-500">{t(`ways.${w.key}.s`)}</span>
                </span>
                <Icon name="arrow" className="w-4 h-4 shrink-0 text-gray-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition sm:absolute sm:top-5 sm:right-5" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
