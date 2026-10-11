/**
 * The shop's promises (Page Builder → Shop) as one light "trust bar": a
 * soft panel split into equal parts, each with an icon tile, a bold line and
 * a small one. On phones the parts stand icon-over-text, side by side.
 */
export default function PerksStrip({ items, className = '' }: { items: { icon: string; text: string; sub?: string }[]; className?: string }) {
  if (!items?.length) return null;
  const tiles = ['from-teal-100 to-teal-50', 'from-peach-100 to-peach-50'];
  return (
    <ul className={`grid rounded-3xl bg-white/80 ring-1 ring-teal-100/70 backdrop-blur divide-x divide-teal-100/70 ${className}`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((p, i) => (
        <li key={i} className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 px-2 sm:px-4 py-3 text-center sm:text-left min-w-0">
          <span className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-gradient-to-br ${tiles[i % 2]} flex items-center justify-center text-[19px]`} aria-hidden="true">{p.icon}</span>
          <span className="min-w-0">
            <span className="block text-[12px] sm:text-[13px] font-bold text-gray-800 leading-tight">{p.text}</span>
            {p.sub && <span className="block mt-0.5 text-[11px] sm:text-[11.5px] text-gray-500 leading-tight">{p.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
