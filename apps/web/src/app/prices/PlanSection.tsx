'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlanCard from '@/components/PlanCard';
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
          {([['self', L.toggleMine], ['gift', L.toggleGift]] as const).map(([m, label]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => choose(m)}
              className={`relative z-10 px-5 sm:px-7 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors duration-300 ${
                mode === m ? (m === 'gift' ? 'text-lilac-600' : 'text-teal-700') : 'text-gray-500 hover:text-gray-800'}`}>
              {label}
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

      {/* Plans: the new set fades in gently, one after another. */}
      {shown.length === 0 ? (
        <p className="text-gray-400">{L.empty}</p>
      ) : (
        <div key={mode} className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch pt-5 max-w-6xl mx-auto">
          {shown.map((plan: any, i: number) => (
            <div key={plan.id} className="plan-in flex" style={{ animationDelay: `${i * 50}ms` }}>
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
