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
 * Choose a box. One switch for how long (1, 3 or 6 months — longer saves
 * more), then Mini, Standard and Premium as small cards you tap to pick
 * (rows on phones, side by side from tablets). The popular one starts picked.
 * One button below says what you're getting and what it costs; under it, what
 * makes that box different. Gift mode shows only what can be gifted.
 */
export default function TierPicker({ tiers, gift = false }: { tiers: any[]; gift?: boolean }) {
  const { t, lang } = useLanguage();
  const { addPlan } = useCart();
  const router = useRouter();
  const usable = (p: any) => !gift || p.giftable !== false;
  const lengths = [...new Set(tiers.flatMap((tr) => tr.plans.filter(usable).map((p: any) => p.durationValue as number)))].sort((a, b) => a - b);
  const [months, setMonths] = useState<number>(lengths[0] ?? 1);
  const [pickedId, setPickedId] = useState<string>((tiers.find((tr) => tr.featured) ?? tiers[0])?.id);
  const [busy, setBusy] = useState(false);
  const length = lengths.includes(months) ? months : lengths[0];

  const planOf = (tier: any) => tier.plans.find((p: any) => p.durationValue === length && usable(p));
  // The picked box, or — when it isn't sold at this length — the popular one, else the first that is.
  const open = tiers.filter(planOf);
  const picked = open.find((tr) => tr.id === pickedId) ?? open.find((tr) => tr.featured) ?? open[0];
  const plan = picked ? planOf(picked) : null;

  // The most any box saves at each length, for the switch.
  const bestSaving = (m: number) => Math.max(0, ...tiers.map((tr) => Number(tr.plans.find((p: any) => p.durationValue === m)?.discountPercent) || 0));

  async function choose() {
    if (!plan) return;
    setBusy(true);
    try {
      await addPlan(plan.id);
      router.push(gift ? `/checkout?gift=true&plan=${plan.slug}` : '/checkout');
    } catch { setBusy(false); }
  }

  if (!lengths.length) return null;
  const A = gift
    ? { on: 'bg-lilac-50 ring-2 ring-lilac-400', hover: 'hover:ring-lilac-400/60', chip: 'bg-lilac-100 text-lilac-600 ring-2 ring-white', dot: 'bg-lilac-400', text: 'text-lilac-600', btn: 'bg-lilac-600 hover:opacity-90' }
    : { on: 'bg-teal-50 ring-2 ring-teal-500', hover: 'hover:ring-teal-300', chip: 'bg-teal-100 text-teal-800 ring-2 ring-white', dot: 'bg-teal-500', text: 'text-teal-700', btn: 'bg-teal-600 hover:bg-teal-700' };
  const pickedName = picked ? tierText(picked, 'name', lang) : '';
  const about = picked ? (tierHighlights(picked, lang).join(' · ') || tierText(picked, 'tagline', lang)) : '';

  return (
    <div className="max-w-4xl mx-auto">
      {/* How long: one switch for all three boxes */}
      {lengths.length > 1 && (
        <div className="flex justify-center mb-5">
          <div role="radiogroup" aria-label={t('tier.length')} className="grid w-full max-w-sm p-1 rounded-full bg-gray-100" style={{ gridTemplateColumns: `repeat(${lengths.length}, minmax(0, 1fr))` }}>
            {lengths.map((m) => {
              const on = m === length, save = bestSaving(m);
              return (
                <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMonths(m)}
                  className={`h-12 rounded-full flex flex-col items-center justify-center leading-tight transition-colors duration-200 ${on ? 'bg-white ring-1 ring-gray-200' : 'hover:bg-white/60'}`}>
                  <span className={`text-[13.5px] font-extrabold ${on ? A.text : 'text-gray-700'}`}>{fill(t(m === 1 ? 'tier.month1' : 'tier.monthsN'), { n: m })}</span>
                  <span className={`text-[11px] font-bold ${save ? 'text-peach-600' : 'text-gray-400'}`}>{save ? `−${save}%` : t('tier.flexible')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The boxes: rows on phones, side by side from tablets. Tap to pick. */}
      <div role="radiogroup" aria-label={t('tier.pick')} className="grid md:grid-cols-3 gap-3.5 md:gap-4 text-left">
        {tiers.map((tier, i) => {
          const p = planOf(tier);
          const on = picked?.id === tier.id;
          const name = tierText(tier, 'name', lang);
          const perMonth = p ? Number(p.monthlyEquivPrice ?? Number(p.price) / length) : 0;
          const save = p ? Number(p.discountPercent) || 0 : 0;
          return (
            <button key={tier.id} type="button" role="radio" aria-checked={on} disabled={!p} onClick={() => setPickedId(tier.id)}
              aria-label={p ? `${name}, ${money(perMonth)} ${t('tier.perMonth')}, ${fill(t('tier.itemsShort'), { n: tier.itemCount })}` : name}
              className={`relative flex md:flex-col items-center md:items-stretch gap-3 md:gap-4 text-left rounded-[22px] p-3.5 md:p-5 transition-[background-color,box-shadow] duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 disabled:opacity-50 disabled:cursor-not-allowed motion-safe:animate-[fadeUp_0.35s_ease-out_both] ${
                on ? A.on : `bg-white ring-1 ring-gray-200 ${A.hover}`}`}
              style={{ animationDelay: `${i * 60}ms` }}>
              {tier.featured && (
                <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 h-5 px-2.5 rounded-full text-[10.5px] font-bold whitespace-nowrap inline-flex items-center gap-1 ${A.chip}`}>
                  <Icon name="star" className="w-3 h-3" />{t('tier.mostChosen')}
                </span>
              )}
              <span className="flex items-center md:items-start lg:items-center md:flex-col lg:flex-row gap-3 md:gap-2.5 lg:gap-3 min-w-0 flex-1 md:flex-none">
                <span className={`w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-[14px] flex items-center justify-center text-[24px] transition-colors ${on ? 'bg-white' : 'bg-gray-50'}`} aria-hidden="true">{tier.emoji || '📦'}</span>
                <span className="min-w-0">
                  <span className="block text-[16px] md:text-[18px] font-extrabold text-gray-900 leading-tight">{name}</span>
                  {/* How full the box is: one dot per item */}
                  <span className="mt-1 flex items-center gap-1.5">
                    <span className="flex gap-[3px]" aria-hidden="true">
                      {Array.from({ length: tier.itemCount }, (_, k) => (
                        <span key={k} className={`w-2 h-2 rounded-[3px] ${A.dot} motion-safe:animate-[pop_0.3s_ease-out_both]`} style={{ animationDelay: `${150 + k * 35}ms`, opacity: 0.45 + (k / tier.itemCount) * 0.55 }} />
                      ))}
                    </span>
                    <span className="text-[12px] font-semibold text-gray-500 whitespace-nowrap">{fill(t('tier.itemsShort'), { n: tier.itemCount })}</span>
                  </span>
                </span>
              </span>

              <span className="shrink-0 flex flex-col items-end md:flex-row md:items-baseline md:flex-wrap md:gap-x-1.5">
                {p ? (
                  <>
                    <span className="flex items-baseline gap-1">
                      <span key={`${tier.id}-${length}`} className="text-[21px] md:text-[30px] font-extrabold tracking-tight text-gray-900 leading-none motion-safe:animate-[fadeUp_0.25s_ease-out]">{money(perMonth)}</span>
                      <span className="text-[11.5px] md:text-[13px] font-semibold text-gray-500">{t('tier.perMonth')}</span>
                    </span>
                    {save > 0 && <span className="mt-1 md:mt-0 h-5 px-1.5 rounded-full bg-peach-50 text-peach-600 text-[11px] font-extrabold inline-flex items-center">−{save}%</span>}
                  </>
                ) : (
                  <span className="text-[12px] text-gray-500 max-w-[9rem] md:max-w-none">{t('tier.notThisLength')}</span>
                )}
              </span>

              {on && (
                <span className={`hidden md:flex absolute top-4 right-4 w-6 h-6 rounded-full items-center justify-center text-white motion-safe:animate-[pop_0.25s_ease-out] ${gift ? 'bg-lilac-400' : 'bg-teal-600'}`} aria-hidden="true">
                  <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* One action for the picked box, with what it costs */}
      <div className="mt-5 max-w-md mx-auto text-center">
        <button type="button" disabled={!plan || busy} onClick={choose}
          className={`w-full min-h-[56px] px-5 py-2 rounded-full text-white inline-flex flex-col items-center justify-center transition-[background-color,opacity] disabled:opacity-60 ${A.btn}`}>
          <span className="inline-flex items-center gap-2 text-[15px] font-bold leading-tight">
            {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icon name={gift ? 'gift' : 'arrow'} className="w-[18px] h-[18px]" />}
            {fill(t(gift ? 'tier.gift' : 'tier.choose'), { name: pickedName })}
          </span>
          {plan && (
            <span className="text-[12px] font-semibold text-white leading-tight">
              {length > 1 ? fill(t('tier.totalFor'), { total: money(Number(plan.price)), n: length }) : `${money(Number(plan.price))} ${t('tier.perMonth')}`}
            </span>
          )}
        </button>
        {about && <p key={picked?.id} className="mt-2.5 text-[12.5px] text-gray-500 leading-snug line-clamp-2 motion-safe:animate-[fadeUp_0.25s_ease-out]">{about}</p>}
        <p className="mt-2.5 flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-[12px] font-semibold text-gray-500">
          {gift ? (
            <span className="inline-flex items-center gap-1.5"><Icon name="gift" className={`w-4 h-4 ${A.text}`} />{t('co.gift.planPerk')}</span>
          ) : (
            <>
              {plan?.deliveryIncluded && <span className="inline-flex items-center gap-1.5"><Icon name="truck" className={`w-4 h-4 ${A.text}`} />{t('global.freeDelivery')}</span>}
              <span className="inline-flex items-center gap-1.5"><Icon name="repeat" className={`w-4 h-4 ${A.text}`} />{t('global.cancelAnytime')}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
