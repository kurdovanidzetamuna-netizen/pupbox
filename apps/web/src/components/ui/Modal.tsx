'use client';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import IconButton from './IconButton';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import Caps from './Caps';

/** Lets a form inside a pop-up say it has unsaved changes (e.g. sign-up). */
const DirtyContext = createContext<(dirty: boolean) => void>(() => {});
export function useModalDirty(dirty: boolean) {
  const report = useContext(DirtyContext);
  // Layout effect: reported before the browser handles the next key, so an
  // Esc pressed right after typing still asks.
  useLayoutEffect(() => { report(dirty); return () => report(false); }, [dirty, report]);
}

const WIDTH = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-3xl' } as const;

/**
 * The one pop-up the site uses: a centred card on tablets and computers, a
 * bottom sheet on phones. It never grows past the screen: the title stays at
 * the top, the middle scrolls, and `footer` (the buttons) stays at the
 * bottom. Escape and the backdrop close it; focus moves in on open and back
 * where it was on close. With `dirty` (a form with unsaved changes), any way
 * of closing — Esc, ×, the backdrop or the footer ✕ drawn from `cancelLabel` —
 * first asks "Discard your changes?".
 */
export default function Modal({ open, onClose, title, children, footer, header, size = 'sm', dirty = false, cancelLabel, cancelIcon = false }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Buttons pinned under the scrolling part. */
  footer?: React.ReactNode;
  /** A custom top (e.g. a coloured hero) in place of the plain title row; × stays. */
  header?: React.ReactNode;
  size?: keyof typeof WIDTH;
  /** Unsaved changes: closing asks first. */
  dirty?: boolean;
  /** Draws Cancel at the start of the footer, closing the same (guarded) way. */
  cancelLabel?: string;
  /** Draw that Cancel as a round ✕ instead of text. */
  cancelIcon?: boolean;
}) {
  const { t } = useLanguage();
  const box = useRef<HTMLDivElement>(null);
  const [asking, setAsking] = useState(false);
  // Kept in a ref as well, so closing reads the latest value even before a re-render.
  const innerRef = useRef(false);
  const report = useCallback((d: boolean) => { innerRef.current = d; }, []);
  const close = () => (dirty || innerRef.current ? setAsking(true) : onClose());
  const closeRef = useRef(close);
  closeRef.current = close;
  const askingRef = useRef(asking);
  askingRef.current = asking;
  useEffect(() => { if (!open) setAsking(false); }, [open]);
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
    // Esc while asking means "keep editing".
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (askingRef.current) setAsking(false); else closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; before?.focus?.(); };
  }, [open, mounted]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6 text-left">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease-out]" onClick={close} aria-hidden="true" />
      <div ref={box} role="dialog" aria-modal="true" tabIndex={-1} aria-label={typeof title === 'string' ? title : undefined}
        className={`relative w-full ${WIDTH[size]} flex flex-col max-h-[92dvh] sm:max-h-[min(860px,calc(100dvh-3rem))] bg-white rounded-t-3xl sm:rounded-3xl ring-1 ring-gray-200/70 outline-none overflow-hidden animate-[fadeUp_0.2s_ease-out]`}>
        {/* Phones: a handle, so it reads as a sheet you can dismiss. */}
        <span className={`sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-gray-200 shrink-0 ${header ? 'absolute left-1/2 -translate-x-1/2 top-0 z-10 bg-black/10' : ''}`} aria-hidden="true" />
        {header ? (
          <div className="relative shrink-0">
            {header}
            <button type="button" data-close onClick={close} aria-label="×"
              className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 w-9 h-9 rounded-full bg-white/70 backdrop-blur text-gray-500 hover:bg-white hover:text-gray-800 flex items-center justify-center">
              <Icon name="close" className="w-[18px] h-[18px]" />
            </button>
          </div>
        ) : (
        <div className="flex items-center justify-between gap-4 px-5 sm:px-7 pt-3 sm:pt-6 pb-3 shrink-0">
          <h2 className="text-[17px] sm:text-lg font-bold text-gray-900 leading-tight">{typeof title === 'string' ? <Caps text={title} /> : title}</h2>
          <button type="button" data-close onClick={close} aria-label="×"
            className="-mr-2 w-9 h-9 shrink-0 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center">
            <Icon name="close" className="w-[18px] h-[18px]" />
          </button>
        </div>
        )}
        <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-7 ${header ? 'pt-5' : ''} ${footer ? 'pb-4' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-7'}`}>
          <DirtyContext.Provider value={report}>{children}</DirtyContext.Provider>
        </div>
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2 px-5 sm:px-7 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-5 border-t border-gray-100">
            {cancelLabel && (cancelIcon
              ? <IconButton icon="close" label={cancelLabel} onClick={close} />
              : <button type="button" onClick={close} className="px-4 sm:px-5 py-2.5 rounded-full text-[13px] font-semibold text-gray-600 hover:bg-gray-100">{cancelLabel}</button>)}
            {footer}
          </div>
        )}
        {/* Unsaved changes: a small card over the pop-up. */}
        {asking && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[2px] p-6 animate-[fadeIn_0.12s_ease-out]">
            <div role="alertdialog" aria-label={t('ui.discardQ')} className="w-full max-w-[300px] rounded-3xl bg-white ring-1 ring-gray-200 shadow-[0_12px_40px_-12px_rgba(36,48,58,0.3)] p-5 text-center animate-[pop_0.25s_ease-out]">
              <p className="text-[15px] font-bold text-gray-900">{t('ui.discardQ')}</p>
              <p className="mt-1 text-[12.5px] text-gray-500">{t('ui.discardInfo')}</p>
              <div className="mt-5 flex flex-col-reverse sm:flex-row justify-center gap-2">
                <button type="button" onClick={() => { setAsking(false); onClose(); }}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-red-600 hover:bg-red-50 transition">{t('ui.discard')}</button>
                <button type="button" onClick={() => setAsking(false)} autoFocus
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition">{t('ui.keepEditing')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
