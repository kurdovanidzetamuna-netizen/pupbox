'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';

/**
 * The other way to buy, under the plans: build your own box. The whole card
 * is one link, with a clear filled button so it can't be missed.
 */
export default function BuildBoxPromo({ monthlyDiscount = 10, className = '' }: { monthlyDiscount?: number; className?: string }) {
  const { t } = useLanguage();
  return (
    <Link href="/build-box"
      className={`group mt-10 max-w-4xl mx-auto rounded-3xl bg-teal-50 ring-2 ring-teal-100 hover:ring-teal-300 p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-left transition-all hover:-translate-y-0.5 ${className}`}>
      <span className="relative w-16 h-16 shrink-0 rounded-2xl bg-white text-teal-600 flex items-center justify-center group-hover:animate-[wiggle_0.6s_ease-in-out]">
        <Icon name="box" className="w-8 h-8" strokeWidth={1.6} />
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-peach-50 text-peach-600 ring-2 ring-white flex items-center justify-center text-[14px] font-black">?</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[18px] sm:text-[19px] font-extrabold text-gray-900">{t('cb.promoTitle')}</span>
          <span className="text-[11px] font-extrabold text-peach-600 bg-white rounded-full px-2.5 py-0.5">{t('ways.new')}</span>
        </span>
        <span className="block text-[13.5px] text-gray-600 mt-1 leading-relaxed">{fill(t('cb.promoSub'), { n: monthlyDiscount })}</span>
      </span>
      <span className="shrink-0 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-teal-600 text-white text-[14.5px] font-bold group-hover:bg-teal-700 transition-colors">
        <Icon name="sparkle" className="w-[18px] h-[18px]" strokeWidth={2} />
        {t('cb.startCta')}
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </Link>
  );
}
