'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  plan: any;
  showFullBenefits?: boolean;
  isGift?: boolean;
}

export default function PlanCard({ plan, showFullBenefits = false, isGift = false }: Props) {
  const { addPlan } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const isPopular = plan.badge === 'popular';
  const isBest = plan.badge === 'best_value';
  const featured = isPopular || isBest;

  async function handleChoose() {
    setLoading(true);
    try {
      await addPlan(plan.id);
      router.push(isGift ? `/checkout?gift=true&plan=${plan.slug}` : '/checkout');
    } catch {
      setLoading(false);
    }
  }

  const BENEFIT_KA: Record<string, string> = {
    'Free delivery': t('global.freeDelivery'),
    'Cancel anytime': t('global.cancelAnytime'),
    'Priority packing': 'პრიორიტეტული შეფუთვა',
    'Exclusive items': 'ექსკლუზიური ნივთები',
    'Free bonus gift': 'უფასო ბონუს საჩუქარი',
    '10% savings': '10% დაზოგვა',
    '15% savings': '15% დაზოგვა',
    '20% savings': '20% დაზოგვა',
  };

  function translateBenefit(b: string) {
    if (BENEFIT_KA[b]) return BENEFIT_KA[b];
    const boxMatch = b.match(/^(\d+)\s+curated\s+box/i);
    if (boxMatch) return `${boxMatch[1]} კურირებული კოლოფი`;
    const prodMatch = b.match(/^([\d–-]+)\s+products\s+per\s+box/i);
    if (prodMatch) return `${prodMatch[1]} პროდუქტი კოლოფში`;
    return b;
  }

  const rawBenefits = showFullBenefits ? (plan.benefits || []) : (plan.benefits || []).slice(0, 4);
  const benefits = rawBenefits;

  return (
    <div
      onClick={handleChoose}
      className={`relative flex flex-col rounded-2xl p-6 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        isGift
          ? featured
            ? 'border-2 border-amber-400 bg-white shadow-xl'
            : 'border border-gray-100 bg-white shadow-sm hover:border-amber-200'
          : featured
            ? 'border-2 border-teal-500 bg-white shadow-xl'
            : 'border border-gray-100 bg-white shadow-sm hover:border-teal-200'
      }`}
    >
      {(isPopular || isBest) && (
        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap ${
          isGift
            ? 'bg-amber-400 text-white'
            : isPopular ? 'bg-teal-600 text-white' : 'bg-amber-400 text-white'
        }`}>
          {isGift
            ? t('pricing.planCard.gift')
            : isPopular
              ? t('pricing.planCard.popular')
              : t('pricing.planCard.bestValue')}
        </span>
      )}

      {isGift && (
        <div className="absolute top-3 right-3 text-lg opacity-30 select-none">🎁</div>
      )}

      <h3 className="text-lg font-bold text-teal-800 mb-1">{plan.name}</h3>
      <p className="text-xs text-gray-400 mb-4">
        {isGift ? `Gift a ${plan.name} subscription` : plan.description}
      </p>

      <div className="mb-1">
        <span className="text-3xl font-extrabold text-teal-600">₾{Number(plan.price).toFixed(0)}</span>
        <span className="text-sm text-gray-400 ml-1">total</span>
      </div>
      {plan.monthlyEquivPrice && (
        <p className="text-xs text-gray-400 mb-1">≈ ₾{Number(plan.monthlyEquivPrice).toFixed(0)}{t('global.perMonth')}</p>
      )}
      {plan.discountPercent && (
        <p className="text-xs text-yellow-500 font-semibold mb-4">
          {t('global.savePercent')} {plan.discountPercent}% {t('global.vsMonthly')}
        </p>
      )}

      <ul className="space-y-2 mb-6 flex-1">
        {benefits.map((b: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className={`shrink-0 mt-0.5 ${isGift ? 'text-amber-400' : 'text-teal-500'}`}>✓</span>{translateBenefit(b)}
          </li>
        ))}
        {plan.deliveryIncluded && (
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <span className={`shrink-0 mt-0.5 ${isGift ? 'text-amber-400' : 'text-teal-500'}`}>✓</span>
            {t('pricing.planCard.freeDelivery')}
          </li>
        )}
        {isGift && (
          <li className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-amber-400 shrink-0 mt-0.5">✓</span>
            Gift card &amp; personalised message
          </li>
        )}
      </ul>

      <div
        className={`w-full flex items-center justify-center py-3 rounded-xl font-bold text-sm transition ${
          isGift
            ? featured
              ? 'bg-amber-400 text-white'
              : 'border-2 border-amber-300 text-amber-700'
            : featured
              ? 'bg-teal-600 text-white'
              : 'border-2 border-gray-200 text-gray-700'
        }`}
      >
        {loading
          ? t('global.loading')
          : isGift
            ? t('pricing.planCard.giftCta')
            : t('pricing.planCard.cta')}
      </div>
    </div>
  );
}
