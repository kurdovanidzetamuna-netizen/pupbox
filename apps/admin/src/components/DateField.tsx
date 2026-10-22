'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const parse = (v: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ''); return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null; };
export const todayIso = () => { const n = new Date(); return iso(n.getFullYear(), n.getMonth(), n.getDate()); };
/** Today plus some days, as YYYY-MM-DD. */
export const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
export const showDate = (v: string) => { const p = parse(v); return p ? `${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}` : ''; };

/**
 * A date that opens a small calendar — never the browser's own date box.
 * `value` is YYYY-MM-DD or '' (shown as `emptyLabel`, e.g. "No end date").
 * Quick picks (in 7 days, in a month…) sit under the calendar.
 */
export default function DateField({ value, onChange, min, max, emptyLabel = 'Pick a date', quick = [], clearable = true, ariaLabel, compact, disabled }: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  /** Smaller, for filter bars. */
  compact?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  quick?: { label: string; value: string }[];
  clearable?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = parse(value) ?? parse(min && min > todayIso() ? min : todayIso())!;
  const [cur, setCur] = useState({ y: base.y, m: base.m });
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const w = 296, h = pop.current?.offsetHeight ?? 380;
      const up = r.bottom + h + 8 > window.innerHeight && r.top - h - 8 > 0;
      setPos({ top: up ? r.top - h - 6 : r.bottom + 6, left: Math.min(Math.max(8, r.left), window.innerWidth - w - 8) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, cur]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { const n = e.target as Node; if (!pop.current?.contains(n) && !trigger.current?.contains(n)) setOpen(false); };
    // Esc closes only the calendar, not the drawer it sits in.
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', down);
    window.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key, true); };
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };
  const first = (new Date(cur.y, cur.m, 1).getDay() + 6) % 7;
  const days = new Date(cur.y, cur.m + 1, 0).getDate();
  const move = (d: number) => setCur((c) => { const m = c.m + d; return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });
  const today = todayIso();
  const nav = { width: 32, height: 32, border: 'none', borderRadius: 9, background: 'var(--slate-100)', color: 'var(--slate-700)', cursor: 'pointer', fontSize: 15, fontWeight: 800 } as const;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button ref={trigger} type="button" aria-label={ariaLabel} disabled={disabled} aria-haspopup="dialog" aria-expanded={open}
          onClick={() => { const b = parse(value) ?? base; setCur({ y: b.y, m: b.m }); setOpen((o) => !o); }}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: compact ? 7 : 10, minHeight: compact ? 34 : 44, padding: compact ? '0 10px' : '0 12px', borderRadius: compact ? 10 : 12, cursor: disabled ? 'default' : 'pointer', textAlign: 'left', opacity: disabled ? 0.55 : 1,
            border: `1.5px solid ${open ? 'var(--teal-400)' : 'var(--slate-200)'}`, background: 'var(--white)', boxShadow: open ? '0 0 0 3px var(--teal-100)' : 'none' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: value ? 'var(--teal-600)' : 'var(--slate-400)', flexShrink: 0 }} aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
          <span style={{ fontSize: compact ? 12.5 : 14, fontWeight: value ? 700 : 500, color: value ? 'var(--slate-900)' : 'var(--slate-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ? showDate(value) : emptyLabel}</span>
        </button>
        {clearable && value && !disabled && (
          <button type="button" onClick={() => onChange('')} aria-label="Clear date" title="Clear"
            style={{ width: compact ? 28 : 36, height: compact ? 28 : 36, flexShrink: 0, border: 'none', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-500)', cursor: 'pointer', fontSize: 16 }}>×</button>
        )}
      </div>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={pop} role="dialog" aria-label="Choose a date"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 200, width: 296, background: 'var(--white)', borderRadius: 18, padding: 14, boxShadow: '0 20px 50px -12px rgba(15,23,42,.35)', border: '1px solid var(--slate-200b, var(--slate-200))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => move(-1)} aria-label="Previous month" style={nav}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--slate-900)' }}>{MONTHS[cur.m]} {cur.y}</span>
            <button type="button" onClick={() => move(1)} aria-label="Next month" style={nav}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {DAYS.map((d) => <span key={d} style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--slate-400)', textAlign: 'center', padding: '4px 0' }}>{d}</span>)}
            {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const v = iso(cur.y, cur.m, i + 1);
              const off = (!!min && v < min) || (!!max && v > max), on = v === value, isToday = v === today;
              return (
                <button key={v} type="button" disabled={off} onClick={() => pick(v)} aria-pressed={on}
                  style={{ height: 36, border: 'none', borderRadius: 10, cursor: off ? 'default' : 'pointer', fontSize: 13, fontWeight: on || isToday ? 800 : 600,
                    background: on ? 'var(--teal-600)' : 'transparent', color: on ? 'var(--white)' : off ? 'var(--slate-300)' : isToday ? 'var(--teal-700)' : 'var(--slate-800)',
                    boxShadow: isToday && !on ? 'inset 0 0 0 1.5px var(--teal-300)' : 'none' }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {quick.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--slate-100)' }}>
              {quick.map((q) => (
                <button key={q.label} type="button" onClick={() => pick(q.value)}
                  style={{ padding: '6px 10px', borderRadius: 99, border: 'none', background: q.value === value ? 'var(--teal-50)' : 'var(--slate-100)', color: q.value === value ? 'var(--teal-800)' : 'var(--slate-600)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

/** Drop-in for the old <input type="date"> in filter bars: value, onChange(e), min, max. */
export function DateInput({ value, onChange, min, max, disabled, 'aria-label': ariaLabel, emptyLabel = 'Any date', clearable = true }: {
  value: string; onChange: (e: any) => void; min?: string; max?: string; disabled?: boolean; 'aria-label'?: string; emptyLabel?: string; clearable?: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', minWidth: 150 }}>
      <DateField compact value={value} onChange={(v) => onChange({ target: { value: v } })} min={min} max={max} disabled={disabled} ariaLabel={ariaLabel} emptyLabel={emptyLabel} clearable={clearable}
        quick={[{ label: 'Today', value: todayIso() }, { label: '7 days ago', value: inDays(-7) }, { label: '30 days ago', value: inDays(-30) }]} />
    </span>
  );
}
