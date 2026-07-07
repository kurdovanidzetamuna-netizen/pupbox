'use client';
import { useLanguage } from '@/context/LanguageContext';

export function PricesHeader() {
  const { t } = useLanguage();
  return (
    <>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
        {t('pricing.hero.heading')}
      </h1>
      <p className="text-lg text-gray-500 mb-14">
        {t('pricing.hero.sub')}
      </p>
    </>
  );
}

export function PricesIncludes() {
  const { t } = useLanguage();
  const items = [
    { icon: '📦', textKey: 'pricing.includes.i1' },
    { icon: '🚚', textKey: 'pricing.includes.i2' },
    { icon: '🐾', textKey: 'pricing.includes.i3' },
    { icon: '💬', textKey: 'pricing.includes.i4' },
    { icon: '🔄', textKey: 'pricing.includes.i5' },
    { icon: '🎁', textKey: 'pricing.includes.i6' },
  ];
  return (
    <section className="py-16 bg-teal-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          {t('pricing.includes.heading')}
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-teal-100">
              <span className="text-xl">{item.icon}</span>
              <span>{t(item.textKey)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
