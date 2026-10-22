'use client';
import type { CSSProperties, ReactNode } from 'react';

/**
 * A number typed as text — no browser spinner arrows. Optional ₾ / % / "months"
 * around it, and soft − / + buttons for small counts. `value` is the text as
 * typed ('' = empty, which the caller reads as "no limit" / "none").
 */
export default function NumberField({ value, onChange, prefix, suffix, placeholder, decimals = false, min = 0, max, step = 1, stepper = false, invalid, id, ariaLabel, style }: {
  value: string;
  onChange: (v: string) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  placeholder?: string;
  /** Allow money like 12.50. */
  decimals?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** − / + buttons either side. */
  stepper?: boolean;
  invalid?: boolean;
  id?: string;
  ariaLabel?: string;
  style?: CSSProperties;
}) {
  const clean = (raw: string) => {
    let v = raw.replace(',', '.').replace(decimals ? /[^\d.]/g : /\D/g, '');
    if (decimals) { const [a, ...b] = v.split('.'); v = b.length ? `${a}.${b.join('').slice(0, 2)}` : a; }
    return v.replace(/^0+(?=\d)/, '');
  };
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, n));
  const bump = (d: number) => {
    const n = value === '' ? (d > 0 ? Math.max(min, step) : min) : clamp(Number(value) + d);
    onChange(String(+n.toFixed(2)));
  };
  const btn: CSSProperties = { width: 34, height: 34, flexShrink: 0, border: 'none', borderRadius: 10, background: 'var(--slate-100)', color: 'var(--slate-700)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 };
  const affix: CSSProperties = { fontSize: 13.5, fontWeight: 700, color: 'var(--slate-400)', flexShrink: 0, whiteSpace: 'nowrap' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, padding: stepper ? '4px 5px' : '0 12px', borderRadius: 12, background: invalid ? 'var(--red-50)' : 'var(--white)', border: `1.5px solid ${invalid ? 'var(--red-300)' : 'var(--slate-200)'}`, boxSizing: 'border-box', ...style }}
      className="nf-box">
      <style>{'.nf-box:focus-within{border-color:var(--teal-400)!important;box-shadow:0 0 0 3px var(--teal-100)}'}</style>
      {stepper && <button type="button" aria-label="Less" onClick={() => bump(-step)} disabled={value === '' || Number(value) <= min} style={{ ...btn, opacity: value === '' || Number(value) <= min ? 0.4 : 1 }}>−</button>}
      {prefix && <span style={affix}>{prefix}</span>}
      <input id={id} aria-label={ariaLabel} type="text" inputMode={decimals ? 'decimal' : 'numeric'} value={value} placeholder={placeholder}
        onChange={(e) => onChange(clean(e.target.value))}
        onBlur={() => { if (value !== '' && (Number(value) < min || (max !== undefined && Number(value) > max))) onChange(String(clamp(Number(value)))); }}
        style={{ flex: 1, minWidth: 0, width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', textAlign: stepper ? 'center' : 'left', padding: '10px 0', fontVariantNumeric: 'tabular-nums' }} />
      {suffix && <span style={affix}>{suffix}</span>}
      {stepper && <button type="button" aria-label="More" onClick={() => bump(step)} disabled={max !== undefined && Number(value) >= max} style={btn}>+</button>}
    </div>
  );
}

/**
 * Drop-in for a plain number box: same props as the old <input type="number">
 * (value, onChange(e), min, max, step, style…), typed as text so the browser
 * never draws its spinner arrows. Decimals only when `step` has them.
 */
export function NumInput({ value, onChange, min, max, step, style, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'min' | 'max' | 'step'> & {
  /** Gets `{ target: { value } }`, like the old field's change event. */
  onChange?: (e: any) => void;
  min?: number | string; max?: number | string; step?: number | string;
}) {
  const decimals = step !== undefined && !Number.isInteger(Number(step));
  const lo = min === undefined || min === '' ? undefined : Number(min);
  const hi = max === undefined || max === '' ? undefined : Number(max);
  const negative = lo === undefined || lo < 0;
  const clean = (raw: string) => {
    const neg = negative && raw.trim().startsWith('-');
    let v = raw.replace(',', '.').replace(decimals ? /[^\d.]/g : /\D/g, '');
    if (decimals) { const [a, ...b] = v.split('.'); v = b.length ? `${a}.${b.join('')}` : a; }
    return (neg ? '-' : '') + v;
  };
  return (
    <input {...rest} type="text" inputMode={decimals ? 'decimal' : 'numeric'} value={value ?? ''}
      onChange={(e) => onChange?.({ target: { value: clean(e.target.value) } })}
      onBlur={(e) => {
        const n = Number(value);
        if (value !== '' && value !== undefined && Number.isFinite(n) && ((lo !== undefined && n < lo) || (hi !== undefined && n > hi))) {
          onChange?.({ target: { value: String(Math.min(hi ?? Infinity, Math.max(lo ?? -Infinity, n))) } });
        }
        rest.onBlur?.(e);
      }}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }} />
  );
}
