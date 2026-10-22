'use client';
import { useEffect, type ReactNode } from 'react';

/**
 * "Are you sure?" for a step that matters — handing an order to the courier
 * (the customer is told), cancelling, refunding. Says plainly what will
 * happen; the main button names the action. Esc or the backdrop says no.
 * Sits above the order page; on phones it rises from the bottom.
 */
export default function ConfirmSheet({ open, title, children, confirmLabel, tone = 'primary', busy, onConfirm, onClose, disabled }: {
  open: boolean; title: string; children?: ReactNode; confirmLabel: string;
  tone?: 'primary' | 'danger'; busy?: boolean; disabled?: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', esc, true);
    return () => window.removeEventListener('keydown', esc, true);
  }, [open, onClose]);
  if (!open) return null;
  const color = tone === 'danger' ? 'var(--red-600)' : 'var(--teal-600)';
  return (
    <div role="alertdialog" aria-modal="true" aria-label={title} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="cs-card"
        style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', background: 'var(--white)', borderRadius: 20, padding: 22, boxShadow: '0 24px 60px -20px rgba(15,23,42,.45)', animation: 'csIn .18s ease-out' }}>
        <style>{'@keyframes csIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}@media(max-width:640px){.cs-card{position:fixed;left:0;right:0;bottom:0;max-width:none!important;border-radius:20px 20px 0 0!important}}'}</style>
        <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: 'var(--slate-900)' }}>{title}</h2>
        <div style={{ fontSize: 13.5, color: 'var(--slate-600)', lineHeight: 1.55 }}>{children}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18, flexWrap: 'wrap' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 11, border: '1.5px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-700)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Go back</button>
          <button type="button" onClick={onConfirm} disabled={busy || disabled} autoFocus
            style={{ padding: '10px 18px', borderRadius: 11, border: 'none', background: color, color: 'var(--white)', fontSize: 13.5, fontWeight: 800, cursor: busy || disabled ? 'default' : 'pointer', opacity: busy || disabled ? 0.6 : 1 }}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A short "done" note at the bottom, with Undo when a step can be taken back. */
export function Toast({ text, onUndo, onClose }: { text: string; onUndo?: () => void; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, onUndo ? 8000 : 3000); return () => clearTimeout(t); }, [text, onUndo, onClose]);
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 104, transform: 'translateX(-50%)', zIndex: 90, display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px 11px 18px', borderRadius: 14, background: 'var(--slate-900)', color: '#fff', fontSize: 13.5, fontWeight: 600, boxShadow: '0 12px 32px -10px rgba(15,23,42,.6)', maxWidth: 'calc(100vw - 32px)', animation: 'csIn .2s ease-out' }}>
      <span>✓ {text}</span>
      {onUndo && <button type="button" onClick={() => { onUndo(); onClose(); }} style={{ border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 9, padding: '6px 11px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Undo</button>}
    </div>
  );
}
