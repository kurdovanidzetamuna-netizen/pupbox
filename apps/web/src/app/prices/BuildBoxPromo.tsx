'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';

/** Under the plans: the other way to buy — choose every item yourself. */
export default function BuildBoxPromo({ monthlyDiscount }: { monthlyDiscount: number }) {
  const { t } = useLanguage();
  return (
    <div className="mt-10 max-w-4xl mx-auto rounded-3xl bg-teal-50/70 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-left">
      <span className="w-14 h-14 shrink-0 rounded-2xl bg-white text-teal-600 flex items-center justify-center"><Icon name="box" className="w-7 h-7" strokeWidth={1.7} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[17px] font-bold text-gray-900">{t('cb.promoTitle')}</p>
        <p className="text-[13.5px] text-gray-500 mt-1 leading-relaxed">{fill(t('cb.promoSub'), { n: monthlyDiscount })}</p>
      </div>
      <Link href="/build-box" className="group shrink-0 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-teal-700 text-[14px] font-bold hover:bg-teal-600 hover:text-white transition-colors">
        {t('cb.promoCta')}
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </Link>
    </div>
  );
}
