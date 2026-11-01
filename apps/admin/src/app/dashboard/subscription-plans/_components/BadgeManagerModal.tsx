import { useState } from 'react';
import { DEFAULT_BADGES } from '../_lib/constants';
import type { Badge } from '../_hooks/useBadges';

/**
 * Every badge, with its Georgian name for the site; custom ones can be added
 * or removed. The draft English name is owned by the page, so text typed here
 * survives closing and reopening.
 */
export default function BadgeManagerModal({ labels, addBadge, removeBadge, setKa, error, input, setInput, onClose }: {
  labels: Badge[];
  addBadge: (en: string, ka?: string) => void;
  removeBadge: (en: string) => void;
  setKa: (en: string, ka: string) => void;
  error?: string;
  input: string;
  setInput: (v: string) => void;
  onClose: () => void;
}) {
  const [ka, setKaDraft] = useState('');
  const add = () => {
    const en = input.trim();
    if (!en) return;
    addBadge(en, ka);
    setInput(''); setKaDraft('');
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-label="Manage badges" style={{ background: 'var(--white)', borderRadius: 18, width: 520, maxWidth: '95vw', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>🏷️ Badges</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 8px', borderRadius: 8 }}>×</button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--slate-500)', margin: '0 0 14px' }}>The label on a plan card. The site shows the Georgian name to Georgian visitors. Shared by everyone in admin.</p>

        <div style={{ border: '1.5px solid var(--slate-200)', borderRadius: 12, overflow: 'hidden', marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
          {labels.map((b, i) => {
            const builtIn = DEFAULT_BADGES.includes(b.en);
            return (
              <div key={b.en} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: i < labels.length - 1 ? '1px solid var(--slate-100)' : 'none', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)', flex: '1 1 120px' }}>
                  {b.en}{builtIn && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', background: 'var(--slate-100)', borderRadius: 4, padding: '1px 6px' }}>built-in</span>}
                </span>
                <input defaultValue={b.ka} onBlur={(e) => { if (e.target.value.trim() !== b.ka) setKa(b.en, e.target.value.trim()); }} maxLength={30}
                  placeholder="🇬🇪 Georgian name" aria-label={`${b.en} in Georgian`}
                  style={{ flex: '1 1 150px', padding: '6px 10px', fontSize: 13, border: `1.5px solid ${b.ka ? 'var(--slate-200)' : 'var(--amber-300)'}`, borderRadius: 8, outline: 'none' }} />
                {!builtIn
                  ? <button type="button" onClick={() => removeBadge(b.en)} style={{ background: 'var(--red-50)', border: 'none', color: 'var(--red-600)', cursor: 'pointer', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '4px 8px' }}>Remove</button>
                  : <span style={{ width: 62 }} />}
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-700)', margin: '0 0 8px' }}>Add a badge</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') onClose(); }}
            maxLength={30} placeholder="🇬🇧 e.g. Flash Sale" aria-label="New badge in English"
            style={{ flex: '1 1 140px', padding: '7px 12px', fontSize: 13, border: '1.5px solid var(--slate-200)', borderRadius: 9, outline: 'none' }} />
          <input value={ka} onChange={e => setKaDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }}
            maxLength={30} placeholder="🇬🇪 მაგ. ფლეშ ფასდაკლება" aria-label="New badge in Georgian"
            style={{ flex: '1 1 140px', padding: '7px 12px', fontSize: 13, border: '1.5px solid var(--slate-200)', borderRadius: 9, outline: 'none' }} />
          <button type="button" onClick={add} disabled={!input.trim()}
            style={{ padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 9, border: 'none', background: 'var(--teal-600)', color: 'var(--white)', cursor: 'pointer', opacity: input.trim() ? 1 : 0.5 }}>+ Add</button>
        </div>
        {error && <p role="alert" style={{ color: 'var(--red-600)', fontSize: 12.5, fontWeight: 600, margin: '10px 0 0' }}>{error}</p>}
      </div>
    </div>
  );
}
