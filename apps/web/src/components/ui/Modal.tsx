'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';

const WIDTH = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' } as const;

/**
 * The one pop-up the site uses: a centred card on tablets and computers, a
 * bottom sheet on phones. It never grows past the screen: the title stays at
 * the top, the middle scrolls, and `footer` (the buttons) stays at the
 * bottom. Escape and the backdrop close it; focus moves in on open and back
 * where it was on close.
 */
export default function Modal({ open, onClose, title, children, footer, size = 'sm' }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Buttons pinned under the scrolling part. */
  footer?: React.ReactNode;
  size?: keyof typeof WIDTH;
}) {
  const box = useRef<HTMLDivElement>(null);
  // Drawn at the end of <body>: inside an animated or transformed section a
  // fixed pop-up would be boxed into that section instead of the screen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    // With a mouse, straight into the first field; on touch screens that would
    // pop the keyboard over half the sheet, so focus the sheet itself.
    const fine = window.matchMedia('(pointer: fine)').matches;
    const first = fine ? box.current?.querySelector<HTMLElement>('input, button:not([data-close]), [href]') : null;
    (first ?? box.current)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; before?.focus?.(); };
  }, [open, onClose, mounted]);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6 text-left">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease-out]" onClick={onClose} aria-hidden="true" />
      <div ref={box} role="dialog" aria-modal="true" tabIndex={-1} aria-label={typeof title === 'string' ? title : undefined}
        className={`relative w-full ${WIDTH[size]} flex flex-col max-h-[92dvh] sm:max-h-[min(860px,calc(100dvh-3rem))] bg-white rounded-t-3xl sm:rounded-3xl ring-1 ring-gray-200/70 outline-none animate-[fadeUp_0.2s_ease-out]`}>
        {/* Phones: a handle, so it reads as a sheet you can dismiss. */}
        <span className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-200 shrink-0" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4 px-5 sm:px-7 pt-3 sm:pt-6 pb-3 shrink-0">
          <h2 className="text-[17px] sm:text-lg font-bold text-gray-900 leading-tight">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label="×"
            className="-mr-2 w-9 h-9 shrink-0 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center">
            <Icon name="close" className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-7 ${footer ? 'pb-4' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-7'}`}>
          {children}
        </div>
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2 px-5 sm:px-7 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-5 border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
