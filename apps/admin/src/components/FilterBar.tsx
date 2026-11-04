'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useCompact } from '@/lib/media';

/**
 * A list's search and filters. On computers everything sits in one row. On
 * phones and tablets the search stays and the filters move into a sheet
 * behind a "Filters" button that shows how many are on, so the list starts
 * on the first screen instead of after a wall of boxes.
 */
export default function FilterBar({ search, children, active = 0, onClear, onApply, after }: {
  /** The search box, always in view. */
  search?: ReactNode;
  /** The filter controls (dropdowns, date fields…). */
  children: ReactNode;
  /** How many filters differ from their default, for the button's badge. */
  active?: number;
  /** Puts every filter back to its default. */
  onClear?: () => void;
  /** For lists that filter on a button press: "Show results" applies them. */
  onApply?: () => void;
  /** Shown after the filters in both layouts (a sort control, say). */
  after?: ReactNode;
}) {
  const compact = useCompact();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [open]);

  if (!compact) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {search}{children}{after}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }} className="fb-row">
        <div style={{ flex: 1, minWidth: 0 }}>{search}</div>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 14px', flexShrink: 0, borderRadius: 12, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            border: `1.5px solid ${active ? 'var(--teal-300)' : 'var(--slate-200)'}`, background: active ? 'var(--teal-50)' : 'var(--white)', color: active ? 'var(--teal-800)' : 'var(--slate-700)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Filters
          {active > 0 && <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--teal-600)', color: 'var(--white)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{active}</span>}
        </button>
      </div>
      {after && <div style={{ marginTop: 8 }}>{after}</div>}

      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
          <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.38)', animation: 'admFade .2s ease-out' }} />
          <div role="dialog" aria-modal="true" aria-label="Filters" className="fb-sheet"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '86dvh', display: 'flex', flexDirection: 'column', background: 'var(--white)', borderRadius: '22px 22px 0 0', boxShadow: '0 -12px 40px rgba(15,23,42,.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }} aria-hidden="true"><span style={{ width: 40, height: 5, borderRadius: 99, background: 'var(--slate-200)' }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px 12px', borderBottom: '1px solid var(--slate-100)' }}>
              <strong style={{ flex: 1, fontSize: 18, fontWeight: 800, color: 'var(--slate-900)' }}>Filters</strong>
              {onClear && active > 0 && (
                <button type="button" onClick={onClear} style={{ height: 40, padding: '0 12px', border: 'none', background: 'none', color: 'var(--teal-700)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>
              )}
            </div>
            <div className="fb-body" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'grid', gap: 10, overscrollBehavior: 'contain' }}>
              {children}
            </div>
            <div style={{ padding: '12px 18px calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--slate-100)' }}>
              <button type="button" onClick={() => { onApply?.(); setOpen(false); }}
                style={{ width: '100%', height: 48, border: 'none', borderRadius: 14, background: 'var(--teal-600)', color: 'var(--white)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Show results
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
