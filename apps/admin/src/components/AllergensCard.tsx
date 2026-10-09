'use client';
import { useState } from 'react';
import { ALLERGENS } from '@pupbox/content';

/**
 * What a dog could react to in this product. Monthly Boxes warns when a box
 * holds something its dog is allergic to. Same list the dog profile uses.
 */
export default function AllergensCard({ value, onChange, disabled, style }: {
  value: string[]; onChange: (v: string[]) => void; disabled?: boolean; style?: React.CSSProperties;
}) {
  const [other, setOther] = useState('');
  const has = (k: string) => value.some((v) => v.toLowerCase() === k.toLowerCase());
  const toggle = (k: string) => onChange(has(k) ? value.filter((v) => v.toLowerCase() !== k.toLowerCase()) : [...value, k]);
  const extra = value.filter((v) => !ALLERGENS.some((a) => a.key.toLowerCase() === v.toLowerCase()));
  const addOther = () => {
    const v = other.trim();
    if (v && !has(v)) onChange([...value, v[0].toUpperCase() + v.slice(1)]);
    setOther('');
  };
  const chip = (on: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: on ? '1px solid var(--red-300)' : '1px solid var(--slate-200)', background: on ? 'var(--red-50)' : 'var(--white)', color: on ? 'var(--red-700)' : 'var(--slate-600)',
  });
  return (
    <div style={{ ...style, ...(disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}) }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>Allergens</p>
      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '0 0 14px' }}>Tick what this product contains. Monthly Boxes warns when a box holds something its dog is allergic to.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ALLERGENS.map((a) => (
          <button key={a.key} type="button" onClick={() => toggle(a.key)} aria-pressed={has(a.key)} style={chip(has(a.key))}>{a.key}</button>
        ))}
        {extra.map((v) => (
          <button key={v} type="button" onClick={() => toggle(v)} aria-pressed style={chip(true)}>{v} ✕</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input value={other} onChange={(e) => setOther(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOther(); } }}
          placeholder="Other (e.g. Turkey)" style={{ flex: 1, border: '1px solid var(--slate-200)', borderRadius: 9, padding: '7px 12px', fontSize: 13, background: 'var(--white)', color: 'var(--slate-900)' }} />
        <button type="button" onClick={addOther} style={{ border: '1px solid var(--slate-200)', background: 'var(--white)', borderRadius: 9, padding: '7px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--slate-700)' }}>Add</button>
      </div>
    </div>
  );
}
