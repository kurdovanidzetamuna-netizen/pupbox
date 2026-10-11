'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlanCard from '@/components/PlanCard';
import { useLanguage } from '@/context/LanguageContext';

function PlanSectionInner({ plans }: { plans: any[] }) {
  const params = useSearchParams();
  const [mode, setMode] = useState<'self' | 'gift'>(params.get('gift') === 'true' ? 'gift' : 'self');
  const { t } = useLanguage();

  useEffect(() => {
    if (params.get('gift') === 'true') setMode('gift');
  }, [params]);

  // A plan switched off for gifting in admin is refused at checkout, so don't offer it.
  const shown = mode === 'gift' ? plans.filter((p: any) => p.giftable !== false) : plans;

  return (
    <div>
      {/* Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
          <button
            onClick={() => setMode('self')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
              mode === 'self'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('pricing.toggle.myDog')}
          </button>
          <button
            onClick={() => setMode('gift')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
              mode === 'gift'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('pricing.toggle.gift')}
          </button>
        </div>
      </div>

      {/* Gift banner */}
      {mode === 'gift' && (
        <div className="max-w-2xl mx-auto mb-10 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-start gap-4">
          <span className="text-2xl shrink-0">🎁</span>
          <div>
            <p className="font-bold text-amber-800 text-sm mb-0.5">Gifting a Pupbox subscription</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              {t('pricing.gift.banner')}
            </p>
          </div>
        </div>
      )}

      {/* Plans grid */}
      {shown.length === 0 ? (
        <p className="text-gray-400">{t('pricing.none')}</p>
      ) : (
        <div
          key={mode}
          className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-7 items-stretch pt-4"
          style={{ animation: 'fadeSlideIn 0.3s ease both' }}
        >
          {shown.map((plan: any) => (
            <PlanCard key={plan.id} plan={plan} showFullBenefits isGift={mode === 'gift'} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/**
 * Reads the ?gift=true query param, so Next 14 needs a Suspense boundary to
 * prerender it. This component is rendered by both / and /prices — without the
 * wrapper the production build fails on both pages.
 */
export default function PlanSection({ plans }: { plans: any[] }) {
  return (
    <Suspense fallback={null}>
      <PlanSectionInner plans={plans} />
    </Suspense>
  );
}
