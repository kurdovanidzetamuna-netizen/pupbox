'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlanCard from '@/components/PlanCard';
import TierPicker from '@/components/TierPicker';
import { Icon } from '@/components/ui/icons';
import type { StoredContent } from '@pupbox/content';
import { usePlanLabels } from '@/lib/planLabels';
import { useLanguage } from '@/context/LanguageContext';

function PlanSectionInner({ plans, tiers, content }: { plans: any[]; tiers?: any[]; content: StoredContent | null }) {
  const params = useSearchParams();
  const [mode, setMode] = useState<'self' | 'gift'>(params.get('gift') === 'true' ? 'gift' : 'self');
  const L = usePlanLabels(content);
  const { t } = useLanguage();

  useEffect(() => {
    if (params.get('gift') === 'true') setMode('gift');
  }, [params]);

  // A plan switched off for gifting in admin is refused at checkout, so don't offer it.
  const shown = mode === 'gift' ? plans.filter((p: any) => p.giftable !== false) : plans;

  function choose(next: 'self' | 'gift') {
    if (next === mode) return;
    setMode(next);
    // Keep the link shareable (and Back-friendly) without a page reload.
    const url = new URL(window.location.href);
    if (next === 'gift') url.searchParams.set('gift', 'true'); else url.searchParams.delete('gift');
    window.history.replaceState(null, '', url);
  }

  const gift = mode === 'gift';
  // Box types in use: the site sells Mini / Standard / Premium, not a list of plans.
  const boxes = (tiers ?? []).filter((tr: any) => tr.plans?.length);
  // Plans admin made without a box type still sell, listed under the boxes.
  const others = shown.filter((p: any) => !p.tierId);

  return (
    <div>
      {/* Two options: a pill slides under the chosen one. */}
      <div className="flex justify-center mb-6">
        <div role="radiogroup" aria-label={`${L.toggleMine} / ${L.toggleGift}`}
          className="relative grid grid-cols-2 p-1 rounded-full bg-gray-200/80 ring-1 ring-inset ring-gray-300/60">
          <span aria-hidden="true"
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${
              gift ? 'translate-x-full bg-lilac-100' : 'translate-x-0 bg-white'} shadow-[0_1px_4px_rgba(36,48,58,0.15)]`} />
          {([['self', L.toggleMine, 'paw'], ['gift', L.toggleGift, 'gift']] as const).map(([m, label, icon]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => choose(m)}
              className={`relative z-10 h-10 px-3 sm:px-5 gap-2 rounded-full inline-flex items-center justify-center text-[13px] sm:text-[13.5px] font-bold whitespace-nowrap transition-colors duration-300 ${
                mode === m ? (m === 'gift' ? 'text-lilac-600' : 'text-teal-700') : 'text-gray-600 hover:text-gray-900'}`}>
              <Icon name={icon} className="hidden min-[400px]:block w-[18px] h-[18px] shrink-0" />
              {label.replace(/^[^\p{L}]+/u, '')}
            </button>
          ))}
        </div>
      </div>

      {/* Gift note: grows open and closed instead of popping in. */}
      <div className={`grid transition-all duration-300 ease-out ${gift ? 'grid-rows-[1fr] opacity-100 mb-6' : 'grid-rows-[0fr] opacity-0 mb-0'}`} aria-hidden={!gift}>
        <div className="overflow-hidden">
          <p className="w-fit max-w-xl mx-auto rounded-full bg-lilac-50 px-3.5 py-1.5 flex items-center gap-2 text-[12px] leading-snug text-left">
            <Icon name="gift" className="w-4 h-4 shrink-0 text-lilac-600" />
            <span><span className="font-bold text-lilac-600">{L.giftHeading}.</span> <span className="text-gray-600">{L.giftBanner}</span></span>
          </p>
        </div>
      </div>

      {/* Plans: the new set fades in gently, one after another. On phones they
          sit side by side and swipe, with the next card peeking in. */}
      {boxes.length > 0 && <TierPicker key={`tiers-${mode}`} tiers={boxes} gift={gift} />}
      {boxes.length > 0 && others.length > 0 && (
        <h3 className="mt-12 mb-1 text-[17px] sm:text-[19px] font-extrabold text-gray-900">{t('tier.morePlans')}</h3>
      )}
      {boxes.length > 0 && others.length === 0 ? null : (boxes.length ? others : shown).length === 0 ? (
        <p className="text-gray-400">{L.empty}</p>
      ) : (
        <div key={mode} className="flex sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 items-stretch pt-5 max-w-5xl lg:max-w-6xl sm:mx-auto overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-4 px-4 sm:px-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(boxes.length ? others : shown).map((plan: any, i: number) => (
            <div key={plan.id} className="plan-in flex snap-center shrink-0 w-[76%] sm:w-auto" style={{ animationDelay: `${i * 50}ms` }}>
              <PlanCard plan={plan} isGift={gift} labels={L} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes planIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to   { opacity: 1; transform: none; }
        }
        .plan-in { opacity: 0; animation: planIn 0.4s cubic-bezier(.2,.8,.2,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .plan-in { animation: none; opacity: 1; } }
      `}</style>
    </div>
  );
}

/**
 * Reads the ?gift=true query param, so Next 14 needs a Suspense boundary to
 * prerender it. This component is rendered by both / and /prices — without the
 * wrapper the production build fails on both pages.
 */
export default function PlanSection({ plans, tiers, content }: { plans: any[]; tiers?: any[]; content: StoredContent | null }) {
  return (
    <Suspense fallback={null}>
      <PlanSectionInner plans={plans} tiers={tiers} content={content} />
    </Suspense>
  );
}
