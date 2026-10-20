'use client';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import {
  emptyDogProfile, fromDog, toDogPayload, type DogProfile,
  Section, ChipGroup, SizePicker, ChewPicker, COMMON_ALLERGIES, FOOD_LIKES, TOY_LIKES, SIZES,
} from '@/components/DogProfileForm';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/FormError';
import { Icon } from '@/components/ui/icons';
import PawTrail from '@/components/PawTrail';
import { authFetch, SessionExpiredError } from '@/lib/authFetch';
import { dogAge } from '@/lib/dog';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const STEPS = [
  { key: 'hello', icon: 'paw' },
  { key: 'body', icon: 'sliders' },
  { key: 'health', icon: 'shield' },
  { key: 'likes', icon: 'heart' },
] as const;

/**
 * The one way to add or edit a dog — from My dogs, a dog's profile, and
 * straight after sign-up. Four short steps instead of one long form: hello
 * (photo, name, gender, breed), size and age, health, favourites. The dog
 * sits at the top and "talks", reacting as you fill things in, so telling
 * us about them feels like meeting them. The photo is part of the form:
 * nothing is saved until Save, and Cancel throws it all away.
 *
 * Adding walks the steps with Next; editing can jump to any step and save
 * from anywhere.
 */
export default function DogEditor({ open, onClose, dog, onSaved, onExpired, welcome = false, startStep = 0 }: {
  open: boolean;
  onClose: () => void;
  /** A saved dog to edit; leave out to add a new one. */
  dog?: any;
  onSaved: (dog: any) => void;
  onExpired?: () => void;
  /** Straight after sign-up: "Skip for now" instead of Cancel. */
  welcome?: boolean;
  startStep?: number;
}) {
  const { t } = useLanguage();
  const editing = !!dog;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DogProfile>(emptyDogProfile);
  const [photo, setPhoto] = useState<{ file: File | null; url: string | null }>({ file: null, url: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  // Bumped on every answer so the dog at the top gives a little wiggle.
  const [bump, setBump] = useState(0);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(dog ? fromDog(dog) : emptyDogProfile);
    setPhoto({ file: null, url: dog?.photoUrl ?? null });
    setStep(startStep); setError(''); setNameError(''); setSaving(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // A picked photo is a local preview until Save; free it when replaced.
  useEffect(() => () => { if (photo.file && photo.url) URL.revokeObjectURL(photo.url); }, [photo]);
  useEffect(() => { body.current?.closest('[class*="overflow-y-auto"]')?.scrollTo({ top: 0 }); }, [step]);

  const change = (d: DogProfile) => { setDraft(d); setNameError(''); setBump((b) => b + 1); };
  const set = <K extends keyof DogProfile>(k: K, v: DogProfile[K]) => change({ ...draft, [k]: v });

  function pick(file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError(t('dog.photoHint')); return; }
    setError('');
    setPhoto({ file, url: URL.createObjectURL(file) });
    setBump((b) => b + 1);
  }

  const named = !!draft.name.trim();
  const last = step === STEPS.length - 1;
  function go(to: number) {
    if (to > 0 && !named) { setStep(0); setNameError(t('co.e.dogName')); return; }
    setStep(to);
  }

  async function save() {
    if (!named) { setStep(0); setNameError(t('co.e.dogName')); return; }
    setSaving(true); setError('');
    try {
      const res = await authFetch(editing ? `/me/dogs/${dog.id}` : '/me/dogs', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(toDogPayload(draft)) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || t('co.e.generic'));
      let saved = await res.json();
      if (photo.file) {
        const form = new FormData();
        form.append('file', photo.file);
        // Not authFetch: that sets a JSON content type, and this is a file.
        const up = await fetch(`${API}/me/dogs/${saved.id}/photo`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${localStorage.getItem('pupbox_token')}` } });
        const r = await up.json().catch(() => ({}));
        if (up.ok) saved = { ...saved, photoUrl: r.photoUrl };
      } else if (editing && dog.photoUrl && !photo.url) {
        const del = await authFetch(`/me/dogs/${saved.id}/photo`, { method: 'DELETE' });
        if (del.ok) saved = { ...saved, photoUrl: null };
      }
      onSaved(saved);
    } catch (e: any) {
      if (e instanceof SessionExpiredError) return onExpired?.();
      setError(e.message || t('co.e.generic'));
    } finally { setSaving(false); }
  }

  // What the dog says: a question until it's answered, then a happy reply.
  const answered = [named, !!draft.size, draft.allergies.length > 0,
    draft.foodPreferences.length + draft.toyPreferences.length > 0 || !!draft.chewingStrength][step];
  const bubble = fill(t(`dogEd.b.${STEPS[step].key}${answered ? 1 : 0}`), { name: draft.name.trim() });
  const sizeAt = SIZES.findIndex((s) => s.value === draft.size);
  const age = dogAge(draft.birthday, t);

  const header = (
    <div className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-teal-50/70 to-lilac-50 px-5 sm:px-7 pt-6 sm:pt-7 pb-4">
      <PawTrail className="opacity-40" />
      <div className="relative flex items-center gap-4 pr-10">
        <div key={bump} className="relative w-[72px] h-[72px] shrink-0 rounded-[24px] bg-white shadow-[0_8px_20px_-10px_rgba(34,163,139,0.6)] overflow-hidden flex items-center justify-center motion-safe:animate-[wiggle_0.5s_ease-in-out]">
          {photo.url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={photo.url} alt="" className="w-full h-full object-cover" />
            : <span className="leading-none motion-safe:animate-[bob_2.4s_ease-in-out_infinite]" aria-hidden="true" style={{ fontSize: `${34 + Math.max(sizeAt, 1) * 3}px` }}>{sizeAt >= 0 ? SIZES[sizeAt].emoji : '🐶'}</span>}
        </div>
        <div className="min-w-0">
          {/* The speech bubble, with a little tail pointing at the dog */}
          <p key={bubble} aria-live="polite"
            className="relative inline-block max-w-full rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[14px] sm:text-[15px] font-bold text-gray-900 shadow-[0_4px_14px_-8px_rgba(36,48,58,0.35)] motion-safe:animate-[pop_0.3s_ease-out]">
            <span className="block truncate">{bubble}</span>
          </p>
          <p className="mt-1.5 px-1 text-[12px] font-medium text-teal-800/70 truncate">
            {editing ? draft.name || dog.name : welcome ? t('wel.title') : t('dogs.add')}
          </p>
        </div>
      </div>

      {/* Steps as paw tabs: where you are, and a way back to any of them */}
      <ol className="relative mt-4 grid grid-cols-4 gap-1.5" aria-label={t('dogs.add')}>
        {STEPS.map((s, i) => {
          const on = i === step, done = i < step;
          return (
            <li key={s.key}>
              <button type="button" onClick={() => go(i)} aria-current={on ? 'step' : undefined}
                className={`w-full h-9 rounded-xl inline-flex items-center justify-center gap-1.5 text-[12px] font-bold transition-all ${
                  on ? 'bg-white text-teal-700 shadow-[0_2px_8px_-4px_rgba(36,48,58,0.3)]' : done ? 'text-teal-700 hover:bg-white/60' : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'}`}>
                <Icon name={done ? 'check' : s.icon} className="w-4 h-4 shrink-0" strokeWidth={done ? 2.6 : 2} />
                <span className="hidden sm:inline truncate">{t(`dogEd.s.${s.key}`)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );

  const footer = (
    <div className="w-full flex items-center gap-2">
      {step === 0
        ? <Button tone="ghost" label={welcome ? t('wel.skip') : t('dogs.cancel')} onClick={onClose} />
        : <Button tone="ghost" icon="undo" label={t('dogEd.back')} onClick={() => setStep(step - 1)} />}
      <span className="flex-1" />
      {/* Adding: Next until the last step. Editing: save from any step. */}
      {!last && <Button tone={editing ? 'soft' : 'primary'} icon="arrow" label={t('dogEd.next')} onClick={() => go(step + 1)} />}
      {(editing || last) && (
        <Button icon="check" onClick={save} disabled={saving}
          label={saving ? t('co.saving') : editing ? t('dogEd.save') : welcome ? t('wel.save') : t('dogEd.add')} />
      )}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={editing ? dog.name : t('dogs.add')} header={header} footer={footer} size="lg">
      <div ref={body} key={step} className="space-y-6 pt-1 pb-2 motion-safe:animate-[fadeUp_0.25s_ease-out]">
        <FormAlert message={error} />

        {step === 0 && (
          <>
            {/* The photo: tap the circle; change or remove it once there */}
            <div className="flex items-center gap-4">
              <label className="group relative w-24 h-24 shrink-0 rounded-[28px] cursor-pointer overflow-hidden bg-teal-50 border-2 border-dashed border-teal-200 hover:border-teal-400 hover:bg-teal-100/60 transition-colors focus-within:ring-2 focus-within:ring-teal-400">
                {photo.url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={photo.url} alt={draft.name} className="w-full h-full object-cover" />
                  : <span className="absolute inset-0 flex flex-col items-center justify-center text-teal-600 group-hover:scale-110 transition-transform"><Icon name="camera" className="w-7 h-7" /></span>}
                <span className="absolute right-1.5 bottom-1.5 w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center ring-2 ring-white"><Icon name={photo.url ? 'edit' : 'plus'} className="w-3.5 h-3.5" strokeWidth={2.6} /></span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t(photo.url ? 'dog.photoChange' : 'dog.photoAdd')}
                  onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-gray-900">{photo.url ? t('dog.photoChange') : t('dogEd.photoCta')}</p>
                <p className="text-[12px] text-gray-500">{t('dog.photoHint')}</p>
                {photo.url && (
                  <button type="button" onClick={() => setPhoto({ file: null, url: null })}
                    className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-gray-500 hover:text-red-600">
                    <Icon name="trash" className="w-3.5 h-3.5" />{t('dog.photoRemove')}
                  </button>
                )}
              </div>
            </div>

            <Field id="dog-name" label={t('dog.name')} required value={draft.name} onChange={(v) => set('name', v)} error={nameError} hint={!nameError ? t('dog.namePh') : undefined} />

            <Section title={t('dog.gender')}>
              <div className="grid grid-cols-2 gap-2">
                {([['MALE', 'dog.male', 'teal'], ['FEMALE', 'dog.female', 'lilac']] as const).map(([v, k, c]) => {
                  const on = draft.gender === v;
                  return (
                    <button key={v} type="button" aria-pressed={on} onClick={() => set('gender', on ? '' : v)}
                      className={`h-12 rounded-2xl text-[14px] font-bold ring-1 ring-inset transition-all active:scale-[0.97] ${on
                        ? c === 'teal' ? 'bg-teal-50 text-teal-700 ring-teal-400' : 'bg-lilac-50 text-lilac-600 ring-lilac-300'
                        : 'bg-gray-100/80 text-gray-700 ring-transparent hover:bg-gray-100'}`}>
                      {t(k)}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Field id="dog-breed" label={t('dog.breed')} value={draft.breed} onChange={(v) => set('breed', v)} hint={t('dog.breedPh')} />
          </>
        )}

        {step === 1 && (
          <>
            <Section title={t('dog.size')} hint={t('dog.sizeHint')}>
              <SizePicker value={draft.size} onChange={(v) => set('size', v)} />
            </Section>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id="dog-weight" type="number" inputMode="decimal" label={t('dog.weight')} value={draft.weightKg} onChange={(v) => set('weightKg', v)}
                hint={t('dog.weightHint')} trailing={<span className="text-[12px] text-gray-400">{t('dog.kg')}</span>} />
              <div>
                <Field id="dog-birthday" type="date" label={t('dog.birthday')} value={draft.birthday} onChange={(v) => set('birthday', v)}
                  hint={age ? undefined : t('dog.birthdayHint')} />
                {age && <p className="mt-1 px-1 text-[12px] font-semibold text-teal-700 motion-safe:animate-[fadeUp_0.2s_ease-out]">{fill(t('dogEd.age'), { age })}</p>}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <Section title={t('dog.allergies')} hint={t('dog.allergiesHint')}>
            <ChipGroup options={COMMON_ALLERGIES} selected={draft.allergies} tone="red" addLabel={t('dog.allergiesAdd')}
              onChange={(allergies) => {
                // An allergy can't also be a favourite food.
                const blocked = new Set(allergies.map((a) => a.toLowerCase()));
                change({ ...draft, allergies, foodPreferences: draft.foodPreferences.filter((f) => !blocked.has(f.toLowerCase())) });
              }} />
            {!draft.allergies.length && <p className="mt-3 text-[12.5px] font-semibold text-teal-700">{t('dogEd.noAllergy')}</p>}
          </Section>
        )}

        {step === 3 && (() => {
          const blocked = new Set(draft.allergies.map((a) => a.toLowerCase()));
          return (
            <>
              <Section title={t('dog.food')} hint={t('dog.foodHint')}>
                <ChipGroup options={FOOD_LIKES.filter((f) => !blocked.has(f.toLowerCase()))} selected={draft.foodPreferences} addLabel={t('dog.foodAdd')}
                  onChange={(v) => set('foodPreferences', v.filter((f) => !blocked.has(f.toLowerCase())))} />
              </Section>
              <Section title={t('dog.toys')} hint={t('dog.optional')}>
                <ChipGroup options={TOY_LIKES} selected={draft.toyPreferences} onChange={(v) => set('toyPreferences', v)} addLabel={t('dog.toysAdd')} />
              </Section>
              <Section title={t('dog.chew')} hint={t('dog.chewHint')}>
                <ChewPicker value={draft.chewingStrength} onChange={(v) => set('chewingStrength', v)} />
              </Section>
              <Section title={t('dog.notes')} hint={t('dog.optional')}>
                <textarea value={draft.specialNotes} onChange={(e) => set('specialNotes', e.target.value)} rows={2} maxLength={500} placeholder={t('dog.notesPh')}
                  className="w-full rounded-xl bg-gray-100/80 px-3.5 py-3 text-[13px] text-gray-900 outline-none resize-y hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-teal-300" />
              </Section>
            </>
          );
        })()}
      </div>
    </Modal>
  );
}
