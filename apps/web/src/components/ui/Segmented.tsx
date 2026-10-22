'use client';
import { Icon } from './icons';

/**
 * The site's one switch / tab look: a grey track with a white pill that
 * slides under the chosen option (sign in · sign up, for my dog · gift,
 * once · monthly, address · card). Equal-width options; icons optional;
 * a small count bubble per option is optional too.
 */
export default function Segmented<T extends string>({ value, onChange, options, label, size = 'md', className = '' }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: string; count?: number }[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;
  return (
    <div role="tablist" aria-label={label}
      className={`relative grid p-1 rounded-full bg-gray-200/80 ring-1 ring-inset ring-gray-300/60 ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-full bg-white ring-1 ring-gray-200 transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}
          className={`relative z-10 ${size === 'sm' ? 'h-8 text-[12.5px]' : 'h-10 text-[13.5px]'} px-2 rounded-full inline-flex items-center justify-center gap-1.5 font-bold whitespace-nowrap transition-colors ${o.value === value ? 'text-teal-700' : 'text-gray-600 hover:text-gray-900'}`}>
          {o.icon && <Icon name={o.icon} className="w-4 h-4 shrink-0" />}
          <span className="truncate">{o.label}</span>
          {!!o.count && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold inline-flex items-center justify-center ${o.value === value ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
