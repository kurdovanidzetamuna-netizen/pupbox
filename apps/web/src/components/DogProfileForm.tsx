'use client';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { ALLERGENS } from '@pupbox/content';
import { FieldError } from '@/components/ui/FormError';
import Field from '@/components/ui/Field';
import { Icon } from '@/components/ui/icons';

/**
 * Tell-us-about-your-dog, as tappable choices rather than a form.
 *
 * Every box is picked per dog, so this is the most important thing a customer
 * ever tells us — but it was a text box asking for comma-separated allergies,
 * and the preference fields that actually drive personalisation
 * (toyPreferences, foodPreferences, chewingStrength) were never collected at
 * all. Choices are pre-set chips people can tap, with a free-text escape
 * hatch, so the common answer takes one tap and the unusual one is still
 * possible.
 */

export interface DogProfile {
  name: string;
  breed: string;
  size: string;
  gender: string;
  weightKg: string;
  /** YYYY-MM-DD, or empty. */
  birthday: string;
  allergies: string[];
  foodPreferences: string[];
  toyPreferences: string[];
  chewingStrength: string;
  specialNotes: string;
}

export const emptyDogProfile: DogProfile = {
  name: '', breed: '', size: '', gender: '', weightKg: '', birthday: '',
  allergies: [], foodPreferences: [], toyPreferences: [], chewingStrength: '', specialNotes: '',
};

/** A saved dog from the API, back into the form's shape. */
export function fromDog(d: any): DogProfile {
  return {
    name: d?.name || '', breed: d?.breed || '', size: d?.size || '', gender: d?.gender || '',
    weightKg: d?.weightKg != null ? String(d.weightKg) : '',
    birthday: d?.birthday ? String(d.birthday).slice(0, 10) : '',
    allergies: d?.allergies || [], foodPreferences: d?.foodPreferences || [], toyPreferences: d?.toyPreferences || [],
    chewingStrength: d?.chewingStrength || '', specialNotes: d?.specialNotes || '',
  };
}

/** Shape the API expects, with the UI's strings coerced and blanks dropped. */
export function toDogPayload(d: DogProfile) {
  return {
    name: d.name.trim(),
    breed: d.breed.trim() || undefined,
    size: d.size || undefined,
    gender: d.gender || undefined,
    weightKg: d.weightKg ? Number(d.weightKg) : undefined,
    // null clears a birthday that was set before.
    birthday: d.birthday || null,
    allergies: d.allergies,
    foodPreferences: d.foodPreferences,
    toyPreferences: d.toyPreferences,
    chewingStrength: d.chewingStrength || undefined,
    specialNotes: d.specialNotes.trim() || undefined,
  };
}


// Values are what the API stores; labels come from translations (dog.size.*, dog.opt.*).
export const SIZES = [
  { value: 'EXTRA_SMALL', emoji: '🐕' },
  { value: 'SMALL', emoji: '🐕' },
  { value: 'MEDIUM', emoji: '🐕‍🦺' },
  { value: 'LARGE', emoji: '🦮' },
  { value: 'EXTRA_LARGE', emoji: '🐕‍🦺' },
];

export const CHEW_LEVELS = [
  { value: 'GENTLE', emoji: '🪶' },
  { value: 'AVERAGE', emoji: '🦴' },
  { value: 'POWER', emoji: '💪' },
];

