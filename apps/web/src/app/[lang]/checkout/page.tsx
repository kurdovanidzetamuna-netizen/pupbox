'use client';
import { gel } from '@/lib/format';
import EmptyState from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/icons';

import { useCheckout } from './_parts/useCheckout';
import { AccountStep } from './_parts/AccountStep';
import { GiftStep } from './_parts/GiftStep';
import { DogStep } from './_parts/DogStep';
import { DeliveryStep } from './_parts/DeliveryStep';

export default function CheckoutPage() {
  const co = useCheckout();
  const { t, cart, ready, step, orderPlaced, steps, stepIndex, stepLabel, total, summary, goBack } = co;

  if (ready && !orderPlaced && !((cart?.itemCount ?? 0) > 0)) {
    return (
      <main className="min-h-[70vh] bg-white flex items-center justify-center px-4">
        <EmptyState art="box" title={t('co.empty.title')} text={t('co.empty.sub')}
          action={{ href: '/prices', label: t('co.empty.plans'), icon: 'box' }} second={{ href: '/shop', label: t('co.empty.shop'), icon: 'bag' }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-pastel-grey">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-14">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={goBack} aria-label={t('co.goBack')} title={t('co.goBack')}
            className="w-10 h-10 shrink-0 rounded-[14px] bg-white ring-1 ring-gray-200/80 text-gray-700 hover:bg-gray-50 flex items-center justify-center">
            <Icon name="arrow" className="w-[18px] h-[18px] rotate-180" strokeWidth={2.2} />
          </button>
          {/* Steps: a bar per step that fills as you go, the current name beside it */}
          {steps.length > 1 && (
            <ol className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label={t('aria.checkoutSteps')}>
              {steps.map((s, i) => (
                <li key={s} aria-current={i === stepIndex ? 'step' : undefined} className="min-w-0">
                  <span className={`block h-1.5 rounded-full transition-colors ${i <= stepIndex ? 'bg-teal-600' : 'bg-gray-200'}`} />
                  <span className={`mt-1.5 flex items-center gap-1 text-[11.5px] sm:text-[12.5px] truncate ${i === stepIndex ? 'text-gray-900 font-bold' : i < stepIndex ? 'text-teal-700 font-semibold' : 'text-gray-400'}`}>
                    {i < stepIndex && <Icon name="check" className="w-3 h-3 shrink-0" strokeWidth={3} />}{stepLabel[s]}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Phones: the order folds into a bar with the total, above the form */}
        <details className="md:hidden mb-4 bg-white rounded-[20px] ring-1 ring-gray-100 group">
          <summary className="list-none flex items-center justify-between gap-3 px-4 h-12 cursor-pointer">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-800"><Icon name="bag" className="w-4 h-4 text-teal-600" />{t('co.sum.show')}<Icon name="arrow" className="w-3.5 h-3.5 rotate-90 group-open:-rotate-90 transition-transform text-gray-400" /></span>
            <span className="text-[15px] font-extrabold text-gray-900">{gel(total.toFixed(2))}</span>
          </summary>
          <div className="px-4 pb-4">{summary}</div>
        </details>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-start">
          <div className="md:col-span-2">
            {step === 'account' && <AccountStep co={co} />}
            {step === 'gift' && <GiftStep co={co} />}
            {step === 'dog' && <DogStep co={co} />}
            {step === 'delivery' && <DeliveryStep co={co} />}
          </div>

          {/* ── Summary (computers; phones see it folded at the top) ── */}
          <aside className="hidden md:block bg-white rounded-[24px] ring-1 ring-gray-100 p-5 md:sticky md:top-24" aria-label={t('co.sum.title')}>
            <h2 className="text-[15px] font-extrabold text-gray-900 mb-4">{t('co.sum.title')}</h2>
            {summary}
          </aside>
        </div>
      </div>
    </main>
  );
}
