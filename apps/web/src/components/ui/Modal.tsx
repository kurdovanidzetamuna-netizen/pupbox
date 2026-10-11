'use client';
import { useEffect, useRef } from 'react';

/**
 * The one pop-up the site uses: a centred card (a bottom sheet on phones)
 * over a soft backdrop. Escape and the backdrop close it; focus moves into
 * it on open and back where it was on close.
 */
export default function Modal({ open, onClose, title, children, size = 'sm' }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const first = box.current?.querySelector<HTMLElement>('input, button:not([data-close]), [href]');
    first?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; before?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease-out]" onClick={onClose} aria-hidden="true" />
      <div ref={box} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
        className={`relative w-full ${size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-md'} bg-white rounded-t-3xl sm:rounded-3xl ring-1 ring-gray-200/70 p-6 sm:p-7 animate-[fadeUp_0.2s_ease-out]`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label="×" className="-mr-2 -mt-1 w-9 h-9 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
