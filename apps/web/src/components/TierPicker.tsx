'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { gel } from '@/lib/format';
import { Icon } from '@/components/ui/icons';

/** A tier's own words in the visitor's language, else the English ones. */
function tierText(tier: any, field: 'name' | 'tagline' | 'description', lang: string): string {
  const ka = lang === 'ka' ? tier?.translations?.ka?.[field] : '';
  return (typeof ka === 'string' && ka.trim()) || tier?.[field] || '';
}
function tierHighlights(tier: any, lang: string): string[] {
  const ka = lang === 'ka' ? tier?.translations?.ka?.highlights : null;
  return Array.isArray(ka) && ka.some((h: string) => h?.trim()) ? ka.filter((h: string) => h?.trim()) : tier?.highlights ?? [];
}
const money = (n: number) => gel(n % 1 ? n.toFixed(2) : String(n));

/**
 * Choose a box: Mini, Standard or Premium side by side (stacked on phones),
 * and one switch for how long — 1, 3 or 6 months, longer saving more. Each
 * card leads with the monthly price, then what it comes to, how many items
 * are in every box and what makes it different; one tap adds that plan and
 * goes on to checkout. Gift mode shows only what can be gifted.
 */
export default function TierPicker({ tiers, gift = false }: { tiers: any[]; gift?: boolean }) {
  const { t, lang } = useLanguage();
  const { addPlan } = useCart();
  const router = useRouter();
  const usable = (p: any) => !gift || p.giftable !== false;
  const lengths = [...new Set(tiers.flatMap((tr) => tr.plans.filter(usable).map((p: any) => p.durationValue as number)))].sort((a, b) => a - b);
  const [months, setMonths] = useState<number>(lengths[0] ?? 1);
  const [busy, setBusy] = useState('');
  const length = lengths.includes(months) ? months : lengths[0];

  // The most any box saves at each length, for the switch.
  const bestSaving = (m: number) => Math.max(0, ...tiers.map((tr) => Number(tr.plans.find((p: any) => p.durationValue === m)?.discountPercent) || 0));

  async function choose(plan: any) {
    setBusy(plan.id);
    try {
      await addPlan(plan.id);
      router.push(gift ? `/checkout?gift=true&plan=${plan.slug}` : '/checkout');
    } catch { setBusy(''); }
  }

  if (!lengths.length) return null;
  const tone = gift ? 'lilac' : 'teal';

  return (
    <div>
      {/* How long: one switch for all three boxes */}
      {lengths.length > 1 && (
        <div className="flex justify-center mb-7">
          <div role="radiogroup" aria-label={t('tier.length')} className="grid w-full max-w-md p-1 rounded-[20px] bg-gray-100 ring-1 ring-inset ring-gray-200/80" style={{ gridTemplateColumns: `repeat(${lengths.length}, minmax(0, 1fr))` }}>
            {lengths.map((m) => {
              const on = m === length, save = bestSaving(m);
              return (
                <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMonths(m)}
                  className={`relative h-14 rounded-[16px] flex flex-col items-center justify-center transition-all duration-200 ${on ? 'bg-white shadow-[0_2px_8px_rgba(36,48,58,0.12)]' : 'hover:bg-white/60'}`}>
                  <span className={`text-[14px] font-extrabold ${on ? (gift ? 'text-lilac-600' : 'text-teal-700') : 'text-gray-700'}`}>{fill(t(m === 1 ? 'tier.month1' : 'tier.monthsN'), { n: m })}</span>
                  <span className={`text-[11px] font-bold ${save ? 'text-peach-600' : 'text-gray-400'}`}>{save ? fill(t('tier.saveUpTo'), { n: save }) : t('tier.flexible')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The boxes: stacked on phones, side by side from tablets */}
      <div className="grid md:grid-cols-3 gap-4 lg:gap-5 max-w-5xl mx-auto items-stretch text-left md:pt-3">
        {tiers.map((tier, i) => {
          const plan = tier.plans.find((p: any) => p.durationValue === length && usable(p));
          const featured = tier.featured;
          const name = tierText(tier, 'name', lang);
          const perMonth = plan ? Number(plan.monthlyEquivPrice ?? Number(plan.price) / length) : 0;
          const save = plan ? Number(plan.discountPercent) || 0 : 0;
          return (
            <article key={tier.id} aria-label={name}
              className={`relative flex flex-col rounded-[26px] p-5 lg:p-6 transition-all duration-300 motion-safe:animate-[fadeUp_0.4s_ease-out_both] ${
                featured
                  ? gift ? 'bg-gradient-to-b from-lilac-50 to-white ring-2 ring-lilac-300 md:-translate-y-3' : 'bg-gradient-to-b from-teal-50 via-white to-white ring-2 ring-teal-400 shadow-[0_24px_48px_-28px_rgba(13,148,136,0.55)] md:-translate-y-3'
                  : 'bg-white ring-1 ring-gray-200/80 hover:ring-teal-200'} ${!plan ? 'opacity-60' : ''}`}
              style={{ animationDelay: `${i * 70}ms` }}>
              {featured && (
                <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap h-7 px-3.5 rounded-full text-[12px] font-bold inline-flex items-center gap-1 ${gift ? 'bg-lilac-400 text-white' : 'bg-teal-600 text-white'}`}>
                  <Icon name="star" className="w-3.5 h-3.5" />{t('tier.mostChosen')}
                </span>
              )}

              <div className="flex items-center gap-3">
                <span className={`w-12 h-12 shrink-0 rounded-[16px] flex items-center justify-center text-[26px] ${gift ? 'bg-lilac-50' : 'bg-teal-50'}`} aria-hidden="true">{tier.emoji || '📦'}</span>
                <div className="min-w-0">
                  <h3 className="text-[19px] font-extrabold text-gray-900 leading-tight">{name}</h3>
                  <p className="text-[12.5px] text-gray-500 leading-snug">{tierText(tier, 'tagline', lang)}</p>
                </div>
              </div>

              {plan ? (
                <>
                  <p className="mt-5 flex items-baseline gap-1">
                    <span key={`${tier.id}-${length}`} className="text-[34px] font-extrabold tracking-tight text-gray-900 leading-none motion-safe:animate-[fadeUp_0.25s_ease-out]">{money(perMonth)}</span>
                    <span className="text-[13px] font-semibold text-gray-500">{t('tier.perMonth')}</span>
                  </p>
                  <p className="mt-1.5 min-h-[1.5rem] flex flex-wrap items-center gap-1.5 text-[12.5px] text-gray-500">
                    {length === 1 ? t('tier.billedMonthly') : fill(t('tier.totalFor'), { total: money(Number(plan.price)), n: length })}
                    {save > 0 && <span className="h-6 px-2 rounded-full bg-peach-50 text-peach-600 text-[11.5px] font-extrabold inline-flex items-center">−{save}%</span>}
                  </p>
                </>
              ) : (
                <p className="mt-5 text-[13px] text-gray-500">{t('tier.notThisLength')}</p>
              )}

              {/* How full the box is: one square per item */}
              <div className={`mt-4 rounded-[16px] px-3.5 py-3 ${gift ? 'bg-lilac-50/70' : 'bg-gray-50'}`}>
                <p className="text-[13px] font-bold text-gray-800">{fill(t('tier.items'), { n: tier.itemCount })}</p>
                <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
                  {Array.from({ length: tier.itemCount }, (_, k) => (
                    <span key={k} className={`w-4 h-4 rounded-[5px] ${gift ? 'bg-lilac-300' : 'bg-teal-400'} motion-safe:animate-[pop_0.3s_ease-out_both]`} style={{ animationDelay: `${200 + k * 40}ms`, opacity: 0.55 + (k / tier.itemCount) * 0.45 }} />
                  ))}
                </div>
              </div>

              <ul className="mt-4 space-y-2 flex-1">
                {tierHighlights(tier, lang).map((h: string, k: number) => (
                  <li key={k} className="flex items-start gap-2 text-[13.5px] text-gray-700">
                    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${gift ? 'bg-lilac-100 text-lilac-600' : 'bg-teal-100 text-teal-700'}`} aria-hidden="true"><Icon name="check" className="w-3 h-3" strokeWidth={3} /></span>
                    {h}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-[13.5px] text-gray-700">
                  <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${gift ? 'bg-lilac-100 text-lilac-600' : 'bg-teal-100 text-teal-700'}`} aria-hidden="true"><Icon name="check" className="w-3 h-3" strokeWidth={3} /></span>
                  {gift ? t('co.gift.planPerk') : plan?.deliveryIncluded ? t('global.freeDelivery') : t('global.cancelAnytime')}
                </li>
              </ul>

              <button type="button" disabled={!plan || !!busy} onClick={() => plan && choose(plan)}
                aria-label={plan ? `${fill(t(gift ? 'tier.gift' : 'tier.choose'), { name })}: ${money(Number(plan.price))}` : undefined}
                className={`mt-5 w-full h-12 rounded-full text-[14px] font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                  featured
                    ? tone === 'lilac' ? 'bg-lilac-400 text-white hover:bg-lilac-600' : 'bg-teal-600 text-white hover:bg-teal-700 shadow-[0_12px_24px_-14px_rgba(13,148,136,0.9)]'
                    : tone === 'lilac' ? 'bg-lilac-50 text-lilac-600 hover:bg-lilac-100' : 'bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white'}`}>
                {busy === plan?.id ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Icon name={gift ? 'gift' : 'arrow'} className="w-[18px] h-[18px]" />}
                {fill(t(gift ? 'tier.gift' : 'tier.choose'), { name })}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