// The same list products' allergens use, so boxes can be checked against the dog.
export const COMMON_ALLERGIES: string[] = ALLERGENS.map((a) => a.key);
export const FOOD_LIKES = ['Chicken', 'Beef', 'Lamb', 'Fish', 'Peanut butter', 'Cheese', 'Grain-free', 'Dental chews'];
export const TOY_LIKES = ['Squeaky', 'Plush', 'Rope', 'Ball', 'Puzzle', 'Tug', 'Fetch', 'Chew'];

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[13px] font-bold text-gray-900">{title}</span>
        {hint && <span className="text-[11.5px] text-gray-400">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

/** Tap-to-toggle chip. Used for every multi-select so they behave identically. */
export function Chip({ active, onClick, children, tone = 'teal' }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: 'teal' | 'red' }) {
  const on = tone === 'red'
    ? 'bg-red-50 text-red-700 ring-red-300'
    : 'bg-teal-50 text-teal-700 ring-teal-400';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 px-3 rounded-full inline-flex items-center gap-1 text-[12.5px] font-semibold ring-1 ring-inset transition ${active ? on : 'bg-gray-100/80 text-gray-700 ring-transparent hover:bg-gray-100'}`}
    >
      {active && <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.6} />}{children}
    </button>
  );
}

/** Chips plus a free-text field, so an unlisted answer is still possible. */
export function ChipGroup({ options, selected, onChange, tone = 'teal', addLabel }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; tone?: 'teal' | 'red'; addLabel: string;
}) {
  const { t } = useLanguage();
  const [custom, setCustom] = useState('');
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const addCustom = () => {
    const v = custom.trim();
    if (!v) return;
    // Case-insensitive so "chicken" doesn't become a second entry beside "Chicken".
    if (!selected.some((s) => s.toLowerCase() === v.toLowerCase())) onChange([...selected, v]);
    setCustom('');
  };
  const extras = selected.filter((s) => !options.some((o) => o.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => <Chip key={o} active={selected.includes(o)} onClick={() => toggle(o)} tone={tone}>{t(`dog.opt.${o}`, o)}</Chip>)}
        {extras.map((e) => <Chip key={e} active onClick={() => toggle(e)} tone={tone}>{e}</Chip>)}
      </div>
      <div className="flex gap-1.5 mt-2 max-w-sm">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={addLabel}
          className="flex-1 h-9 rounded-full bg-gray-100/80 px-3.5 text-[12.5px] outline-none hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-teal-300"
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()} aria-label={t('dog.add')} title={t('dog.add')}
          className="w-9 h-9 shrink-0 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-40 flex items-center justify-center"><Icon name="plus" className="w-4 h-4" strokeWidth={2.4} /></button>
      </div>
    </div>
  );
}


/** Five soft tiles, the pup growing with each; the weight range under each name. */
export function SizePicker({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const { t } = useLanguage();
  return (
    <div className={`grid grid-cols-3 sm:grid-cols-5 gap-1.5 rounded-xl ${error ? 'ring-2 ring-red-200 ring-offset-2' : ''}`} aria-invalid={!!error} tabIndex={error ? -1 : undefined}>
      {SIZES.map((s, k) => {
        const active = value === s.value;
        return (
          <button key={s.value} type="button" onClick={() => onChange(active ? '' : s.value)} aria-pressed={active} title={t(`dog.sizeHint.${s.value}`)}
            className={`relative rounded-[14px] px-2 py-2 flex flex-col items-center text-center ring-1 ring-inset transition ${active ? 'bg-teal-50 ring-teal-400 text-teal-800' : 'bg-gray-100/80 ring-transparent text-gray-700 hover:bg-gray-100'}`}>
            <span aria-hidden="true" className="leading-none" style={{ fontSize: `${14 + k * 2.5}px` }}>{s.emoji}</span>
            <span className="mt-1 text-[12px] font-bold leading-tight">{t(`dog.size.${s.value}`)}</span>
            <span className="text-[10.5px] text-gray-500 leading-tight">{t(`dog.sizeHint.${s.value}`)}</span>
            {active && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center"><Icon name="check" className="w-2.5 h-2.5" strokeWidth={3.2} /></span>}
          </button>
        );
      })}
    </div>
  );
}

/** Gentle, average or power chewer, as three emoji pills. */
export function ChewPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-1.5">
      {CHEW_LEVELS.map((c) => {
        const active = value === c.value;
        return (
          <button key={c.value} type="button" onClick={() => onChange(active ? '' : c.value)} aria-pressed={active} title={t(`dog.chewHint.${c.value}`)}
            className={`h-9 pl-2 pr-3 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-semibold ring-1 ring-inset transition ${active ? 'bg-teal-50 text-teal-700 ring-teal-400' : 'bg-gray-100/80 text-gray-700 ring-transparent hover:bg-gray-100'}`}>
            <span className="text-[16px] leading-none" aria-hidden="true">{c.emoji}</span>{t(`dog.chew.${c.value}`)}
          </button>
        );
      })}
    </div>
  );
}

export default function DogProfileForm({ value, onChange, showOptional = true, compact = false, nameError, sizeError }: {
  value: DogProfile;
  onChange: (d: DogProfile) => void;
  /** Hide the preference sections where a shorter form matters more. */
  showOptional?: boolean;
  /**
   * Checkout: ask only what a first box needs (name, size, allergies) and
   * fold the rest behind "Tell us more". Allergies stay visible because
   * getting them wrong is a safety problem, not a personalisation one.
   */
  compact?: boolean;
  nameError?: string;
  /** When the size is required (a gift) and missing. */
  sizeError?: string;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const set = <K extends keyof DogProfile>(k: K, v: DogProfile[K]) => onChange({ ...value, [k]: v });
  const allergySet = new Set(value.allergies.map((a) => a.toLowerCase()));
  const hiddenFoods = FOOD_LIKES.filter((f) => allergySet.has(f.toLowerCase()));
  const showDetails = !compact || expanded;

  return (
    <div className="space-y-5">
      <div className={`grid gap-4 ${showDetails ? 'sm:grid-cols-2' : ''}`}>
        <Field id="dog-name" label={t('dog.name')} required value={value.name} onChange={(v) => set('name', v)} error={nameError} hint={!nameError ? t('dog.namePh') : undefined} />
        {showDetails && (
          <Field id="dog-breed" label={t('dog.breed')} value={value.breed} onChange={(v) => set('breed', v)} hint={t('dog.breedPh')} />
        )}
      </div>

      <Section title={t('dog.size')} hint={t('dog.sizeHint')}>
        <SizePicker value={value.size} onChange={(v) => set('size', v)} error={sizeError} />
        <FieldError message={sizeError} />
      </Section>

      <Section title={t('dog.allergies')} hint={t('dog.allergiesHint')}>
        <ChipGroup
          options={COMMON_ALLERGIES}
          selected={value.allergies}
          onChange={(allergies) => {
            // Marking something as an allergy must also drop it from the
            // favourites — otherwise the two lists contradict each other and
            // we could ship food the dog reacts to.
            const blocked = new Set(allergies.map((a) => a.toLowerCase()));
            onChange({
              ...value,
              allergies,
              foodPreferences: value.foodPreferences.filter((f) => !blocked.has(f.toLowerCase())),
            });
          }}
          tone="red"
          addLabel={t('dog.allergiesAdd')}
        />
      </Section>

      {compact && (
        <button type="button" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}
          className="h-9 px-3.5 rounded-full bg-teal-50 text-[13px] font-semibold text-teal-700 hover:bg-teal-100 inline-flex items-center gap-1.5">
          <Icon name={expanded ? 'minus' : 'plus'} className="w-4 h-4" strokeWidth={2.4} />{expanded ? t('dog.less') : t('dog.more')}
        </button>
      )}

      {showDetails && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Section title={t('dog.gender')}>
            <div className="flex gap-2">
              {[{ v: 'MALE', k: 'dog.male' }, { v: 'FEMALE', k: 'dog.female' }].map((g) => (
                <Chip key={g.v} active={value.gender === g.v} onClick={() => set('gender', value.gender === g.v ? '' : g.v)}>{t(g.k)}</Chip>
              ))}
            </div>
          </Section>
          <Field id="dog-weight" type="number" inputMode="decimal" label={t('dog.weight')} value={value.weightKg} onChange={(v) => set('weightKg', v)}
            trailing={<span className="text-[12px] text-gray-400">{t('dog.kg')}</span>} />
          <Field id="dog-birthday" type="date" label={t('dog.birthday')} value={value.birthday} onChange={(v) => set('birthday', v)} />
        </div>
      )}

      {showDetails && showOptional && (
        <>
          <Section title={t('dog.food')} hint={t('dog.foodHint')}>
            <ChipGroup
              // An allergen is never offered as a favourite.
              options={FOOD_LIKES.filter((f) => !allergySet.has(f.toLowerCase()))}
              selected={value.foodPreferences}
              onChange={(v) => set('foodPreferences', v.filter((f) => !allergySet.has(f.toLowerCase())))}
              addLabel={t('dog.foodAdd')}
            />
            {hiddenFoods.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {fill(t('dog.foodHidden'), { list: hiddenFoods.map((f) => t(`dog.opt.${f}`, f)).join(', ') })}
              </p>
            )}
          </Section>

          <Section title={t('dog.toys')} hint={t('dog.optional')}>
            <ChipGroup options={TOY_LIKES} selected={value.toyPreferences} onChange={(v) => set('toyPreferences', v)} addLabel={t('dog.toysAdd')} />
          </Section>

          <Section title={t('dog.chew')} hint={t('dog.chewHint')}>
            <ChewPicker value={value.chewingStrength} onChange={(v) => set('chewingStrength', v)} />
          </Section>

          <Section title={t('dog.notes')} hint={t('dog.optional')}>
            <textarea value={value.specialNotes} onChange={(e) => set('specialNotes', e.target.value)} rows={2} maxLength={500}
              className="w-full rounded-xl bg-gray-100/80 px-3.5 py-3 text-[13px] text-gray-900 outline-none resize-y hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-teal-300" placeholder={t('dog.notesPh')} />
          </Section>
        </>
      )}
    </div>
  );
}
