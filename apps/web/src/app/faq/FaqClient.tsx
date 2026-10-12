'use client';
import { useState } from 'react';
import { DEFAULT_FAQ, type FaqItem } from '@pupbox/content';
import { useLanguage } from '@/context/LanguageContext';
import { Icon } from '@/components/ui/icons';
import Button from '@/components/ui/Button';

/** All questions, whatever page they're ticked for, in order, one open at a time. */
export default function FaqClient({ faq }: { faq: FaqItem[] | null }) {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(0);
  const items = [...(faq ?? DEFAULT_FAQ)]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((i) => ({ q: (lang === 'ka' && i.questionKa?.trim()) || i.question, a: (lang === 'ka' && i.answerKa?.trim()) || i.answer }))
    .filter((i) => i.q?.trim());

  return (
    <main className="min-h-screen bg-white">
      <section className="px-4 pt-10 sm:pt-14 pb-6 text-center">
        <span className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
          <Icon name="chat" className="w-6 h-6" />
        </span>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-gray-900">{t('faq.title')}</h1>
        <p className="text-[14px] sm:text-[15px] text-gray-500 mt-2 max-w-md mx-auto">{t('faq.sub')}</p>
      </section>

      <section className="max-w-2xl mx-auto px-4 pb-14">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-10">{t('faq.empty')}</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item, i) => {
              const on = open === i;
              return (
                <li key={i} className={`rounded-2xl ring-1 transition-colors ${on ? 'bg-white ring-teal-200 shadow-soft' : 'bg-white ring-gray-200/70 hover:ring-teal-200'}`}>
                  <button type="button" onClick={() => setOpen(on ? -1 : i)} aria-expanded={on}
                    className="w-full flex items-center gap-3 text-left px-4 sm:px-5 py-4 min-h-[56px]">
                    <span className="flex-1 text-[14.5px] sm:text-[15px] font-semibold text-gray-900">{item.q}</span>
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${on ? 'bg-teal-50 text-teal-700 rotate-45' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon name="plus" className="w-4 h-4" strokeWidth={2.4} />
                    </span>
                  </button>
                  {on && <p className="px-4 sm:px-5 pb-5 -mt-1 text-[14px] text-gray-600 leading-relaxed animate-[fadeIn_0.2s_ease-out]">{item.a}</p>}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-10 rounded-2xl bg-gray-50 ring-1 ring-gray-100 text-center px-6 py-7">
          <p className="text-[15px] font-semibold text-gray-800">{t('faq.more')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button href="/how-it-works" icon="info" label={t('nav.howItWorks')} tone="soft" />
            <Button href="/prices" icon="box" label={t('nav.plans')} />
          </div>
        </div>
      </section>
    </main>
  );
}
