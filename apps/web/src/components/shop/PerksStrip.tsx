/**
 * The shop's small promises (edited in Page Builder → Shop) as soft little
 * cards with an icon tile: side by side on wide screens, a swipeable row on
 * phones. Mint and peach alternate, the page's two colours.
 */
export default function PerksStrip({ items, className = '' }: { items: { icon: string; text: string }[]; className?: string }) {
  if (!items?.length) return null;
  return (
    <ul className={`flex gap-2.5 overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      {items.map((p, i) => (
        <li key={i} className="shrink-0 flex items-center gap-2.5 rounded-2xl bg-white/80 ring-1 ring-white pl-1.5 pr-4 py-1.5 backdrop-blur">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-[18px] ${i % 2 ? 'bg-peach-50' : 'bg-teal-50'}`} aria-hidden="true">{p.icon}</span>
          <span className="text-[12.5px] font-semibold text-gray-700 whitespace-nowrap">{p.text}</span>
        </li>
      ))}
    </ul>
  );
}
