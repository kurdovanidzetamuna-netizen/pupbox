'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { gel } from '@/lib/format';
import { fill } from '@/context/strings/purchase';
import { planText, planBenefits } from '@/lib/localize';
import PlanDetails from '@/components/PlanDetails';
import type { PlanLabels } from '@/lib/planLabels';

interface Props {
  plan: any;
  isGift?: boolean;
  /** Words from admin → Page Builder → Pricing Page → Plans. */
  labels: PlanLabels;
}

export default function PlanCard({ plan, isGift = false, labels: L }: Props) {
  const { addPlan } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
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
  // Most plans already list "Free delivery" as a benefit; adding the
  // deliveryIncluded line as well showed it twice. The CMS label also carries
  // its own tick, which doubled the ✓.
  const freeDeliveryLabel = L.freeDelivery.replace(/^\s*✓\s*/, '');
  const benefitsMentionDelivery = source.some(b => /free delivery|უფასო მიწოდება/i.test(b));
  const benefitText = (b: string) => (localBenefits ? b : translateBenefit(b));
  // Everything the plan includes, for the "+N" pop-up.
  const allBenefits = [
    ...source.map(benefitText),
    ...(plan.deliveryIncluded && !benefitsMentionDelivery ? [freeDeliveryLabel] : []),
    ...(isGift ? [t('co.gift.planPerk')] : []),
  ];

  // Small and flat: name, price, what it saves, one link to everything it
  // includes (a pop-up) and one button. The featured card gets a mint wash.
  const tone = isGift ? 'lilac' : 'teal';
  const label = isGift
    ? L.giftBadge
    : isPopular ? L.popular : isBest ? L.bestValue : badge;
  const perMonth = Number(plan.monthlyEquivPrice) || 0;
  const save = Number(plan.discountPercent) || 0;

  return (
    <>
    {/* A tap anywhere on the card chooses it; the real controls inside are
        buttons (Choose, and "What's included" which only opens the list). */}
    <div
      onClick={handleChoose}
      aria-busy={loading}
      className={`group relative w-full flex flex-col text-left rounded-[22px] p-4 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 ${
        featured
          ? isGift ? 'bg-lilac-50 ring-2 ring-lilac-400' : 'bg-teal-50 ring-2 ring-teal-500'
          : `bg-white ring-1 ring-gray-200 ${isGift ? 'hover:ring-lilac-400/60' : 'hover:ring-teal-300'}`
      }`}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <h3 className="text-[16px] font-extrabold text-gray-900 leading-tight">{name}</h3>
        {featured && (
          <span className={`h-5 px-2 rounded-full text-[10.5px] font-bold inline-flex items-center ${isGift ? 'bg-lilac-100 text-lilac-600' : 'bg-white text-teal-800 ring-1 ring-teal-200'}`}>{label}</span>
        )}
      </div>

      <p className="mt-3 flex items-baseline gap-1">
        <span className="text-[26px] leading-none font-extrabold tracking-tight text-gray-900">{gel(plan.price)}</span>
        {perMonth > 0 && plan.durationValue > 1 && <span className="text-[12px] font-semibold text-gray-500">≈ {gel(perMonth.toFixed(2))}{t('global.perMonth')}</span>}
      </p>
      <div className="mt-2 min-h-[1.25rem] flex items-center gap-2">
        {save > 0 && <span className="h-5 px-1.5 rounded-full bg-peach-50 text-peach-600 text-[11px] font-extrabold inline-flex items-center">−{save}%</span>}
        {allBenefits.length > 0 && (
          <button type="button" onClick={e => { e.stopPropagation(); setShowAll(true); }}
            className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${tone === 'lilac' ? 'text-lilac-600' : 'text-teal-700'} hover:underline underline-offset-2`}>
            {t('plan.included')}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        )}
      </div>

      <button type="button" disabled={loading} aria-label={`${isGift ? L.giftCta : L.cta}: ${name}, ${gel(plan.price)}`}
        onClick={e => { e.stopPropagation(); handleChoose(); }}
        className={`mt-4 w-full h-11 flex items-center justify-center gap-2 rounded-full font-bold text-[13.5px] transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 ${
          featured
            ? isGift ? 'bg-lilac-400 text-white group-hover:bg-lilac-600' : 'bg-teal-600 text-white group-hover:bg-teal-700'
            : isGift ? 'bg-white text-lilac-600 ring-1 ring-lilac-400/40 group-hover:bg-lilac-50' : 'bg-white text-teal-700 ring-1 ring-teal-200 group-hover:bg-teal-50'
        }`}
      >
        {loading ? t('global.loading') : isGift ? L.giftCta : L.cta}
      </button>
    </div>

    <PlanDetails open={showAll} onClose={() => setShowAll(false)} onChoose={handleChoose} loading={loading} plan={plan} isGift={isGift}
      name={name} description={isGift ? fill(L.giftCard, { plan: name }) : planText(plan, 'description', lang)} labels={L}
      benefits={allBenefits} badge={featured ? label : undefined} />
    </>
  );
}
