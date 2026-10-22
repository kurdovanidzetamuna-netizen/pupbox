'use client';
import FormField, { inputClass } from '@/components/FormField';
import { NumInput } from '@/components/NumberField';

/** The form's view of a product's personalisation: what the customer chooses before adding to cart. */
export interface PersonalisationForm { engrave: boolean; engraveMax: string; sizes: string }

export const EMPTY_PERSONALISATION: PersonalisationForm = { engrave: false, engraveMax: '12', sizes: '' };

/** From the product as the API returns it. */
export function personalisationFromProduct(p: any): PersonalisationForm {
  return {
    engrave: !!p?.personalisation?.engraving,
    engraveMax: String(p?.personalisation?.engraving?.maxLength ?? 12),
    sizes: (p?.personalisation?.sizes ?? []).join(', '),
  };
}

/** What the API expects: { engraving?, sizes? }, or null for nothing to choose. */
export function personalisationPayload(f: PersonalisationForm) {
  const sizes = f.sizes.split(',').map((x) => x.trim()).filter(Boolean);
  if (!f.engrave && !sizes.length) return null;
  return {
    ...(f.engrave ? { engraving: { maxLength: Number(f.engraveMax) || 12 } } : {}),
    ...(sizes.length ? { sizes } : {}),
  };
}

/** The same card on "New product" and "Edit product". */
export default function PersonalisationCard({ value, onChange, disabled, style }: {
  value: PersonalisationForm;
  onChange: (v: PersonalisationForm) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const set = (patch: Partial<PersonalisationForm>) => onChange({ ...value, ...patch });
  return (
    <div style={{ ...style, ...(disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}) }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px' }}>Personalisation</p>
      <p style={{ fontSize: 11, color: 'var(--slate-400)', margin: '0 0 14px' }}>What the customer must choose before adding this to the cart. It appears on the order for packing.</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate-600)', cursor: 'pointer', flexWrap: 'wrap' }}>
        <input type="checkbox" checked={value.engrave} onChange={(e) => set({ engrave: e.target.checked })} disabled={disabled} />
        Customer writes a name to engrave, up to
        <NumInput style={{ ...inputClass(), width: 64, padding: '4px 8px' }} min="1" max="40" value={value.engraveMax}
          onChange={(e) => set({ engraveMax: e.target.value })} disabled={disabled || !value.engrave} aria-label="Most characters" />
        characters
      </label>
      <div style={{ marginTop: 12 }}>
        <FormField label="Sizes to choose from (comma separated, empty = no size choice)">
          <input style={inputClass()} value={value.sizes} onChange={(e) => set({ sizes: e.target.value })} placeholder="S, M, L" disabled={disabled} />
        </FormField>
      </div>
    </div>
  );
}
