'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

export type MenuItem = { icon: string; label: string; onClick: () => void; tone?: 'danger' };

/**
 * A "⋯" button that opens a small dropdown of actions with icons — keeps a
 * card clean while every action stays one tap away. Closes on outside click
 * or Escape; arrow keys move between items.
 */
export default function Menu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = [...(box.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
        const i = els.indexOf(document.activeElement as HTMLButtonElement);
        els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    box.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={label}
        className={`w-8 h-8 inline-flex items-center justify-center rounded-full transition-colors ${open ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100'}`}>
        <Icon name="more" className="w-5 h-5" strokeWidth={3} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-40 min-w-[180px] rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_8px_30px_-10px_rgba(36,48,58,0.25)] p-1.5 animate-[fadeUp_0.12s_ease-out]">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" onClick={() => { setOpen(false); it.onClick(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-left outline-none transition-colors focus:bg-gray-50 ${it.tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
              <Icon name={it.icon} className="w-4 h-4" />{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
