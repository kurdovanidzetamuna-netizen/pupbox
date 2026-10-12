'use client';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';

const money = (n: unknown) => `₾${Number(n).toFixed(2)}`;

/**
 * The add-to-basket button with the price. Before adding, a badge shows how
 * many will go in; once something was picked it turns light mint with ✓ and
 * how many are in the basket, until a new pick is started.
 */
export default function AddButton({ picked, inBasket, qty, unit, busy, disabled, onClick, className = '' }: {
  picked: boolean;
  inBasket: number;
  qty: number;
  unit: number;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const label = picked ? `${fill(t('shop.inBasket'), { n: inBasket })} · ${t('pdp.addMore')}` : `${t('shop.quickAdd')} · ${money(unit * qty)}`;
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled} aria-label={label} title={label}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-colors disabled:opacity-50 h-9 px-4 text-[13.5px] ${
        picked ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100' : 'bg-teal-600 text-white hover:bg-teal-700'} ${className}`}>
      {busy ? <span className={`w-4 h-4 border-2 rounded-full animate-spin ${picked ? 'border-teal-200 border-t-teal-600' : 'border-white/40 border-t-white'}`} />
        : <><span className="relative">
            <Icon name={picked ? 'check' : 'bag'} className="w-[18px] h-[18px]" strokeWidth={2.2} />
            {(picked || qty > 1) && (
              <span key={picked ? `in${inBasket}` : qty}
                className={`absolute -top-2 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-extrabold leading-4 text-center animate-[pop_0.25s_ease-out] ${picked ? 'bg-teal-600 text-white' : 'bg-white text-teal-700'}`}>
                {picked ? inBasket : qty}
              </span>
            )}
          </span><span className="tabular-nums">{money(unit * qty)}</span></>}
    </button>
  );
}
