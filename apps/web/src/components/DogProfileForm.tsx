'use client';
import { useState } from 'react';

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

const SIZES = [
  { value: 'EXTRA_SMALL', emoji: '🐕', label: 'Extra small', hint: 'under 5 kg' },
  { value: 'SMALL', emoji: '🐕', label: 'Small', hint: '5–10 kg' },
  { value: 'MEDIUM', emoji: '🐕‍🦺', label: 'Medium', hint: '10–25 kg' },
  { value: 'LARGE', emoji: '🦮', label: 'Large', hint: '25–40 kg' },
  { value: 'EXTRA_LARGE', emoji: '🐕‍🦺', label: 'Extra large', hint: 'over 40 kg' },
];

const CHEW_LEVELS = [
  { value: 'GENTLE', emoji: '🪶', label: 'Gentle', hint: 'Toys last for ages' },
  { value: 'AVERAGE', emoji: '🦴', label: 'Average', hint: 'Normal wear and tear' },
  { value: 'POWER', emoji: '💪', label: 'Power chewer', hint: 'Destroys everything' },
];

const COMMON_ALLERGIES = ['Chicken', 'Beef', 'Lamb', 'Fish', 'Wheat', 'Dairy', 'Soy', 'Eggs'];
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
        {options.map((o) => <Chip key={o} active={selected.includes(o)} onClick={() => toggle(o)} tone={tone}>{o}</Chip>)}
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
          Add
        </button>
      </div>
    </div>
  );
}

export default function DogProfileForm({ value, onChange, showOptional = true }: {
  value: DogProfile;
  onChange: (d: DogProfile) => void;
  /** Hide the preference sections where a shorter form matters more. */
  showOptional?: boolean;
}) {
  const set = <K extends keyof DogProfile>(k: K, v: DogProfile[K]) => onChange({ ...value, [k]: v });
  const field = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400';
  const allergySet = new Set(value.allergies.map((a) => a.toLowerCase()));

  return (
    <div className="space-y-7">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-900 block mb-2.5">Name <span className="text-teal-600">*</span></label>
          <input value={value.name} onChange={(e) => set('name', e.target.value)} className={field} placeholder="e.g. Rex" />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-900 block mb-2.5">Breed</label>
          <input value={value.breed} onChange={(e) => set('breed', e.target.value)} className={field} placeholder="e.g. Labrador, or a mix" />
        </div>
      </div>

      <Section title="How big are they?" hint="This decides the size of treats and toys we send">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SIZES.map((s) => {
            const active = value.size === s.value;
            return (
              <button key={s.value} type="button" onClick={() => set('size', active ? '' : s.value)} aria-pressed={active}
                className={`p-3 rounded-xl border text-center transition ${active ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="text-2xl leading-none mb-1.5">{s.emoji}</div>
                <div className={`text-xs font-semibold ${active ? 'text-teal-700' : 'text-gray-700'}`}>{s.label}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{s.hint}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="grid sm:grid-cols-2 gap-6">
        <Section title="Gender">
          <div className="flex gap-2">
            {[{ v: 'MALE', l: '♂ Male' }, { v: 'FEMALE', l: '♀ Female' }].map((g) => (
              <Chip key={g.v} active={value.gender === g.v} onClick={() => set('gender', value.gender === g.v ? '' : g.v)}>{g.l}</Chip>
            ))}
          </div>
        </Section>
        <Section title="Weight" hint="Optional — helps us get portions right">
          <div className="relative max-w-[160px]">
            <input type="number" min="0" step="0.1" value={value.weightKg} onChange={(e) => set('weightKg', e.target.value)} className={`${field} pr-10`} placeholder="18" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">kg</span>
          </div>
        </Section>
      </div>

      <Section title="Anything they can't eat?" hint="Tap any allergies — we'll keep them out of every box">
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
          addLabel="Something else they react to…"
        />
      </Section>

      {showOptional && (
        <>
          <Section title="What do they love to eat?" hint="Optional — we'll lean towards these">
            <ChipGroup
              // An allergen is never offered as a favourite.
              options={FOOD_LIKES.filter((f) => !allergySet.has(f.toLowerCase()))}
              selected={value.foodPreferences}
              onChange={(v) => set('foodPreferences', v.filter((f) => !allergySet.has(f.toLowerCase())))}
              addLabel="Another favourite…"
            />
            {FOOD_LIKES.some((f) => allergySet.has(f.toLowerCase())) && (
              <p className="text-xs text-gray-400 mt-2">
                Hidden because you listed {FOOD_LIKES.filter((f) => allergySet.has(f.toLowerCase())).join(', ')} as an allergy.
              </p>
            )}
          </Section>

          <Section title="Favourite kind of toy?" hint="Optional">
            <ChipGroup options={TOY_LIKES} selected={value.toyPreferences} onChange={(v) => set('toyPreferences', v)} addLabel="Another kind…" />
          </Section>

          <Section title="How hard do they chew?" hint="So we send toys that survive them">
            <div className="grid grid-cols-3 gap-2">
              {CHEW_LEVELS.map((c) => {
                const active = value.chewingStrength === c.value;
                return (
                  <button key={c.value} type="button" onClick={() => set('chewingStrength', active ? '' : c.value)} aria-pressed={active}
                    className={`p-3 rounded-xl border text-center transition ${active ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-400' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="text-xl leading-none mb-1.5">{c.emoji}</div>
                    <div className={`text-xs font-semibold ${active ? 'text-teal-700' : 'text-gray-700'}`}>{c.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{c.hint}</div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Anything else we should know?" hint="Optional">
            <textarea value={value.specialNotes} onChange={(e) => set('specialNotes', e.target.value)} rows={2} maxLength={500}
              className={`${field} resize-y`} placeholder="e.g. rescue dog, nervous around loud squeakers" />
          </Section>
        </>
      )}
    </div>
  );
}
