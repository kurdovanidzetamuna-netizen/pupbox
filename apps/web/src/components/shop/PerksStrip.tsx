import { LineIcon } from '@/components/ui/icons';

/**
 * The shop's promises (Page Builder → Shop) as one slim line: a small mint
 * line icon and a few words each, separated by thin dots. Swipes on phones.
 */
export default function PerksStrip({ items, className = '' }: { items: { icon: string; text: string }[]; className?: string }) {
  if (!items?.length) return null;
  return (
    <ul className={`flex items-center gap-x-4 gap-y-1.5 overflow-x-auto sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      {items.map((p, i) => (
        <li key={i} className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
          <span className="text-teal-600 text-[13px]"><LineIcon emoji={p.icon} className="w-4 h-4" /></span>
          {p.text}
        </li>
      ))}
    </ul>
  );
}
