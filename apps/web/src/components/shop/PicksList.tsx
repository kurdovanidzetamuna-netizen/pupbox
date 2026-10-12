'use client';
import { useLanguage } from '@/context/LanguageContext';
import QuantityStepper from '@/components/shop/QuantityStepper';
import type { Choice } from '@/lib/useChoice';

const money = (n: unknown) => `₾${Number(n).toFixed(2)}`;

/**
 * What was picked this visit, one row per size / name, each with its own
 * − n +. Tapping a row puts that choice back in the form.
 */
export default function PicksList({ c, className = '' }: { c: Choice; className?: string }) {
  const { t } = useLanguage();
  const { basket } = c;
  if (!c.needsChoice || !basket.lines.length) return null;
  return (
    <div className={`rounded-2xl bg-teal-50/50 ring-1 ring-teal-100/70 p-2.5 animate-[fadeUp_0.2s_ease-out] ${className}`}>
      <p className="px-1.5 pb-1.5 text-[11.5px] text-gray-500">
        <span className="font-bold text-teal-800">{t('pdp.picks')}</span> · {t(c.engr ? 'pdp.picksHint' : 'pdp.picksHintSize')}
      </p>
      <ul className="space-y-1">
        {basket.lines.map((l) => (
          <li key={l.id} className="flex items-center gap-2 rounded-xl pl-1.5 pr-1 py-1">
            <button type="button" onClick={() => c.load(l)} title={t('pdp.pickEdit')}
              className="flex-1 min-w-0 flex items-center gap-2 text-left rounded-lg py-1 hover:text-teal-800">
              {l.personalisation?.size && <span className="shrink-0 min-w-[2rem] h-6 px-2 rounded-md bg-white ring-1 ring-teal-100 text-[11.5px] font-bold text-teal-800 inline-flex items-center justify-center">{l.personalisation.size}</span>}
              {l.personalisation?.engraving && <span className="truncate text-[13px] font-semibold text-gray-800">„{l.personalisation.engraving}“</span>}
              <span className="ml-auto shrink-0 text-[12px] font-bold text-gray-500 tabular-nums">{money(Number(l.price) * l.quantity)}</span>
            </button>
            <QuantityStepper value={l.quantity} busy={basket.busy} trashAtOne max={l.quantity + c.room}
              onLess={() => basket.setLine(l, l.quantity - 1)} onMore={() => basket.setLine(l, l.quantity + 1)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
