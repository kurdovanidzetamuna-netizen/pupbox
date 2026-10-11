'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import IconButton from '@/components/ui/IconButton';
import Menu from '@/components/ui/Menu';
import { Icon } from '@/components/ui/icons';
import { ALLERGENS } from '@pupbox/content';
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
  const { t, lang } = useLanguage();
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

  // Removing a dog asks first, in the shared pop-up.
  const [toRemove, setToRemove] = useState<any>(null);
  const [removing, setRemoving] = useState(false);

  async function remove(dog: any) {
    setError(''); setNotice(''); setRemoving(true);
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
    } finally { setRemoving(false); setToRemove(null); }
  }

  const primary = 'bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50';
  const secondary = 'border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50';

  // Allergens are stored by key ("Chicken"); show them in the visitor's language.
  const allergyName = (a: string) => {
    const known = ALLERGENS.find((x) => x.key.toLowerCase() === a.toLowerCase());
    return known ? (lang === 'ka' ? known.ka : known.key) : t(`dog.opt.${a}`, a);
  };

  return (
    <div>
        <div className="flex items-center justify-between gap-4 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{t('dogs.title')}</h1>
          {editing === null && <IconButton icon="plus" label={t('dogs.add')} tone="primary" onClick={() => open('new')} />}
        </div>
        <p className="text-[13px] text-gray-500 mb-5">{t('dogs.sub')}</p>

        {notice && <p className="mb-4 text-sm text-teal-800 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3" role="status">✓ {notice}</p>}
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}

        {editing !== null && (
          <section className="bg-white rounded-[28px] ring-1 ring-gray-200/60 p-6 mb-6">
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
          <div className="bg-white rounded-[28px] ring-1 ring-gray-200/60 p-10 text-center">
            <div className="text-4xl mb-3" aria-hidden="true"><span className="wag">🐶</span></div>
            <p className="text-gray-600 mb-5">{t('dogs.empty')}</p>
            <button onClick={() => open('new')} className={primary}>+ {t('dogs.add')}</button>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {dogs.filter(d => d.id !== editing).map(d => (
              <li key={d.id} className="group bg-white rounded-3xl ring-1 ring-gray-200/60 overflow-hidden hover:ring-teal-200 transition-colors">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-teal-50 to-lilac-50">
                  {d.photoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" />
                    : <span className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden="true"><span className="wag">🐶</span></span>}
                  {uploading === d.id && <span className="absolute inset-0 bg-white/80 flex items-center justify-center text-[12px] font-semibold text-teal-700">{t('dog.photoUploading')}</span>}
                  {/* Camera: add or change the photo straight from the card. */}
                  <label title={t(d.photoUrl ? 'dog.photoChange' : 'dog.photoAdd')}
                    className="absolute left-3 bottom-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur text-gray-700 hover:text-teal-700 flex items-center justify-center cursor-pointer ring-1 ring-black/5">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z" /></svg>
                    <input id={`photo-${d.id}`} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t(d.photoUrl ? 'dog.photoChange' : 'dog.photoAdd')}
                      onChange={e => { uploadPhoto(d, e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  <div className="absolute right-2 top-2 rounded-full bg-white/90 backdrop-blur ring-1 ring-black/5">
                    <Menu label={d.name} items={[
                      { icon: 'edit', label: t('dogs.edit'), onClick: () => open(d.id) },
                      ...(d.photoUrl ? [{ icon: 'close', label: t('dog.photoRemove'), onClick: () => removePhoto(d) }] : []),
                      { icon: 'trash', label: t('dogs.remove'), tone: 'danger' as const, onClick: () => setToRemove(d) },
                    ]} />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{d.name}</p>
                    {d.size && <span className="text-[11px] font-bold text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">{SIZE_KEY[d.size] ?? d.size}</span>}
                  </div>
                  {d.breed && <p className="text-[13px] text-gray-500 truncate">{d.breed}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {d.allergies?.length
                      ? d.allergies.map((a: string) => <span key={a} className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5"><Icon name="info" className="w-3 h-3" />{allergyName(a)}</span>)
                      : <span className="text-[11px] text-gray-400">{t('dogs.noAllergies')}</span>}
                  </div>
                </div>
              </li>
            ))}
            {editing === null && (
              <li>
                <button type="button" onClick={() => open('new')} aria-label={t('dogs.add')}
                  className="w-full h-full min-h-[220px] rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/40 transition-colors flex items-center justify-center">
                  <Icon name="plus" className="w-7 h-7" strokeWidth={2} />
                </button>
              </li>
            )}
          </ul>
        )}
        <ConfirmDialog open={!!toRemove} onClose={() => setToRemove(null)} onConfirm={() => remove(toRemove)} busy={removing} tone="danger"
        title={t('dogs.removeTitle').replace('{name}', toRemove?.name ?? '')} message={t('dogs.removeInfo')} confirmLabel={t('dogs.remove')} />
    </div>
  );
}
