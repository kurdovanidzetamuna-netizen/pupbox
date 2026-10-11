'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

/** Idle and on/open colours for an icon trigger. */
const TONES = {
  gray: ['bg-gray-100 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900', 'bg-teal-50 text-teal-700'],
  mint: ['bg-teal-50 text-teal-700 hover:bg-teal-100', 'bg-teal-100 text-teal-800'],
  lilac: ['bg-lilac-50 text-lilac-600 hover:bg-lilac-100', 'bg-lilac-100 text-lilac-600'],
  sky: ['bg-sky-50 text-sky-600 hover:bg-sky-100', 'bg-sky-100 text-sky-700'],
  peach: ['bg-peach-50 text-peach-600 hover:bg-peach-100', 'bg-peach-100 text-peach-600'],
} as const;

export type MenuItem = { icon?: string; label: string; onClick: () => void; tone?: 'danger'; /** A choice that's currently on (shows ✓). */ checked?: boolean; /** A thin line above it (e.g. before Reset). */ divider?: boolean };

/**
 * A round icon button ("⋯" by default) that opens a small dropdown — of
 * actions, or of choices with a ✓ on the current one (sort, filter). Keeps
 * screens free of text buttons while every option stays one tap away. The
 * label shows as a tooltip. Closes on outside click or Escape; arrow keys
 * move between items.
 */
export default function Menu({ items, label, icon = 'more', active = false, size = 'sm', align = 'right', title, tone = 'gray', onReset, resetDisabled = false, resetLabel = '' }: {
  items: MenuItem[];
  label: string;
  /** The trigger's icon. */
  icon?: string;
  /** Marks the trigger (a dot) when a non-default choice is on. */
  active?: boolean;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  /** A small header: the menu's name and a ↺ that puts the default back (greyed while it's already the default). */
  title?: string;
  /** A soft colour for an icon trigger. */
  tone?: keyof typeof TONES;
  onReset?: () => void;
  resetDisabled?: boolean;
  resetLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = [...(box.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? [])];
        const i = els.indexOf(document.activeElement as HTMLButtonElement);
        els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    box.current?.querySelector<HTMLButtonElement>('[role^="menuitem"]')?.focus({ preventScroll: true });
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={box} className="relative group/tip">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={label}
        className={`relative inline-flex items-center justify-center rounded-full transition-colors ${size === 'md' ? 'w-10 h-10' : 'w-8 h-8'} ${
          icon === 'more'
            ? (open ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100')
            : (open || active ? TONES[tone][1] : TONES[tone][0])}`}>
        <Icon name={icon} className={icon === 'more' ? 'w-5 h-5' : 'w-[18px] h-[18px]'} strokeWidth={icon === 'more' ? 3 : 2} />
        {active && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-peach-400 ring-2 ring-white" aria-hidden="true" />}
      </button>
      {!open && icon !== 'more' && (
        <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-lg bg-gray-800 text-white text-[11px] font-medium px-2 py-1 opacity-0 translate-y-1 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 z-30">{label}</span>
      )}
      {open && (
        <div role="menu" className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-40 min-w-[180px] rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_8px_30px_-10px_rgba(36,48,58,0.25)] p-1.5 animate-[fadeUp_0.12s_ease-out]`}>
          {(title || onReset) && (
            <div className="flex items-center justify-between gap-3 pl-3 pr-1 pt-1 pb-1.5 mb-1 border-b border-gray-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</span>
              {onReset && (
                <button type="button" onClick={() => { setOpen(false); onReset(); }} disabled={resetDisabled}
                  aria-label={resetLabel} title={resetLabel}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-teal-700 hover:bg-teal-50 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-default transition-colors">
                  <Icon name="reset" className="w-4 h-4" strokeWidth={2.2} />
                </button>
              )}
            </div>
          )}
          {items.map((it) => (
            <div key={it.label}>
            {it.divider && <div className="my-1 mx-2 h-px bg-gray-100" role="separator" />}
            <button type="button" role={it.checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={it.checked}
              onClick={() => { setOpen(false); it.onClick(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-left whitespace-nowrap outline-none transition-colors focus:bg-gray-50 ${
                it.tone === 'danger' ? 'text-red-600 hover:bg-red-50' : it.checked ? 'text-teal-800 bg-teal-50 font-semibold' : 'text-gray-700 hover:bg-teal-50/60 hover:text-teal-800 focus:bg-teal-50/60'}`}>
              {it.icon && <Icon name={it.icon} className="w-4 h-4" />}
              <span className="flex-1">{it.label}</span>
              {it.checked && <Icon name="check" className="w-4 h-4 text-teal-600" strokeWidth={2.6} />}
            </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
