'use client';
import { useEffect, useState, type ReactNode } from 'react';
import ConfirmSheet from '@/app/dashboard/orders/_components/ConfirmSheet';

/**
 * A create / edit panel from the right (a full sheet on phones): header with
 * the title and ×, the form scrolling in the middle, the buttons fixed at the
 * bottom. Closing with unsaved changes (×, Esc, backdrop, Cancel) asks first.
 */
export default function SideDrawer({ open, title, subtitle, dirty, onClose, footer, children, width = 560 }: {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Something typed and not saved: closing asks "Discard changes?". */
  dirty?: boolean;
  onClose: () => void;
  footer?: (close: () => void) => ReactNode;
  children: ReactNode;
  width?: number;
}) {
  const [asking, setAsking] = useState(false);
  const tryClose = () => (dirty ? setAsking(true) : onClose());

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !asking) tryClose(); };
    window.addEventListener('keydown', esc);
    // The page behind stays still while the panel is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!open) setAsking(false); }, [open]);
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      <style>{`
        @keyframes sdIn { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes sdUp { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes sdFade { from { opacity: 0 } to { opacity: 1 } }
        .sd-panel { position: absolute; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; background: var(--slate-50); box-shadow: -16px 0 48px rgba(15,23,42,.18); animation: sdIn .22s ease-out; }
        @media (max-width: 640px) { .sd-panel { top: 8px; left: 0; width: 100vw !important; border-radius: 20px 20px 0 0; animation: sdUp .22s ease-out; } }
        @media (prefers-reduced-motion: reduce) { .sd-panel { animation: none; } }
      `}</style>
      <div onClick={tryClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.38)', animation: 'sdFade .2s ease-out' }} />
      <aside role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className="sd-panel" style={{ width: `min(${width}px, 100vw)` }}>
        <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 14px', background: 'var(--white)', borderBottom: '1px solid var(--slate-100)', borderRadius: 'inherit' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--slate-900)' }}>{title}</h2>
            {subtitle && <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--slate-500)' }}>{subtitle}</div>}
          </div>
          <button type="button" onClick={tryClose} aria-label="Close"
            style={{ width: 36, height: 36, flexShrink: 0, border: 'none', borderRadius: 11, background: 'var(--slate-100)', color: 'var(--slate-600)', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px', overscrollBehavior: 'contain' }}>{children}</div>
        {footer && (
          <footer style={{ padding: '12px 20px calc(12px + env(safe-area-inset-bottom))', background: 'var(--white)', borderTop: '1px solid var(--slate-100)' }}>
            {footer(tryClose)}
          </footer>
        )}
      </aside>
      <ConfirmSheet open={asking} title="Discard changes?" confirmLabel="Discard" tone="danger"
        onClose={() => setAsking(false)} onConfirm={() => { setAsking(false); onClose(); }}>
        What you changed here hasn’t been saved and will be lost.
      </ConfirmSheet>
    </div>
  );
}
