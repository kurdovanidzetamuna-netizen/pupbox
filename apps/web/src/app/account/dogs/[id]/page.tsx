'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import DogProfileForm, { fromDog, toDogPayload, type DogProfile } from '@/components/DogProfileForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { FormAlert, revealFirstError } from '@/components/ui/FormError';
import { TYPE } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/icons';
import PawTrail from '@/components/PawTrail';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { birthdayLine, dogAge, dogOption, SIZE_SHORT } from '@/lib/dog';
import { planText } from '@/lib/localize';
import { formatDate } from '@/lib/dates';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const CHEW_LEVEL: Record<string, number> = { GENTLE: 1, AVERAGE: 2, POWER: 3 };

/**
 * One dog, everything we know: photo, whose dog it is, age, size, weight
 * and birthday at a glance; health, what they love, notes, and their boxes.
 * Edit, change the photo or remove — all from here.
 */
export default function DogProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { t, lang } = useLanguage();
  const [dog, setDog] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DogProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(params.get('new') ? '🎉' : '');
  const [nameError, setNameError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  const expired = () => router.replace(loginUrl(`/account/dogs/${id}`));

  async function load() {
    try {
      const res = await authFetch(`/me/dogs/${id}`);
      if (!res.ok) { setMissing(true); return; }
      setDog(await res.json());
    } catch (e) {
      if (e instanceof SessionExpiredError) expired();
    }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { setNameError(t('co.e.dogName')); return revealFirstError(); }
    setSaving(true); setError('');
    try {
      const res = await authFetch(`/me/dogs/${id}`, { method: 'PUT', body: JSON.stringify(toDogPayload(draft)) });
      if (!res.ok) throw new Error();
      setEditing(false);
      setNotice(t('dogs.saved'));
      await load();
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      setError(t('co.e.generic'));
    } finally { setSaving(false); }
  }

  /** Uploads straight from the file picker; the API checks it really is a photo. */
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    if (file.size > 8 * 1024 * 1024) { setError(t('dog.photoHint')); return; }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      // Not authFetch: that sets a JSON content type, and this is a file.
      const res = await fetch(`${API}/me/dogs/${id}/photo`, { method: 'POST', body, headers: { Authorization: `Bearer ${localStorage.getItem('pupbox_token')}` } });
      if (res.status === 401) return expired();
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.message || t('co.e.generic'));
      setDog((d: any) => ({ ...d, photoUrl: r.photoUrl }));
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  }

  async function removePhoto() {
    try {
      const res = await authFetch(`/me/dogs/${id}/photo`, { method: 'DELETE' });
      if (res.ok) setDog((d: any) => ({ ...d, photoUrl: null }));
    } catch (e) { if (e instanceof SessionExpiredError) expired(); }
  }

  async function remove() {
    setRemoving(true); setError('');
    try {
      const res = await authFetch(`/me/dogs/${id}`, { method: 'DELETE' });
      if (!res.ok) { setError(res.status === 400 ? t('dogs.inUse') : t('co.e.generic')); return; }
      router.push('/account/dogs');
    } catch (e) { if (e instanceof SessionExpiredError) expired(); }
    finally { setRemoving(false); setConfirm(false); }
  }

  if (missing) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-3" aria-hidden="true">🐾</p>
        <p className="text-gray-600 mb-5">{t('dogs.notFound')}</p>
        <Link href="/account/dogs" className="text-teal-700 font-bold hover:underline">← {t('dogs.back')}</Link>
      </div>
    );
  }
  if (!dog) return <div className="flex justify-center py-24"><span className="text-4xl animate-[bob_1s_ease-in-out_infinite]" aria-hidden="true">🐶</span></div>;

  const gift = dog.forGift;
  const age = dogAge(dog.birthday, t);
  const bday = birthdayLine(dog.birthday, t);
  const plans: any[] = dog.subscriptions ?? [];
  const date = (d: string) => formatDate(d, lang);
  const chips = (list: string[], tone: string) => list.map((x) => <span key={x} className={`text-[12.5px] font-semibold rounded-full px-3 py-1.5 ${tone}`}>{dogOption(x, lang, t)}</span>);
  const empty = <span className="text-[13px] text-gray-400">{t('dogs.notSet')}</span>;
  const unfilled = !dog.birthday || !dog.weightKg || !dog.foodPreferences?.length || !dog.toyPreferences?.length || !dog.chewingStrength;
  const accent = gift ? 'text-peach-600' : 'text-teal-700';

  const card = (icon: string, title: string, children: React.ReactNode, i: number) => (
    <section className="bg-white rounded-[24px] ring-1 ring-gray-200/60 p-5 animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${120 + i * 70}ms` }}>
      <h2 className="text-[13px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2"><span aria-hidden="true" className="text-[16px]">{icon}</span>{title}</h2>
      {children}
    </section>
  );

  return (
    <div>
      <Link href="/account/dogs" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-teal-700 mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        {t('dogs.back')}
      </Link>

      {notice && (
        <p className="mb-4 text-sm text-teal-800 bg-teal-50 rounded-2xl px-4 py-3 animate-[fadeUp_0.3s_ease-out]" role="status">
          {notice === '🎉' ? <><span className="inline-block animate-[wiggle_1s_ease-in-out_3]">🎉</span> {dog.name}! {t('dogs.fillMore')}</> : <>✓ {notice}</>}
        </p>
      )}
      <FormAlert message={error} className="mb-4" />

      {/* ── Hero: photo and the essentials ── */}
      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5 sm:gap-7 items-center mb-6 animate-[fadeUp_0.35s_ease-out]">
        <div className={`group relative aspect-square rounded-[32px] overflow-hidden ${gift ? 'bg-peach-50' : 'bg-teal-50'}`}>
          {dog.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : (<>
                <PawTrail />
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                  <span className="text-[96px] animate-[bob_2.4s_ease-in-out_infinite]"><span className="inline-block animate-[wag_1.6s_ease-in-out_infinite]">{gift ? '🐕' : '🐶'}</span></span>
                </span>
              </>)}
          <span className="absolute left-1/2 bottom-10 pointer-events-none" aria-hidden="true">
            {[0, 1, 2].map((k) => <span key={k} className="absolute opacity-0 text-[22px] group-hover:animate-[heartUp_1.5s_ease-out_infinite]" style={{ left: `${(k - 1) * 28}px`, animationDelay: `${k * 0.3}s` }}>{gift ? '🧡' : '💚'}</span>)}
          </span>
          {uploading && <span className="absolute inset-0 bg-white/80 flex items-center justify-center text-[13px] font-semibold text-teal-700">{t('dog.photoUploading')}</span>}
          <span className="absolute left-3 bottom-3 flex gap-2">
            <label title={t(dog.photoUrl ? 'dog.photoChange' : 'dog.photoAdd')}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/90 backdrop-blur text-[12.5px] font-bold text-gray-700 hover:text-teal-700 cursor-pointer ring-1 ring-black/5">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z" /></svg>
              {t(dog.photoUrl ? 'dog.photoChange' : 'dog.photoAdd')}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {dog.photoUrl && (
              <button type="button" onClick={removePhoto} aria-label={t('dog.photoRemove')} title={t('dog.photoRemove')}
                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur text-gray-500 hover:text-red-500 flex items-center justify-center ring-1 ring-black/5"><Icon name="trash" className="w-4 h-4" /></button>
            )}
          </span>
        </div>

        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-bold ${gift ? 'bg-peach-50 text-peach-600' : 'bg-teal-50 text-teal-700'}`}>
            <span aria-hidden="true">{gift ? '🎁' : '🐾'}</span>{gift ? (dog.giftFor ? fill(t('dogs.giftFor'), { name: dog.giftFor }) : t('dogs.giftDog')) : t('dogs.mine')}
          </span>
          <h1 className={`${TYPE.page} mt-3 flex items-center gap-2.5`}>
            <span className="truncate">{dog.name}</span>
            {dog.gender && <span className={`text-[26px] ${dog.gender === 'MALE' ? 'text-teal-600' : 'text-peach-500'}`} aria-label={t(dog.gender === 'MALE' ? 'dog.male' : 'dog.female')}>{dog.gender === 'MALE' ? '♂' : '♀'}</span>}
          </h1>
          {(age || dog.breed) && <p className="text-[15px] text-gray-500 mt-1">{[age, dog.breed].filter(Boolean).join(' · ')}</p>}
          {bday && <p className="mt-3 inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-peach-50 text-peach-600 text-[13px] font-bold"><span className="inline-block animate-[wiggle_2s_ease-in-out_infinite]">🎂</span>{bday}</p>}

          {/* At a glance */}
          <div className="grid grid-cols-2 gap-2.5 mt-5 max-w-md">
            {[
              ['🎈', t('dogs.age'), age],
              ['📏', t('dogs.size'), dog.size ? `${SIZE_SHORT[dog.size]} · ${t(`dog.size.${dog.size}`)}` : null],
              ['⚖️', t('dog.weight'), dog.weightKg != null ? `${dog.weightKg} ${t('dog.kg')}` : null],
              ['🎂', t('dog.birthday'), dog.birthday ? date(dog.birthday) : null],
            ].map(([icon, label, value], i) => (
              <div key={label as string} className="rounded-2xl bg-gray-50 px-3.5 py-3 animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${i * 60}ms` }}>
                <p className="text-[11.5px] text-gray-400 flex items-center gap-1.5"><span aria-hidden="true">{icon}</span>{label}</p>
                <p className={`text-[14px] font-bold mt-0.5 ${value ? 'text-gray-900' : 'text-gray-300'}`}>{value || '—'}</p>
              </div>
            ))}
          </div>

          {!editing && (
            <div className="flex flex-wrap gap-2 mt-5">
              <button type="button" onClick={() => { setDraft(fromDog(dog)); setEditing(true); setNotice(''); setNameError(''); }}
                className={`inline-flex items-center gap-2 h-10 px-5 rounded-full text-[13.5px] font-bold text-white ${gift ? 'bg-peach-400 hover:bg-peach-500' : 'bg-teal-600 hover:bg-teal-700'}`}>
                <Icon name="edit" className="w-4 h-4" />{t('dogs.edit')}
              </button>
              {!gift && (
                <button type="button" onClick={() => setConfirm(true)} aria-label={t('dogs.remove')} title={t('dogs.remove')}
                  className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center"><Icon name="trash" className="w-4 h-4" /></button>
              )}
            </div>
          )}
        </div>
      </div>

      {gift && <p className="mb-5 text-[13px] text-peach-600 bg-peach-50 rounded-2xl px-4 py-3">🎁 {t('dogs.giftNote')}</p>}

      {editing && draft ? (
        <section className="bg-white rounded-[28px] ring-1 ring-gray-200/60 p-6 mb-6 animate-[fadeUp_0.25s_ease-out]">
          <DogProfileForm value={draft} onChange={(d) => { setDraft(d); setNameError(''); }} nameError={nameError} />
          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving} className="bg-teal-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">{saving ? t('co.saving') : t('acc.save')}</button>
            <button onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">{t('dogs.cancel')}</button>
          </div>
        </section>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 items-start">
          {card('🩺', t('dogs.secHealth'), (
            <div className="flex flex-wrap gap-1.5">
              {dog.allergies?.length ? chips(dog.allergies, 'bg-red-50 text-red-600') : <span className="text-[13px] font-semibold text-teal-700">✓ {t('dogs.noAllergies')}</span>}
            </div>
          ), 0)}

          {card('🦴', t('dogs.secLikes'), (
            <div className="space-y-3.5">
              <div>
                <p className="text-[12px] text-gray-400 mb-1.5">{t('dogs.food')}</p>
                <div className="flex flex-wrap gap-1.5">{dog.foodPreferences?.length ? chips(dog.foodPreferences, 'bg-teal-50 text-teal-800') : empty}</div>
              </div>
              <div>
                <p className="text-[12px] text-gray-400 mb-1.5">{t('dogs.toys')}</p>
                <div className="flex flex-wrap gap-1.5">{dog.toyPreferences?.length ? chips(dog.toyPreferences, 'bg-peach-50 text-peach-600') : empty}</div>
              </div>
              <div>
                <p className="text-[12px] text-gray-400 mb-1.5">{t('dogs.chew')}</p>
                {dog.chewingStrength ? (
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
                    <span className="flex gap-0.5" aria-hidden="true">{[1, 2, 3].map((n) => <span key={n} className={`text-[16px] ${n <= (CHEW_LEVEL[dog.chewingStrength] ?? 0) ? '' : 'grayscale opacity-25'}`}>🦴</span>)}</span>
                    {t(`dog.chew.${dog.chewingStrength}`, dog.chewingStrength)}
                  </p>
                ) : empty}
              </div>
            </div>
          ), 1)}

          {card('📝', t('dogs.secNotes'), dog.specialNotes ? <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-line">{dog.specialNotes}</p> : empty, 2)}

          {card('📦', t('dogs.secPlans'), plans.length ? (
            <ul className="space-y-2">
              {plans.map((s) => (
                <li key={s.id}>
                  <Link href="/account/subscriptions" className="flex items-center gap-3 rounded-2xl bg-gray-50 hover:bg-teal-50 px-3.5 py-3 transition-colors">
                    <span className="w-9 h-9 rounded-xl bg-white text-teal-600 flex items-center justify-center"><Icon name="box" className="w-[18px] h-[18px]" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-bold text-gray-900 truncate">{planText(s.plan, 'name', lang)}</span>
                      <span className="block text-[12px] text-gray-500">{fill(t('dogs.boxes'), { sent: s.boxesDelivered, total: s.boxesTotal })}{s.endDate && <> · {fill(t('dogs.until'), { date: date(s.endDate) })}</>}</span>
                    </span>
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-gray-500">{t('dogs.planOff')}</p>
              <Link href="/prices#plans" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-teal-50 text-teal-700 text-[12.5px] font-bold hover:bg-teal-100">{t('dogs.getBox')} →</Link>
            </div>
          ), 3)}

          {unfilled && (
            <button type="button" onClick={() => { setDraft(fromDog(dog)); setEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="group md:col-span-2 flex items-center gap-4 rounded-[24px] border-2 border-dashed border-teal-200 px-5 py-4 text-left hover:bg-teal-50/50 transition-colors">
              <span className="text-2xl group-hover:animate-[bob_1s_ease-in-out_infinite]" aria-hidden="true">✨</span>
              <span className="flex-1 text-[13.5px] font-semibold text-gray-700">{t('dogs.fillMore')}</span>
              <span className={`text-[13px] font-bold ${accent}`}>{t('dogs.addMore')} →</span>
            </button>
          )}
        </div>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} busy={removing} tone="danger"
        title={t('dogs.removeTitle').replace('{name}', dog.name)} message={t('dogs.removeInfo')} confirmLabel={t('dogs.remove')} />
    </div>
  );
}
