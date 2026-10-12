'use client';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { ALLERGENS } from '@pupbox/content';
import { FieldError } from '@/components/ui/FormError';

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
const SIZES = [
  { value: 'EXTRA_SMALL', emoji: '🐕' },
  { value: 'SMALL', emoji: '🐕' },
  { value: 'MEDIUM', emoji: '🐕‍🦺' },
  { value: 'LARGE', emoji: '🦮' },
  { value: 'EXTRA_LARGE', emoji: '🐕‍🦺' },
];

const CHEW_LEVELS = [
  { value: 'GENTLE', emoji: '🪶' },
  { value: 'AVERAGE', emoji: '🦴' },
  { value: 'POWER', emoji: '💪' },
];

// The same list products' allergens use, so boxes can be checked against the dog.
const COMMON_ALLERGIES: string[] = ALLERGENS.map((a) => a.key);
const FOOD_LIKES = ['Chicken', 'Beef', 'Lamb', 'Fish', 'Peanut butter', 'Cheese', 'Grain-free', 'Dental chews'];
const TOY_LIKES = ['Squeaky', 'Plush', 'Rope', 'Ball', 'Puzzle', 'Tug', 'Fetch', 'Chew'];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
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
function Chip({ active, onClick, children, tone = 'teal' }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: 'teal' | 'red' }) {
  const on = tone === 'red'
    ? 'border-red-400 bg-red-50 text-red-700'
    : 'border-teal-500 bg-teal-50 text-teal-700';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 px-3 rounded-full text-[12.5px] font-semibold border transition ${active ? on : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
    >
      {active && <span className="mr-1">✓</span>}{children}
    </button>
  );
}

/** Chips plus a free-text field, so an unlisted answer is still possible. */
function ChipGroup({ options, selected, onChange, tone = 'teal', addLabel }: {
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
          className="flex-1 h-8 border border-gray-200 rounded-full px-3 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()} aria-label={t('dog.add')} title={t('dog.add')}
          className="w-8 h-8 shrink-0 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-40 flex items-center justify-center text-[18px] leading-none">+</button>
      </div>
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
  const field = 'w-full h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400';
  const allergySet = new Set(value.allergies.map((a) => a.toLowerCase()));
  const hiddenFoods = FOOD_LIKES.filter((f) => allergySet.has(f.toLowerCase()));
  const showDetails = !compact || expanded;

  return (
    <div className="space-y-5">
      <div className={`grid gap-4 ${showDetails ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <label htmlFor="dog-name" className="text-[13px] font-bold text-gray-900 block mb-2">{t('dog.name')} <span className="text-teal-600">*</span></label>
          <input id="dog-name" value={value.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!nameError}
            className={`${field} ${nameError ? 'border-red-400 bg-red-50' : ''}`} placeholder={t('dog.namePh')} />
          <FieldError message={nameError} />
        </div>
        {showDetails && (
          <div>
            <label htmlFor="dog-breed" className="text-[13px] font-bold text-gray-900 block mb-2">{t('dog.breed')}</label>
            <input id="dog-breed" value={value.breed} onChange={(e) => set('breed', e.target.value)} className={field} placeholder={t('dog.breedPh')} />
          </div>
        )}
      </div>

      <Section title={t('dog.size')} hint={t('dog.sizeHint')}>
        <div className={`flex flex-wrap gap-1.5 rounded-xl ${sizeError ? 'ring-2 ring-red-200 ring-offset-2' : ''}`} aria-invalid={!!sizeError} tabIndex={sizeError ? -1 : undefined}>
          {SIZES.map((s) => {
            const active = value.size === s.value;
            return (
              <button key={s.value} type="button" onClick={() => set('size', active ? '' : s.value)} aria-pressed={active} title={t(`dog.sizeHint.${s.value}`)}
                className={`h-9 pl-2 pr-3 rounded-full border inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition ${active ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                <span className="text-[16px] leading-none" aria-hidden="true">{s.emoji}</span>
                {t(`dog.size.${s.value}`)}
                <span className="text-[11px] font-normal text-gray-400">{t(`dog.sizeHint.${s.value}`)}</span>
              </button>
            );
          })}
        </div>
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
          className="text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1.5">
          <span aria-hidden="true">{expanded ? '−' : '+'}</span>{expanded ? t('dog.less') : t('dog.more')}
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
          <Section title={t('dog.weight')}>
            <div className="relative">
              <input type="number" min="0" step="0.1" value={value.weightKg} onChange={(e) => set('weightKg', e.target.value)} className={`${field} pr-10`} placeholder="18" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('dog.kg')}</span>
            </div>
          </Section>
          <Section title={t('dog.birthday')}>
            <input type="date" value={value.birthday} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('birthday', e.target.value)} className={field} />
          </Section>
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
            <div className="flex flex-wrap gap-1.5">
              {CHEW_LEVELS.map((c) => {
                const active = value.chewingStrength === c.value;
                return (
                  <button key={c.value} type="button" onClick={() => set('chewingStrength', active ? '' : c.value)} aria-pressed={active} title={t(`dog.chewHint.${c.value}`)}
                    className={`h-9 pl-2 pr-3 rounded-full border inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition ${active ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    <span className="text-[16px] leading-none" aria-hidden="true">{c.emoji}</span>{t(`dog.chew.${c.value}`)}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={t('dog.notes')} hint={t('dog.optional')}>
            <textarea value={value.specialNotes} onChange={(e) => set('specialNotes', e.target.value)} rows={2} maxLength={500}
              className={`${field} h-auto py-2.5 resize-y`} placeholder={t('dog.notesPh')} />
          </Section>
        </>
      )}
    </div>
  );
}
