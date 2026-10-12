'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlanCard from '@/components/PlanCard';
import { Icon } from '@/components/ui/icons';
import type { StoredContent } from '@pupbox/content';
import { usePlanLabels } from '@/lib/planLabels';

function PlanSectionInner({ plans, content }: { plans: any[]; content: StoredContent | null }) {
  const params = useSearchParams();
  const [mode, setMode] = useState<'self' | 'gift'>(params.get('gift') === 'true' ? 'gift' : 'self');
  const L = usePlanLabels(content);

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

  return (
    <div>
      {/* Two options: a pill slides under the chosen one. */}
      <div className="flex justify-center mb-8">
        <div role="radiogroup" aria-label={`${L.toggleMine} / ${L.toggleGift}`}
          className="relative grid grid-cols-2 p-1 rounded-full bg-gray-100">
          <span aria-hidden="true"
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${
              gift ? 'translate-x-full bg-lilac-100' : 'translate-x-0 bg-white'}`} />
          {([['self', L.toggleMine, 'paw'], ['gift', L.toggleGift, 'gift']] as const).map(([m, label, icon]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} aria-label={label} onClick={() => choose(m)}
              className={`group/opt relative z-10 w-14 h-10 rounded-full inline-flex items-center justify-center transition-colors duration-300 ${
                mode === m ? (m === 'gift' ? 'text-lilac-600' : 'text-teal-700') : 'text-gray-500 hover:text-gray-800'}`}>
              <Icon name={icon} className="w-5 h-5" />
              <span role="tooltip" className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 hidden group-hover/opt:block group-focus-visible/opt:block whitespace-nowrap rounded-lg bg-gray-800 text-white text-[11px] font-medium px-2 py-1 z-30">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gift note: grows open and closed instead of popping in. */}
      <div className={`grid transition-all duration-300 ease-out ${gift ? 'grid-rows-[1fr] opacity-100 mb-8' : 'grid-rows-[0fr] opacity-0 mb-0'}`} aria-hidden={!gift}>
        <div className="overflow-hidden">
          <div className="max-w-2xl mx-auto bg-lilac-50 rounded-2xl px-5 py-4 flex items-start gap-3.5 text-left">
            <span className="text-2xl shrink-0" aria-hidden="true">🎁</span>
            <div>
              <p className="font-bold text-lilac-600 text-sm mb-0.5">{L.giftHeading}</p>
              <p className="text-gray-600 text-xs leading-relaxed">{L.giftBanner}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans: the new set fades in gently, one after another. On phones they
          sit side by side and swipe, with the next card peeking in. */}
      {shown.length === 0 ? (
        <p className="text-gray-400">{L.empty}</p>
      ) : (
        <div key={mode} className="flex sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch pt-5 max-w-6xl sm:mx-auto overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-4 px-4 sm:px-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {shown.map((plan: any, i: number) => (
            <div key={plan.id} className="plan-in flex snap-center shrink-0 w-[82%] sm:w-auto" style={{ animationDelay: `${i * 50}ms` }}>
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
export default function PlanSection({ plans, content }: { plans: any[]; content: StoredContent | null }) {
  return (
    <Suspense fallback={null}>
      <PlanSectionInner plans={plans} content={content} />
    </Suspense>
  );
}
