import { Icon } from '@/components/ui/icons';

/** The admin picks an emoji; the site shows a matching mint line icon. */
const LINE_ICON: Record<string, string> = { '🚚': 'truck', '📦': 'box', '🔒': 'lock', '💳': 'card', '🐾': 'paw', '🐕': 'paw', '🎁': 'gift', '↩️': 'undo', '⭐': 'star', '✨': 'sparkle', '🛡️': 'shield', '📍': 'pin' };

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
          {LINE_ICON[p.icon]
            ? <Icon name={LINE_ICON[p.icon]} className="w-4 h-4 text-teal-600" strokeWidth={1.8} />
            : <span className="grayscale opacity-70 text-[13px]" aria-hidden="true">{p.icon}</span>}
          {p.text}
        </li>
      ))}
    </ul>
  );
}
