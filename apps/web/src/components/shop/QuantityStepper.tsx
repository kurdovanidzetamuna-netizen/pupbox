'use client';
import { useLanguage } from '@/context/LanguageContext';
import { Icon } from '@/components/ui/icons';

/**
 * − n + in pale mint, the same everywhere in the shop. With `trashAtOne`,
 * the minus becomes a bin at 1 (taking it out of the basket).
 */
export default function QuantityStepper({ value, onLess, onMore, max = Infinity, busy = false, trashAtOne = false, size = 'sm', label }: {
  value: number;
  onLess: () => void;
  onMore: () => void;
  max?: number;
  busy?: boolean;
  trashAtOne?: boolean;
  size?: 'sm' | 'lg';
  label?: string;
}) {
  const { t } = useLanguage();
  const btn = size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const atMin = value <= 1 && !trashAtOne;
  return (
    <div role="group" aria-label={label} className={`inline-flex items-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 ${size === 'lg' ? 'h-12' : 'h-9'}`}>
      <button type="button" onClick={onLess} disabled={busy || atMin} aria-label={t('shop.less')} title={t('shop.less')}
        className={`${btn} rounded-full flex items-center justify-center hover:bg-teal-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors`}>
        <Icon name={trashAtOne && value <= 1 ? 'trash' : 'minus'} className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} strokeWidth={2.2} />
      </button>
      <span className={`text-center font-extrabold tabular-nums ${size === 'lg' ? 'min-w-[2rem] text-[16px]' : 'min-w-[1.25rem] text-[13px]'}`} aria-live="polite">{busy ? '…' : value}</span>
      <button type="button" onClick={onMore} disabled={busy || value >= max} aria-label={t('shop.more')} title={t('shop.more')}
        className={`${btn} rounded-full flex items-center justify-center hover:bg-teal-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors`}>
        <Icon name="plus" className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} strokeWidth={2.2} />
      </button>
    </div>
  );
}
