'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { planBenefits } from '@/lib/localize';
import { useState } from 'react';

export default function SubscribePlanCard({ plan }: { plan: any }) {
  const { addPlan } = useCart();
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSelect() {
    setLoading(true);
    try {
      await addPlan(plan.id);
      router.push('/checkout');
    } catch {
      setLoading(false);
    }
  }

  const isPopular = plan.badge === 'popular';
  const isBest = plan.badge === 'best_value';

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-6 text-left transition ${isPopular ? 'border-teal-500 shadow-lg' : isBest ? 'border-amber-400 shadow-md' : 'border-gray-100'}`}>
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">{t('pricing.planCard.popular')}</span>
      )}
      {isBest && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">{t('pricing.planCard.bestValue')}</span>
      )}

      <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
      <div className="mb-3">
        <span className="text-3xl font-extrabold text-teal-600">₾{Number(plan.price).toFixed(0)}</span>
        <span className="text-gray-400 text-sm"> / {plan.durationValue} {plan.durationUnit.toLowerCase()}{plan.durationValue > 1 ? 's' : ''}</span>
      </div>
      {plan.monthlyEquivPrice && (
        <p className="text-xs text-yellow-500 font-medium mb-3">₾{Number(plan.monthlyEquivPrice).toFixed(0)}/mo equivalent</p>
      )}
      {plan.discountPercent && (
        <p className="text-xs text-teal-700 font-medium mb-3">Save {Number(plan.discountPercent).toFixed(0)}% vs monthly</p>
      )}
      <ul className="space-y-1.5 mb-6 flex-1">
        {(planBenefits(plan, lang) || plan.benefits || []).map((b: string, i: number) => (
          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
            <span className="text-teal-500 mt-0.5">✓</span>{b}
          </li>
        ))}
        <li className="text-sm text-gray-600 flex items-start gap-2"><span className="text-teal-500 mt-0.5">✓</span>{t('global.freeDelivery')}</li>
        <li className="text-sm text-gray-600 flex items-start gap-2"><span className="text-teal-500 mt-0.5">✓</span>{t('global.cancelAnytime')}</li>
      </ul>
      <button
        onClick={handleSelect}
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-sm transition disabled:opacity-50 bg-teal-600 text-white hover:bg-teal-700"
      >
        {loading ? 'Adding...' : 'Select Plan'}
      </button>
    </div>
  );
}
