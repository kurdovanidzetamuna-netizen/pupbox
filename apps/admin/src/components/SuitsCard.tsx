'use client';

export type Suits = { dogSizes: string[]; lifeStages: string[]; goodFor: string; goodForKa: string };
export const EMPTY_SUITS: Suits = { dogSizes: [], lifeStages: [], goodFor: '', goodForKa: '' };

export const suitsFromProduct = (p: any): Suits => ({
  dogSizes: p?.dogSizes ?? [], lifeStages: p?.lifeStages ?? [],
  goodFor: p?.goodFor ?? '', goodForKa: p?.translations?.ka?.goodFor ?? '',
});

const SIZES = [
  ['EXTRA_SMALL', 'XS · under 5 kg'], ['SMALL', 'S · 5–10 kg'], ['MEDIUM', 'M · 10–25 kg'], ['LARGE', 'L · 25–40 kg'], ['EXTRA_LARGE', 'XL · 40+ kg'],
] as const;
const AGES = [['PUPPY', 'Puppy'], ['ADULT', 'Adult'], ['SENIOR', 'Senior']] as const;

/**
 * Who the product suits: dog sizes and ages (none ticked = every dog) and a
 * short "good for" line in both languages. Shown on the product page, and
 * the shop's "my dog's size" filter uses the sizes.
 */
export default function SuitsCard({ value, onChange, style }: { value: Suits; onChange: (v: Suits) => void; style?: React.CSSProperties }) {
  const toggle = (key: 'dogSizes' | 'lifeStages', k: string) =>
    onChange({ ...value, [key]: value[key].includes(k) ? value[key].filter((x) => x !== k) : [...value[key], k] });
  const chip = (on: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: on ? '1px solid var(--teal-600)' : '1px solid var(--slate-200)', background: on ? 'var(--teal-50b, #effaf6)' : 'var(--white)', color: on ? 'var(--teal-700, #0f766e)' : 'var(--slate-600)',
  });
  const input: React.CSSProperties = { width: '100%', border: '1px solid var(--slate-200)', borderRadius: 9, padding: '8px 12px', fontSize: 13, background: 'var(--white)', color: 'var(--slate-900)' };
  return (
    <div style={style}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>Who it’s for</p>
      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '0 0 14px' }}>Leave sizes or ages unticked if it suits every dog. Shown on the product page; the shop’s size filter uses the sizes.</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', margin: '0 0 8px' }}>Dog size</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SIZES.map(([k, label]) => <button key={k} type="button" aria-pressed={value.dogSizes.includes(k)} onClick={() => toggle('dogSizes', k)} style={chip(value.dogSizes.includes(k))}>{label}</button>)}
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', margin: '14px 0 8px' }}>Age</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {AGES.map(([k, label]) => <button key={k} type="button" aria-pressed={value.lifeStages.includes(k)} onClick={() => toggle('lifeStages', k)} style={chip(value.lifeStages.includes(k))}>{label}</button>)}
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', margin: '14px 0 8px' }}>Good for (one short line)</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input style={input} maxLength={160} value={value.goodFor} onChange={(e) => onChange({ ...value, goodFor: e.target.value })} placeholder="🇬🇧 e.g. Strong chewers and training rewards" />
        <input style={input} maxLength={160} value={value.goodForKa} onChange={(e) => onChange({ ...value, goodForKa: e.target.value })} placeholder="🇬🇪 მაგ. ძლიერი მღრღნელები, წვრთნის ჯილდო" />
      </div>
    </div>
  );
}
