'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { gel } from '@/lib/format';
import { fill } from '@/context/strings/purchase';
import { planText, planBenefits } from '@/lib/localize';

interface Props {
  plan: any;
  showFullBenefits?: boolean;
  isGift?: boolean;
}

export default function PlanCard({ plan, showFullBenefits = false, isGift = false }: Props) {
  const { addPlan } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t, lang } = useLanguage();
  const name = planText(plan, 'name', lang);

  // Admin stores the badge label as shown there ("Most Popular", "Best Value",
  // or a custom one like "Limited"); older data used slugs. Matching only the
  // slugs meant no badge ever appeared on the site.
  const badge = String(plan.badge || '').trim();
  const isPopular = /popular/i.test(badge);
  const isBest = /best[\s_-]*value/i.test(badge);
  const featured = !!badge;

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

  // Georgian benefits written in admin win over the built-in phrase map.
  const localBenefits = planBenefits(plan, lang);
  const source: string[] = localBenefits || plan.benefits || [];
  const rawBenefits = showFullBenefits ? source : source.slice(0, 4);
  // Most plans already list "Free delivery" as a benefit; adding the
  // deliveryIncluded line as well showed it twice. The CMS label also carries
  // its own tick, which doubled the ✓.
  const freeDeliveryLabel = t('pricing.planCard.freeDelivery').replace(/^\s*✓\s*/, '');
  const benefitsMentionDelivery = source.some(b => /free delivery|უფასო მიწოდება/i.test(b));
  const benefits = rawBenefits;

  const dark = featured && !isGift;
  const label = isGift
    ? t('pricing.planCard.gift')
    : isPopular ? t('pricing.planCard.popular') : isBest ? t('pricing.planCard.bestValue') : badge;
  const check = (
    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${dark ? 'bg-teal-500/30 text-teal-200' : isGift ? 'bg-amber-100 text-amber-600' : 'bg-teal-50 text-teal-600'}`} aria-hidden="true">
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2l2.2 2.2 4.8-4.9" /></svg>
    </span>
  );

  return (
    <div
      onClick={handleChoose}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChoose(); } }}
      role="button"
      tabIndex={0}
      aria-label={`${name}, ${gel(plan.price)}`}
      aria-busy={loading}
      className={`group relative flex flex-col text-left rounded-3xl p-7 cursor-pointer transition-all duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 ${
        dark
          ? 'bg-gradient-to-b from-teal-700 to-teal-900 text-white shadow-2xl shadow-teal-900/25 lg:scale-[1.04] ring-1 ring-teal-600'
          : isGift && featured
            ? 'bg-white ring-2 ring-amber-400 shadow-xl shadow-amber-100'
            : 'bg-white ring-1 ring-gray-200 shadow-sm hover:shadow-xl hover:ring-teal-300'
      }`}
    >
      {featured && (
        <span className={`absolute -top-3.5 left-7 text-xs font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap shadow-md ${
          dark ? 'bg-amber-400 text-gray-900' : isGift ? 'bg-amber-400 text-white' : 'bg-teal-600 text-white'}`}>
          {label}
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <h3 className={`text-xl font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}>{name}</h3>
        {isGift && <span className="text-xl" aria-hidden="true">🎁</span>}
      </div>
      <p className={`text-sm mt-1.5 min-h-[2.5rem] leading-snug ${dark ? 'text-teal-100/80' : 'text-gray-500'}`}>
        {isGift ? fill(t('pricing.gift.card'), { plan: name }) : planText(plan, 'description', lang)}
      </p>

      <div className="mt-5 flex items-end gap-2">
        <span className={`text-4xl font-black tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>{gel(plan.price)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 min-h-[1.75rem]">
        {plan.monthlyEquivPrice && (
          <span className={`text-sm font-medium ${dark ? 'text-teal-100' : 'text-gray-500'}`}>≈ {gel(Number(plan.monthlyEquivPrice).toFixed(2))}{t('global.perMonth')}</span>
        )}
        {Number(plan.discountPercent) > 0 && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dark ? 'bg-amber-400 text-gray-900' : 'bg-green-100 text-green-700'}`}>
            {t('global.savePercent')} {plan.discountPercent}%
          </span>
        )}
      </div>

      <div className={`my-6 h-px ${dark ? 'bg-white/15' : 'bg-gray-100'}`} />

      <ul className="space-y-3 mb-8 flex-1">
        {benefits.map((b: string, i: number) => (
          <li key={i} className={`flex items-start gap-2.5 text-sm ${dark ? 'text-teal-50' : 'text-gray-700'}`}>
            {check}{localBenefits ? b : translateBenefit(b)}
          </li>
        ))}
        {plan.deliveryIncluded && !benefitsMentionDelivery && (
          <li className={`flex items-start gap-2.5 text-sm ${dark ? 'text-teal-50' : 'text-gray-700'}`}>{check}{freeDeliveryLabel}</li>
        )}
        {isGift && (
          <li className="flex items-start gap-2.5 text-sm text-gray-700">{check}{t('co.gift.planPerk')}</li>
        )}
      </ul>

      <div
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-colors ${
          dark
            ? 'bg-white text-teal-800 group-hover:bg-amber-300 group-hover:text-gray-900'
            : isGift
              ? 'bg-amber-400 text-white group-hover:bg-amber-500'
              : 'bg-gray-900 text-white group-hover:bg-teal-600'
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
