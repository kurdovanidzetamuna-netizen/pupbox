'use client';
import { useState } from 'react';

/**
 * A setting as a tile you tap, not a row with a switch on the end.
 *
 * The whole card is the target and the whole card changes colour, so which
 * settings are on is legible from across the room rather than by scanning a
 * column of small switches. Hovering shows the full explanation, which keeps
 * the grid compact without hiding the detail.
 */
export default function SettingTile({ icon, title, onLabel, offLabel, detail, checked, onChange, accent = 'var(--teal-600)', tint = 'var(--teal-50)', border = 'var(--teal-200)' }: {
  icon: string; title: string; onLabel: string; offLabel: string; detail: string;
  checked: boolean; onChange: (v: boolean) => void; accent?: string; tint?: string; border?: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      title={`${detail}${checked ? '' : ' (currently off)'}`}
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: 'pointer', whiteSpace: 'nowrap',
        // Borderless: the tinted fill alone carries the state, which reads
        // cleaner than a chip ringed in colour.
        background: checked ? tint : 'var(--slate-100)',
        border: 'none',
        color: checked ? accent : 'var(--slate-400)',
        borderRadius: 8, padding: '6px 11px', transition: 'all 0.12s',
        fontSize: 12, fontWeight: 600, lineHeight: 1.3,
      }}
    >
      <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0, filter: checked ? 'none' : 'grayscale(1)', opacity: checked ? 1 : 0.4 }}>{icon}</span>
      <span>{title}</span>
      {checked && <span style={{ fontSize: 11, fontWeight: 800 }}>✓</span>}

      {hover && (
        <span style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 5, minWidth: 220, maxWidth: 300, background: 'var(--slate-900)', color: 'var(--white)', fontSize: 11, fontWeight: 400, lineHeight: 1.5, borderRadius: 9, padding: '8px 11px', boxShadow: '0 6px 20px rgba(0,0,0,0.25)', pointerEvents: 'none', whiteSpace: 'normal', textAlign: 'left' }}>
          <strong style={{ display: 'block', marginBottom: 2 }}>{checked ? onLabel : offLabel}</strong>
          {detail}
        </span>
      )}
    </button>
  );
}
