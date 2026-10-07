'use client';

/**
 * Number field with a custom stepper.
 *
 * Browsers draw their own tiny up/down arrows on input[type=number], which
 * look nothing like the rest of the form and are an awkwardly small target.
 * Those are hidden and replaced with a −/+ pair sized to actually hit, in the
 * same filled, borderless style as the select and the behaviour chips.
 */
export default function NumberField({ value, onChange, min, max, step = 1, prefix, suffix, placeholder, error, width }: {
  value: string | number;
  onChange: (v: string) => void;
  min?: number; max?: number; step?: number;
  prefix?: string; suffix?: string; placeholder?: string; error?: boolean; width?: number | string;
}) {
  const clampAndSet = (next: number) => {
    let v = next;
    if (min !== undefined && v < min) v = min;
    if (max !== undefined && v > max) v = max;
    // Keep one decimal place only where the step actually needs it.
    onChange(String(Number.isInteger(step) ? Math.round(v) : +v.toFixed(2)));
  };
  const bump = (dir: 1 | -1) => clampAndSet((parseFloat(String(value)) || 0) + dir * step);

  const btn: React.CSSProperties = {
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', color: 'var(--slate-400)', cursor: 'pointer',
    fontSize: 14, fontWeight: 700, lineHeight: 1, borderRadius: 6, padding: 0, transition: 'all 0.1s',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, width: width ?? '100%',
      background: 'var(--slate-100)', borderRadius: 8, padding: '2px 4px 2px 10px',
      boxShadow: error ? 'inset 0 0 0 1.5px var(--red-500)' : 'none',
      boxSizing: 'border-box',
    }}>
      {/* Hides the browser's own spinner; the −/+ below replace it. */}
      <style>{'.pb-num::-webkit-outer-spin-button,.pb-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}.pb-num{-moz-appearance:textfield}'}</style>
      {prefix && <span style={{ fontSize: 13, color: 'var(--slate-400)', flexShrink: 0 }}>{prefix}</span>}
      <input
        className="pb-num"
        type="number"
        inputMode="decimal"
        min={min} max={max} step={step}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, fontWeight: 600, color: 'var(--slate-900)', padding: '6px 0',
        }}
      />
      {suffix && <span style={{ fontSize: 12, color: 'var(--slate-400)', flexShrink: 0 }}>{suffix}</span>}
      <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
        <button type="button" tabIndex={-1} aria-label="Decrease" onClick={() => bump(-1)}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--slate-200)'; e.currentTarget.style.color = 'var(--slate-700)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slate-400)'; }}
          style={btn}>−</button>
        <button type="button" tabIndex={-1} aria-label="Increase" onClick={() => bump(1)}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--slate-200)'; e.currentTarget.style.color = 'var(--slate-700)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slate-400)'; }}
          style={btn}>+</button>
      </div>
    </div>
  );
}
