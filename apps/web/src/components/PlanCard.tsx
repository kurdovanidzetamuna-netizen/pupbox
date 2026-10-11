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

  // Soft & friendly: every card is light; the featured one gets a mint wash,
  // a gentle glow and the one filled button.
  const tone = isGift ? 'peach' : 'teal';
  const check = (
    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${tone === 'peach' ? 'bg-peach-100 text-peach-600' : 'bg-teal-100 text-teal-700'}`} aria-hidden="true">
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2l2.2 2.2 4.8-4.9" /></svg>
    </span>
  );
  const label = isGift
    ? t('pricing.planCard.gift')
    : isPopular ? t('pricing.planCard.popular') : isBest ? t('pricing.planCard.bestValue') : badge;

  return (
    <div
      onClick={handleChoose}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChoose(); } }}
      role="button"
      tabIndex={0}
      aria-label={`${name}, ${gel(plan.price)}`}
      aria-busy={loading}
      className={`group relative flex flex-col text-left rounded-[28px] p-7 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 ${
        featured
          ? isGift
            ? 'bg-gradient-to-b from-peach-50 to-white ring-2 ring-peach-400/60 shadow-soft'
            : 'bg-gradient-to-b from-teal-50 via-white to-white ring-2 ring-teal-300 shadow-glow'
          : 'bg-white ring-1 ring-gray-200/70 shadow-soft hover:ring-teal-200'
      }`}
    >
      {featured && (
        <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap ${
          isGift ? 'bg-peach-100 text-peach-600 ring-1 ring-peach-400/40' : isPopular ? 'bg-teal-100 text-teal-800 ring-1 ring-teal-300' : 'bg-lilac-100 text-lilac-600 ring-1 ring-lilac-400/40'}`}>
          {label}
        </span>
      )}

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-800">{name}</h3>
        {isGift && <span className="text-xl" aria-hidden="true">🎁</span>}
      </div>
      <p className="text-sm mt-1.5 min-h-[2.5rem] leading-snug text-gray-500">
        {isGift ? fill(t('pricing.gift.card'), { plan: name }) : planText(plan, 'description', lang)}
      </p>

      <p className="mt-5 text-[2.6rem] leading-none font-extrabold tracking-tight text-gray-800">{gel(plan.price)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 min-h-[1.75rem]">
        {plan.monthlyEquivPrice && (
          <span className="text-sm text-gray-500">≈ {gel(Number(plan.monthlyEquivPrice).toFixed(2))}{t('global.perMonth')}</span>
        )}
        {Number(plan.discountPercent) > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">
            {t('global.savePercent')} {plan.discountPercent}%
          </span>
        )}
      </div>

      <div className="my-6 h-px bg-gray-100" />

      <ul className="space-y-3 mb-8 flex-1">
        {benefits.map((b: string, i: number) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">{check}{localBenefits ? b : translateBenefit(b)}</li>
        ))}
        {plan.deliveryIncluded && !benefitsMentionDelivery && (
          <li className="flex items-start gap-2.5 text-sm text-gray-600">{check}{freeDeliveryLabel}</li>
        )}
        {isGift && (
          <li className="flex items-start gap-2.5 text-sm text-gray-600">{check}{t('co.gift.planPerk')}</li>
        )}
      </ul>

      <div
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm transition-all duration-200 ${
          featured
            ? isGift
              ? 'bg-peach-400 text-white shadow-[0_10px_24px_-10px_rgba(233,120,74,0.6)] group-hover:bg-peach-600'
              : 'bg-gradient-to-r from-teal-400 to-teal-600 text-white shadow-glow'
            : isGift
              ? 'bg-peach-50 text-peach-600 group-hover:bg-peach-100'
              : 'bg-teal-50 text-teal-700 group-hover:bg-teal-100'
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
