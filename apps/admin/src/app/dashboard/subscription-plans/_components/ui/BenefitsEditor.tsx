'use client';
import { useState } from 'react';
import { inputClass } from '@/components/FormField';

/**
 * Benefits are the bullet list customers read on the pricing card, but they
 * were edited as newline-separated text in a textarea. Here each one is its
 * own row that can be reordered or removed, with one-tap presets for the
 * lines nearly every plan uses.
 */
const BENEFIT_PRESETS = ['Free delivery', 'Cancel anytime', '5–8 products per box', 'Priority support', 'Exclusive items', 'Personalised to your dog'];

export default function BenefitsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const lines = value.split('\n').map(l => l.trim()).filter(Boolean);
  const [draft, setDraft] = useState('');
  const commit = (next: string[]) => onChange(next.join('\n'));
  const add = (text: string) => {
    const v = text.trim();
    if (!v || lines.some(l => l.toLowerCase() === v.toLowerCase())) return;
    commit([...lines, v]);
    setDraft('');
  };
  const move = (i: number, by: number) => {
    const next = [...lines];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const unused = BENEFIT_PRESETS.filter(p => !lines.some(l => l.toLowerCase() === p.toLowerCase()));

  return (
    <div>
      {lines.length > 0 && (
        <div style={{ border: '1px solid var(--slate-200)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
          {lines.map((l, i) => (
            <div key={`${l}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--white)', borderBottom: i < lines.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>
              <span style={{ color: 'var(--teal-600)', fontWeight: 700, fontSize: 13 }}>✓</span>
              <input
                value={l}
                onChange={e => { const next = [...lines]; next[i] = e.target.value; commit(next); }}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: 'var(--slate-800)', background: 'transparent' }}
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
                style={{ border: 'none', background: 'transparent', cursor: i === 0 ? 'default' : 'pointer', color: 'var(--slate-300)', fontSize: 11, padding: '0 2px' }}>▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === lines.length - 1} title="Move down"
                style={{ border: 'none', background: 'transparent', cursor: i === lines.length - 1 ? 'default' : 'pointer', color: 'var(--slate-300)', fontSize: 11, padding: '0 2px' }}>▼</button>
              <button type="button" onClick={() => commit(lines.filter((_, x) => x !== i))} title="Remove"
                style={{ border: 'none', background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '2px 7px' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
          placeholder="Add a benefit and press Enter…"
          style={{ ...inputClass(), flex: 1 }}
        />
        <button type="button" onClick={() => add(draft)} disabled={!draft.trim()}
          style={{ border: '1px solid var(--slate-200)', background: 'var(--white)', color: 'var(--slate-600)', borderRadius: 9, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: draft.trim() ? 'pointer' : 'default', opacity: draft.trim() ? 1 : 0.5 }}>
          Add
        </button>
      </div>

      {unused.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>Quick add:</span>
          {unused.map(p => (
            <button key={p} type="button" onClick={() => add(p)}
              style={{ border: '1px dashed var(--slate-300)', background: 'transparent', color: 'var(--slate-500)', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, cursor: 'pointer' }}>
              + {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
