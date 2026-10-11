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
  allergies: string[];
  foodPreferences: string[];
  toyPreferences: string[];
  chewingStrength: string;
  specialNotes: string;
}

export const emptyDogProfile: DogProfile = {
  name: '', breed: '', size: '', gender: '', weightKg: '',
  allergies: [], foodPreferences: [], toyPreferences: [], chewingStrength: '', specialNotes: '',
};

/** A saved dog from the API, back into the form's shape. */
export function fromDog(d: any): DogProfile {
  return {
    name: d?.name || '', breed: d?.breed || '', size: d?.size || '', gender: d?.gender || '',
    weightKg: d?.weightKg != null ? String(d.weightKg) : '',
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
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5 mb-2.5">{hint}</p>}
      {!hint && <div className="mb-2.5" />}
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
      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition ${active ? on : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
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
      <div className="flex flex-wrap gap-2">
        {options.map((o) => <Chip key={o} active={selected.includes(o)} onClick={() => toggle(o)} tone={tone}>{t(`dog.opt.${o}`, o)}</Chip>)}
        {extras.map((e) => <Chip key={e} active onClick={() => toggle(e)} tone={tone}>{e}</Chip>)}
      </div>
      <div className="flex gap-2 mt-2.5">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={addLabel}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()}
          className="px-4 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          {t('dog.add')}
        </button>
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
  const field = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400';
  const allergySet = new Set(value.allergies.map((a) => a.toLowerCase()));
  const hiddenFoods = FOOD_LIKES.filter((f) => allergySet.has(f.toLowerCase()));
  const showDetails = !compact || expanded;

  return (
    <div className="space-y-7">
      <div className={`grid gap-4 ${showDetails ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <label htmlFor="dog-name" className="text-sm font-semibold text-gray-900 block mb-2.5">{t('dog.name')} <span className="text-teal-600">*</span></label>
          <input id="dog-name" value={value.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!nameError}
            className={`${field} ${nameError ? 'border-red-400 bg-red-50' : ''}`} placeholder={t('dog.namePh')} />
          <FieldError message={nameError} />
        </div>
        {showDetails && (
          <div>
            <label htmlFor="dog-breed" className="text-sm font-semibold text-gray-900 block mb-2.5">{t('dog.breed')}</label>
            <input id="dog-breed" value={value.breed} onChange={(e) => set('breed', e.target.value)} className={field} placeholder={t('dog.breedPh')} />
          </div>
        )}
      </div>

      <Section title={t('dog.size')} hint={t('dog.sizeHint')}>
        <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-xl ${sizeError ? 'ring-2 ring-red-200 ring-offset-2' : ''}`} aria-invalid={!!sizeError} tabIndex={sizeError ? -1 : undefined}>
          {SIZES.map((s) => {
            const active = value.size === s.value;
            return (
              <button key={s.value} type="button" onClick={() => set('size', active ? '' : s.value)} aria-pressed={active}
                className={`p-3 rounded-xl border text-center transition ${active ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="text-2xl leading-none mb-1.5">{s.emoji}</div>
                <div className={`text-xs font-semibold ${active ? 'text-teal-700' : 'text-gray-700'}`}>{t(`dog.size.${s.value}`)}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{t(`dog.sizeHint.${s.value}`)}</div>
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
        <div className="grid sm:grid-cols-2 gap-6">
          <Section title={t('dog.gender')}>
            <div className="flex gap-2">
              {[{ v: 'MALE', k: 'dog.male' }, { v: 'FEMALE', k: 'dog.female' }].map((g) => (
                <Chip key={g.v} active={value.gender === g.v} onClick={() => set('gender', value.gender === g.v ? '' : g.v)}>{t(g.k)}</Chip>
              ))}
            </div>
          </Section>
          <Section title={t('dog.weight')} hint={t('dog.weightHint')}>
            <div className="relative max-w-[160px]">
              <input type="number" min="0" step="0.1" value={value.weightKg} onChange={(e) => set('weightKg', e.target.value)} className={`${field} pr-10`} placeholder="18" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{t('dog.kg')}</span>
            </div>
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
            <div className="grid grid-cols-3 gap-2">
              {CHEW_LEVELS.map((c) => {
                const active = value.chewingStrength === c.value;
                return (
                  <button key={c.value} type="button" onClick={() => set('chewingStrength', active ? '' : c.value)} aria-pressed={active}
                    className={`p-3 rounded-xl border text-center transition ${active ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="text-xl leading-none mb-1.5">{c.emoji}</div>
                    <div className={`text-xs font-semibold ${active ? 'text-teal-700' : 'text-gray-700'}`}>{t(`dog.chew.${c.value}`)}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{t(`dog.chewHint.${c.value}`)}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={t('dog.notes')} hint={t('dog.optional')}>
            <textarea value={value.specialNotes} onChange={(e) => set('specialNotes', e.target.value)} rows={2} maxLength={500}
              className={`${field} resize-y`} placeholder={t('dog.notesPh')} />
          </Section>
        </>
      )}
    </div>
  );
}
