'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import DogProfileForm, { fromDog, toDogPayload, type DogProfile } from '@/components/DogProfileForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import IconButton from '@/components/ui/IconButton';
import Modal from '@/components/ui/Modal';
import { FormAlert, revealFirstError } from '@/components/ui/FormError';
import { Icon } from '@/components/ui/icons';
import PawTrail from '@/components/PawTrail';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { birthdayLine, dogAge, dogOption, SIZE_SHORT } from '@/lib/dog';
import { planText } from '@/lib/localize';
import { formatDate } from '@/lib/dates';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const CHEW_LEVEL: Record<string, number> = { GENTLE: 1, AVERAGE: 2, POWER: 3 };
const round = 'w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors';

/**
 * One dog's profile: a header card (photo, name, whose dog, breed and age,
 * birthday), four quick facts, then health, favourites, notes and boxes in
 * tidy cards. Actions are icons with tooltips: photo, edit (a pop-up),
 * get a box, remove.
 */
export default function DogProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { t, lang } = useLanguage();
  const [dog, setDog] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState<DogProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hello, setHello] = useState(!!params.get('new'));

  const expired = () => router.replace(loginUrl(`/account/dogs/${id}`));

  async function load() {
    try {
      const res = await authFetch(`/me/dogs/${id}`);
      if (!res.ok) { setMissing(true); return; }
      setDog(await res.json());
    } catch (e) { if (e instanceof SessionExpiredError) expired(); }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { setNameError(t('co.e.dogName')); return revealFirstError(); }
    setSaving(true); setError('');
    try {
      const res = await authFetch(`/me/dogs/${id}`, { method: 'PUT', body: JSON.stringify(toDogPayload(draft)) });
      if (!res.ok) throw new Error();
      setDraft(null);
      await load();
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      setError(t('co.e.generic'));
    } finally { setSaving(false); }
  }

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
        <Link href="/account/dogs" aria-label={t('dogs.back')} className={`${round} bg-teal-50 text-teal-700 hover:bg-teal-100`}><Icon name="paw" className="w-4 h-4" /></Link>
      </div>
    );
  }
  if (!dog) return <div className="flex justify-center py-24"><span className="text-4xl animate-[bob_1s_ease-in-out_infinite]" aria-hidden="true">🐶</span></div>;

  const gift = dog.forGift;
  const age = dogAge(dog.birthday, t);
  const bday = birthdayLine(dog.birthday, t);
  const plans: any[] = dog.subscriptions ?? [];
  const tone = gift ? { soft: 'bg-lilac-50', text: 'text-lilac-600' } : { soft: 'bg-teal-50', text: 'text-teal-700' };
  const chips = (list: string[], cls: string) => list.map((x) => <span key={x} className={`text-[12px] font-semibold rounded-full px-2.5 py-1 ${cls}`}>{dogOption(x, lang, t)}</span>);
  const none = <span className="text-[12.5px] text-gray-400">{t('dogs.notSet')}</span>;
  const edit = () => { setDraft(fromDog(dog)); setNameError(''); setError(''); };

  const section = (icon: string, title: string, body: React.ReactNode, i: number) => (
    <section className="bg-white rounded-3xl ring-1 ring-gray-200/60 p-4 sm:p-5 animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${150 + i * 60}ms` }}>
      <h2 className="flex items-center gap-2.5 mb-3">
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${tone.soft} ${tone.text}`}><Icon name={icon} className="w-4 h-4" /></span>
        <span className="text-[14px] font-bold text-gray-900">{title}</span>
      </h2>
      {body}
    </section>
  );

  return (
    <div className="space-y-4">
      {/* Back, and what you can do — icons with tooltips */}
      <div className="flex items-center justify-between gap-2">
        <Link href="/account/dogs" aria-label={t('dogs.back')} title={t('dogs.back')} className={`${round} bg-white ring-1 ring-gray-200/70 text-gray-600 hover:text-teal-700`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <div className="flex items-center gap-1.5">
          <label title={t(dog.photoUrl ? 'dog.photoChange' : 'dog.photoAdd')} aria-label={t(dog.photoUrl ? 'dog.photoChange' : 'dog.photoAdd')} className={`${round} bg-white ring-1 ring-gray-200/70 text-gray-600 hover:text-teal-700 cursor-pointer`}>
            <Icon name="camera" className="w-[18px] h-[18px]" />
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {!plans.length && (
            <Link href="/prices#plans" aria-label={t('dogs.getBox')} title={t('dogs.getBox')} className={`${round} bg-white ring-1 ring-gray-200/70 text-gray-600 hover:text-teal-700`}><Icon name="box" className="w-[18px] h-[18px]" /></Link>
          )}
          {!gift && <IconButton icon="trash" label={t('dogs.remove')} tone="danger" onClick={() => setConfirm(true)} />}
          <IconButton icon="edit" label={t('dogs.edit')} tone="primary" onClick={edit} />
        </div>
      </div>

      {hello && (
        <button type="button" onClick={() => setHello(false)} className="w-full text-left text-[13.5px] text-teal-800 bg-teal-50 rounded-2xl px-4 py-3 animate-[fadeUp_0.3s_ease-out]">
          <span className="inline-block animate-[wiggle_1s_ease-in-out_3]">🎉</span> {dog.name}! {t('dogs.fillMore')}
        </button>
      )}
      <FormAlert message={error} />

      {/* Header card */}
      <section className={`relative overflow-hidden rounded-[28px] ${tone.soft} p-4 sm:p-5 flex items-center gap-4 sm:gap-6 animate-[fadeUp_0.35s_ease-out]`}>
        <PawTrail className="opacity-50" />
        <div className="group relative w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-[26px] overflow-hidden bg-white">
          {dog.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" />
            : <span className="absolute inset-0 flex items-center justify-center text-[56px]" aria-hidden="true"><span className="inline-block animate-[bob_2.4s_ease-in-out_infinite]"><span className="inline-block animate-[wag_1.6s_ease-in-out_infinite]">{gift ? '🐕' : '🐶'}</span></span></span>}
          {uploading && <span className="absolute inset-0 bg-white/80 flex items-center justify-center"><span className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></span>}
          {dog.photoUrl && (
            <button type="button" onClick={removePhoto} aria-label={t('dog.photoRemove')} title={t('dog.photoRemove')}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 text-gray-500 hover:text-red-500 items-center justify-center hidden group-hover:flex"><Icon name="close" className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="relative min-w-0">
          <span className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-white/80 text-[11.5px] font-bold ${tone.text}`}>
            {gift ? '🎁' : '🐾'} {gift ? (dog.giftFor ? fill(t('dogs.giftFor'), { name: dog.giftFor }) : t('dogs.giftDog')) : t('dogs.mine')}
          </span>
          <h1 className="mt-2 flex items-center gap-2 text-[26px] sm:text-[30px] font-extrabold text-gray-900 leading-tight">
            <span className="truncate">{dog.name}</span>
            {dog.gender && <span className={dog.gender === 'MALE' ? 'text-teal-600' : 'text-lilac-600'}>{dog.gender === 'MALE' ? '♂' : '♀'}</span>}
          </h1>
          <p className="text-[14px] text-gray-600 truncate">{[dog.breed, age].filter(Boolean).join(' · ') || t('dogs.notSet')}</p>
          {bday && <p className="mt-2 inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white text-peach-600 text-[12px] font-bold"><span className="inline-block animate-[wiggle_2s_ease-in-out_infinite]">🎂</span>{bday}</p>}
        </div>
      </section>

      {/* Quick facts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          ['🎈', t('dogs.age'), age],
          ['📏', t('dogs.size'), dog.size ? `${SIZE_SHORT[dog.size]} · ${t(`dog.size.${dog.size}`)}` : null],
          ['⚖️', t('dog.weight'), dog.weightKg != null ? `${dog.weightKg} ${t('dog.kg')}` : null],
          ['🎂', t('dog.birthday'), dog.birthday ? formatDate(dog.birthday, lang) : null],
        ].map(([icon, label, value], i) => (
          <div key={label as string} className="bg-white rounded-2xl ring-1 ring-gray-200/60 px-3.5 py-3 animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${60 + i * 50}ms` }}>
            <p className="text-[11.5px] text-gray-400 flex items-center gap-1.5"><span aria-hidden="true">{icon}</span>{label}</p>
            <p className={`text-[13.5px] font-bold mt-1 leading-snug ${value ? 'text-gray-900' : 'text-gray-300'}`}>{value || '—'}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="columns-1 md:columns-2 gap-3 [&>section]:mb-3 [&>section]:break-inside-avoid">
        {section('shield', t('dogs.secHealth'), (
          <div className="flex flex-wrap gap-1.5">{dog.allergies?.length ? chips(dog.allergies, 'bg-red-50 text-red-600') : <span className="text-[12.5px] font-semibold text-teal-700">✓ {t('dogs.noAllergies')}</span>}</div>
        ), 0)}

        {section('heart', t('dogs.secLikes'), (
          <dl className="space-y-2.5">
            <div className="flex gap-3"><dt className="w-24 shrink-0 text-[12px] text-gray-400 pt-1">{t('dogs.food')}</dt><dd className="flex flex-wrap gap-1.5">{dog.foodPreferences?.length ? chips(dog.foodPreferences, 'bg-teal-50 text-teal-800') : none}</dd></div>
            <div className="flex gap-3"><dt className="w-24 shrink-0 text-[12px] text-gray-400 pt-1">{t('dogs.toys')}</dt><dd className="flex flex-wrap gap-1.5">{dog.toyPreferences?.length ? chips(dog.toyPreferences, 'bg-peach-50 text-peach-600') : none}</dd></div>
            <div className="flex gap-3 items-center"><dt className="w-24 shrink-0 text-[12px] text-gray-400">{t('dogs.chew')}</dt><dd>
              {dog.chewingStrength ? (
                <span className="flex items-center gap-2 text-[12.5px] font-semibold text-gray-800" title={t(`dog.chew.${dog.chewingStrength}`)}>
                  <span className="flex gap-0.5" aria-hidden="true">{[1, 2, 3].map((n) => <span key={n} className={n <= (CHEW_LEVEL[dog.chewingStrength] ?? 0) ? '' : 'grayscale opacity-25'}>🦴</span>)}</span>
                  {t(`dog.chew.${dog.chewingStrength}`, dog.chewingStrength)}
                </span>
              ) : none}
            </dd></div>
          </dl>
        ), 1)}

        {section('info', t('dogs.secNotes'), dog.specialNotes ? <p className="text-[13.5px] text-gray-700 leading-relaxed whitespace-pre-line">{dog.specialNotes}</p> : none, 2)}

        {section('box', t('dogs.secPlans'), plans.length ? (
          <ul className="space-y-2">
            {plans.map((s) => (
              <li key={s.id}>
                <Link href="/account/subscriptions" className="flex items-center gap-3 rounded-2xl bg-gray-50 hover:bg-teal-50 px-3 py-2.5 transition-colors">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold text-gray-900 truncate">{planText(s.plan, 'name', lang)}</span>
                    <span className="block text-[11.5px] text-gray-500">{fill(t('dogs.boxes'), { sent: s.boxesDelivered, total: s.boxesTotal })}{s.endDate && <> · {fill(t('dogs.until'), { date: formatDate(s.endDate, lang) })}</>}</span>
                  </span>
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              </li>
            ))}
          </ul>
        ) : <span className="text-[12.5px] text-gray-400">{t('dogs.planOff')}</span>, 3)}
      </div>

      {gift && <p className="text-[12.5px] text-lilac-600 bg-lilac-50 rounded-2xl px-4 py-3">🎁 {t('dogs.giftNote')}</p>}

      {/* Edit in a pop-up */}
      <Modal open={!!draft} onClose={() => setDraft(null)} title={dog.name} size="lg"
        footer={<>
          <IconButton icon="close" label={t('dogs.cancel')} onClick={() => setDraft(null)} />
          <IconButton icon="check" label={t('acc.save')} tone="primary" onClick={save} disabled={saving} />
        </>}>
        {draft && <DogProfileForm value={draft} onChange={(d) => { setDraft(d); setNameError(''); }} nameError={nameError} />}
      </Modal>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} busy={removing} tone="danger"
        title={t('dogs.removeTitle').replace('{name}', dog.name)} message={t('dogs.removeInfo')} confirmLabel={t('dogs.remove')} />
    </div>
  );
}
