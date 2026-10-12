'use client';

/**
 * A product's sizes as chips. The chosen one is outlined in mint; a size
 * already picked this visit carries a small count.
 */
export default function SizeChips({ sizes, value, onPick, counts = {}, error = false, compact = false, label }: {
  sizes: string[];
  value: string;
  onPick: (s: string) => void;
  counts?: Record<string, number>;
  error?: boolean;
  compact?: boolean;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={error || undefined}
      className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'} ${error ? 'animate-[shake_0.35s_ease-in-out]' : ''}`}>
      {sizes.map((sz) => {
        const on = value === sz;
        const n = counts[sz] ?? 0;
        return (
          <button key={sz} type="button" role="radio" aria-checked={on} onClick={(e) => { e.preventDefault(); onPick(sz); }}
            className={`relative ${compact ? 'min-w-[1.75rem] h-6 px-1.5 rounded-md text-[11px]' : 'min-w-[2.25rem] h-8 px-3 rounded-lg text-[12px]'} font-bold transition-colors ${
              on ? 'bg-teal-50 text-teal-800 ring-2 ring-teal-300'
                : error ? 'bg-white text-gray-700 ring-1 ring-red-300'
                : 'bg-white text-gray-700 ring-1 ring-gray-200/80 hover:bg-teal-50/50 hover:ring-teal-200'}`}>
            {sz}
            {n > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold leading-[14px] text-center ${compact ? 'text-[8.5px]' : 'text-[9.5px]'}`}>{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
