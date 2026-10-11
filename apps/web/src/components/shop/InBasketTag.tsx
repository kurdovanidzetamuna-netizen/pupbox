'use client';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';

/** "🛍 n ✕": how many are in the basket; tapping takes the product out. */
export default function InBasketTag({ count, onRemove, busy = false, className = '' }: { count: number; onRemove: () => void; busy?: boolean; className?: string }) {
  const { t } = useLanguage();
  if (count <= 0) return null;
  const said = fill(t('shop.inBasket'), { n: count });
  return (
    <button type="button" onClick={onRemove} disabled={busy} title={`${said} · ${t('shop.uncheck')}`} aria-label={`${said}. ${t('shop.uncheck')}`}
      className={`group/tag inline-flex items-center gap-1 h-7 pl-1.5 pr-1 rounded-full bg-white/90 text-teal-700 ring-1 ring-teal-100 text-[12px] font-bold backdrop-blur animate-[pop_0.3s_ease-out] hover:bg-red-50 hover:text-red-500 hover:ring-red-100 transition-colors disabled:opacity-60 ${className}`}>
      <Icon name="bag" className="w-4 h-4" strokeWidth={2.2} />
      <span className="tabular-nums">{count}</span>
      <span className="w-5 h-5 rounded-full flex items-center justify-center bg-teal-50 group-hover/tag:bg-red-100"><Icon name="close" className="w-3 h-3" strokeWidth={2.8} /></span>
    </button>
  );
}
