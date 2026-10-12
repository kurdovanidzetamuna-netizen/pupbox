'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import DogProfileForm, { emptyDogProfile, toDogPayload, type DogProfile } from '@/components/DogProfileForm';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { FormAlert, revealFirstError } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import IconButton from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/icons';
import { birthdayLine, dogAge, dogOption, SIZE_SHORT } from '@/lib/dog';
import PawTrail from '@/components/PawTrail';

/**
 * The customer's dogs — and the friends' dogs they gave a plan to — as
 * cards to open: a big photo (or a wagging pup), whose dog it is, age and
 * breed, size, a birthday countdown, allergies and whether boxes are coming.
 * Each card opens the dog's full profile.
 */
export default function MyDogsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'mine' | 'gift'>('all');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DogProfile>(emptyDogProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');

  const expired = () => router.replace(loginUrl('/account/dogs'));

  async function load() {
    try {
      const res = await authFetch('/me/dogs?all=1');
      setDogs(res.ok ? await res.json() : []);
    } catch (e) {
      if (e instanceof SessionExpiredError) expired();
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!draft.name.trim()) { setNameError(t('co.e.dogName')); return revealFirstError(); }
    setSaving(true); setError('');
    try {
      const res = await authFetch('/me/dogs', { method: 'POST', body: JSON.stringify(toDogPayload(draft)) });
      if (!res.ok) throw new Error();
      const dog = await res.json();
      // Straight to the new dog's profile, where a photo can go in.
      router.push(`/account/dogs/${dog.id}?new=1`);
    } catch (e) {
      if (e instanceof SessionExpiredError) return expired();
      setError(t('co.e.generic'));
      setSaving(false);
    }
  }

  const mine = dogs.filter((d) => !d.forGift);
  const gifts = dogs.filter((d) => d.forGift);
  const shown = tab === 'mine' ? mine : tab === 'gift' ? gifts : dogs;

  return (
    <div>
      <Heading kind="section" as="h1" title={t('dogs.title')} subtitle={t('dogs.sub')}
        actions={!adding && <IconButton icon="plus" label={t('dogs.add')} tone="primary" onClick={() => { setAdding(true); setDraft(emptyDogProfile); setError(''); setNameError(''); }} />} />

      <FormAlert message={error} className="mb-4" />

      {adding && (
        <section className="bg-white rounded-[28px] ring-1 ring-gray-200/60 p-6 mb-6 animate-[fadeUp_0.25s_ease-out]">
          <h2 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center gap-2"><span className="inline-block animate-[wag_1.2s_ease-in-out_infinite]" aria-hidden="true">🐶</span>{t('dogs.add')}</h2>
          <DogProfileForm value={draft} onChange={(d) => { setDraft(d); setNameError(''); }} nameError={nameError} />
          <div className="flex gap-3 mt-6">
            <button onClick={add} disabled={saving} className="bg-teal-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">{saving ? t('co.saving') : t('acc.save')}</button>
            <button onClick={() => setAdding(false)} className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">{t('dogs.cancel')}</button>
          </div>
        </section>
      )}

      {/* Whose dogs: only when there are friends' dogs too */}
      {gifts.length > 0 && (
        <div role="tablist" className="inline-flex max-w-full overflow-x-auto [scrollbar-width:none] gap-1 p-1 rounded-full bg-gray-100 mb-5">
          {([['all', t('dogs.tabAll'), dogs.length], ['mine', t('dogs.tabMine'), mine.length], ['gift', t('dogs.tabGift'), gifts.length]] as const).map(([k, label, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`shrink-0 whitespace-nowrap h-8 px-3.5 rounded-full text-[12.5px] font-bold transition-colors ${tab === k ? 'bg-white text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
              {label} <span className="text-gray-400 font-semibold">{n}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><span className="text-4xl animate-[bob_1s_ease-in-out_infinite]" aria-hidden="true">🐶</span></div>
      ) : dogs.length === 0 && !adding ? (
        <div className="relative overflow-hidden bg-teal-50/60 rounded-[28px] p-10 sm:p-14 text-center">
          <PawTrail />
          <div className="relative text-6xl mb-4 inline-block animate-[bob_2s_ease-in-out_infinite]" aria-hidden="true"><span className="inline-block animate-[wag_1.4s_ease-in-out_infinite]">🐶</span></div>
          <p className="relative text-[15px] font-semibold text-gray-800 mb-1">{t('dogs.empty')}</p>
          <p className="relative text-[13px] text-gray-500 mb-6">{t('dogs.sub')}</p>
          <button onClick={() => setAdding(true)} className="relative inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-teal-700">
            <Icon name="plus" className="w-4 h-4" strokeWidth={2.4} />{t('dogs.add')}
          </button>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {shown.map((d, i) => {
            const gift = d.forGift;
            const age = dogAge(d.birthday, t);
            const bday = birthdayLine(d.birthday, t);
            const plan = d.subscriptions?.find((s: any) => s.status === 'ACTIVE');
            return (
              <li key={d.id} className="animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <Link href={`/account/dogs/${d.id}`} aria-label={`${d.name} — ${t('dogs.open')}`}
                  className={`group block h-full bg-white rounded-[28px] ring-1 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${gift ? 'ring-peach-100 hover:ring-peach-300' : 'ring-gray-200/60 hover:ring-teal-200'}`}>
                  {/* Photo, or a wagging pup on soft colour */}
                  <div className={`relative aspect-[5/4] overflow-hidden ${gift ? 'bg-peach-50' : 'bg-teal-50'}`}>
                    {d.photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      : (<>
                          <PawTrail />
                          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                            <span className="text-[64px] animate-[bob_2.4s_ease-in-out_infinite]"><span className="inline-block group-hover:animate-[wag_0.5s_ease-in-out_infinite]">{gift ? '🐕' : '🐶'}</span></span>
                          </span>
                        </>)}
                    {/* Hearts float up on hover */}
                    <span className="absolute left-1/2 bottom-6 pointer-events-none" aria-hidden="true">
                      {[0, 1, 2].map((k) => (
                        <span key={k} className="absolute opacity-0 text-[18px] group-hover:animate-[heartUp_1.4s_ease-out_infinite]" style={{ left: `${(k - 1) * 22}px`, animationDelay: `${k * 0.3}s` }}>{gift ? '🧡' : '💚'}</span>
                      ))}
                    </span>
                    {/* Whose dog */}
                    <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-bold backdrop-blur ${gift ? 'bg-white/90 text-peach-600' : 'bg-white/90 text-teal-700'}`}>
                      <span aria-hidden="true">{gift ? '🎁' : '🐾'}</span>
                      {gift ? (d.giftFor ? fill(t('dogs.giftFor'), { name: d.giftFor }) : t('dogs.giftDog')) : t('dogs.mine')}
                    </span>
                    {bday && <span className="absolute bottom-3 left-3 h-7 px-2.5 rounded-full bg-white/90 text-[11.5px] font-bold text-peach-600 inline-flex items-center gap-1.5"><span className="inline-block animate-[wiggle_2.4s_ease-in-out_infinite]">🎂</span>{bday}</span>}
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <p className="text-[17px] font-extrabold text-gray-900 truncate">{d.name}</p>
                      {d.gender && <span className={`text-[15px] font-bold ${d.gender === 'MALE' ? 'text-teal-600' : 'text-peach-500'}`} aria-label={t(d.gender === 'MALE' ? 'dog.male' : 'dog.female')}>{d.gender === 'MALE' ? '♂' : '♀'}</span>}
                      <span className={`ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-colors ${gift ? 'bg-peach-50 text-peach-600 group-hover:bg-peach-400 group-hover:text-white' : 'bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white'}`}>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-500 truncate -mt-0.5">{[age, d.breed].filter(Boolean).join(' · ') || ' '}</p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {d.size && <span className="text-[11.5px] font-semibold text-teal-800 bg-teal-50 rounded-full px-2.5 py-1">{SIZE_SHORT[d.size]} · {t(`dog.size.${d.size}`)}</span>}
                      {d.weightKg != null && <span className="text-[11.5px] font-semibold text-gray-600 bg-gray-50 rounded-full px-2.5 py-1">⚖️ {d.weightKg} {t('dog.kg')}</span>}
                      {d.allergies?.length
                        ? <span className="text-[11.5px] font-semibold text-red-600 bg-red-50 rounded-full px-2.5 py-1 truncate max-w-full">⚠ {d.allergies.map((a: string) => dogOption(a, lang, t)).join(', ')}</span>
                        : <span className="text-[11.5px] font-semibold text-gray-500 bg-gray-50 rounded-full px-2.5 py-1">✓ {t('dogs.noAllergies')}</span>}
                    </div>

                    <p className={`mt-3 pt-3 border-t border-gray-100 text-[12px] font-semibold flex items-center gap-1.5 ${plan ? 'text-teal-700' : 'text-gray-400'}`}>
                      <Icon name="box" className="w-4 h-4" />{plan ? t('dogs.planOn') : t('dogs.planOff')}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
          {!adding && tab !== 'gift' && (
            <li>
              <button type="button" onClick={() => { setAdding(true); setDraft(emptyDogProfile); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="group w-full h-full min-h-[300px] rounded-[28px] border-2 border-dashed border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/40 transition-colors flex flex-col items-center justify-center gap-3">
                <span className="w-14 h-14 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center text-2xl group-hover:animate-[bob_1s_ease-in-out_infinite]" aria-hidden="true">🐾</span>
                <span className="text-[13.5px] font-bold">{t('dogs.add')}</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
