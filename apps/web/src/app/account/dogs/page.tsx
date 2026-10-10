'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import DogProfileForm, { emptyDogProfile, fromDog, toDogPayload, type DogProfile } from '@/components/DogProfileForm';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';

const SIZE_KEY: Record<string, string> = { EXTRA_SMALL: 'XS', SMALL: 'S', MEDIUM: 'M', LARGE: 'L', EXTRA_LARGE: 'XL' };

/**
 * The customer's dogs. Boxes are packed for each dog's size and allergies,
 * so this is where a new allergy or a grown puppy gets recorded.
 */
export default function MyDogsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<DogProfile>(emptyDogProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [notice, setNotice] = useState('');

  const expired = () => router.replace(loginUrl('/account/dogs'));

  async function load() {
    try {
      const res = await authFetch('/me/dogs');
      setDogs(res.ok ? await res.json() : []);
    } catch (e) {
      if (e instanceof SessionExpiredError) expired();
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function open(id: string | 'new') {
    setEditing(id);
    setDraft(id === 'new' ? emptyDogProfile : fromDog(dogs.find(d => d.id === id)));
    setError(''); setNameError(''); setNotice('');
  }

  async function save() {
    if (!draft.name.trim()) { setNameError(t('co.e.dogName')); return; }
    setSaving(true); setError('');
    try {
      const res = await authFetch(editing === 'new' ? '/me/dogs' : `/me/dogs/${editing}`, {
        method: editing === 'new' ? 'POST' : 'PUT',
        body: JSON.stringify(toDogPayload(draft)),
      });
      if (!res.ok) throw new Error();
      setEditing(null);
      setNotice(t('dogs.saved'));
      await load();
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      setError(t('co.e.generic'));
    } finally {
      setSaving(false);
    }
  }

  const [uploading, setUploading] = useState<string | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  /** Uploads straight from the file picker; the API checks it really is a photo. */
  async function uploadPhoto(dog: any, file: File | undefined) {
    if (!file) return;
    setError(''); setNotice('');
    if (file.size > 8 * 1024 * 1024) { setError(t('dog.photoHint')); return; }
    setUploading(dog.id);
    try {
      const body = new FormData();
      body.append('file', file);
      // Not authFetch: that sets a JSON content type, and this is a file.
      const res = await fetch(`${API}/me/dogs/${dog.id}/photo`, { method: 'POST', body, headers: { Authorization: `Bearer ${localStorage.getItem('pupbox_token')}` } });
      if (res.status === 401) return expired();
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.message || t('co.e.generic'));
      setDogs(prev => prev.map(x => (x.id === dog.id ? { ...x, photoUrl: r.photoUrl } : x)));
    } catch (e: any) {
      setError(e.message);
    } finally { setUploading(null); }
  }

  async function removePhoto(dog: any) {
    try {
      const res = await authFetch(`/me/dogs/${dog.id}/photo`, { method: 'DELETE' });
      if (res.ok) setDogs(prev => prev.map(x => (x.id === dog.id ? { ...x, photoUrl: null } : x)));
    } catch (e) {
      if (e instanceof SessionExpiredError) expired();
    }
  }

  async function remove(dog: any) {
    if (!confirm(t('dogs.removeConfirm').replace('{name}', dog.name))) return;
    setError(''); setNotice('');
    try {
      const res = await authFetch(`/me/dogs/${dog.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const r = await res.json().catch(() => ({}));
        setError(res.status === 400 ? t('dogs.inUse') : r.message || t('co.e.generic'));
        return;
      }
      await load();
    } catch (e) {
      if (e instanceof SessionExpiredError) expired();
    }
  }

  const primary = 'bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50';
  const secondary = 'border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50';

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/account" className="text-sm text-gray-500 hover:text-teal-600">← {t('acc.title')}</Link>
        <div className="flex items-end justify-between gap-4 mt-4 mb-2">
          <h1 className="text-3xl font-extrabold text-gray-900">{t('dogs.title')}</h1>
          {editing === null && <button onClick={() => open('new')} className={primary}>+ {t('dogs.add')}</button>}
        </div>
        <p className="text-sm text-gray-500 mb-6">{t('dogs.sub')}</p>

        {notice && <p className="mb-4 text-sm text-teal-800 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3" role="status">✓ {notice}</p>}
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}

        {editing !== null && (
          <section className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">{editing === 'new' ? t('dogs.add') : draft.name || t('dogs.title')}</h2>
            <DogProfileForm value={draft} onChange={d => { setDraft(d); setNameError(''); }} nameError={nameError} />
            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={saving} className={primary}>{saving ? t('co.saving') : t('acc.save')}</button>
              <button onClick={() => setEditing(null)} className={secondary}>{t('dogs.cancel')}</button>
            </div>
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" /></div>
        ) : dogs.length === 0 && editing === null ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3" aria-hidden="true"><span className="wag">🐶</span></div>
            <p className="text-gray-600 mb-5">{t('dogs.empty')}</p>
            <button onClick={() => open('new')} className={primary}>+ {t('dogs.add')}</button>
          </div>
        ) : (
          <ul className="space-y-3">
            {dogs.filter(d => d.id !== editing).map(d => (
              <li key={d.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                <label className="group relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-teal-50 border border-teal-100 cursor-pointer" title={t(d.photoUrl ? 'dog.photoChange' : 'dog.photoAdd')}>
                  {d.photoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                    : <span className="w-full h-full flex flex-col items-center justify-center text-teal-700 text-[11px] font-semibold"><span className="text-2xl group-hover:animate-bounce" aria-hidden="true">📷</span>{t('dog.photoAdd')}</span>}
                  {uploading === d.id && <span className="absolute inset-0 bg-white/80 flex items-center justify-center text-[11px] font-semibold text-teal-700">{t('dog.photoUploading')}</span>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t(d.photoUrl ? 'dog.photoChange' : 'dog.photoAdd')}
                    onChange={e => { uploadPhoto(d, e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {d.name}
                    {d.size && <span className="ml-2 text-xs font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{SIZE_KEY[d.size] ?? d.size}</span>}
                  </p>
                  {d.breed && <p className="text-sm text-gray-500">{d.breed}</p>}
                  <p className={`text-sm mt-1 ${d.allergies?.length ? 'text-red-600' : 'text-gray-400'}`}>
                    {d.allergies?.length ? `${t('dogs.allergies')}: ${d.allergies.join(', ')}` : t('dogs.noAllergies')}
                  </p>
                  {d.photoUrl
                    ? <button onClick={() => removePhoto(d)} className="text-xs text-gray-400 hover:text-red-600 mt-1">{t('dog.photoRemove')}</button>
                    : <p className="text-xs text-gray-400 mt-1">{t('dog.photoHint')}</p>}
                </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => open(d.id)} className="text-sm font-medium text-teal-700 hover:underline">{t('dogs.edit')}</button>
                  <button onClick={() => remove(d)} className="text-sm text-gray-400 hover:text-red-600">{t('dogs.remove')}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
