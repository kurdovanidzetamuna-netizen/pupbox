'use client';
import { Bone, Loading, PanelBones, RowBones } from '@/components/ui/Skeleton';
import Link from '@/components/LangLink';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import DogEditor from '@/components/DogEditor';
import { authFetch, loginUrl, SessionExpiredError } from '@/lib/authFetch';
import { Heading } from '@/components/ui/Heading';
import IconButton from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/icons';
import PawTrail from '@/components/PawTrail';
import DogPhoto from '@/components/DogPhoto';
import { birthdayLine, dogAge, SIZE_SHORT } from '@/lib/dog';

const TINTS = ['bg-teal-50', 'bg-lilac-50', 'bg-sky-50', 'bg-teal-50/60'];

/**
 * My dogs: small cards, each opening the dog's profile — a photo (or a
 * wagging pup) with the name, breed and age, and tiny marks for size,
 * allergies, a box and a birthday soon. A friend's dog (from a gift plan)
 * is marked 🎁. Adding a dog opens a pop-up.
 */
export default function MyDogsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'mine' | 'gift'>('all');
  const [adding, setAdding] = useState(false);

  const expired = () => router.replace(loginUrl('/account/dogs'));

  useEffect(() => {
    authFetch('/me/dogs?all=1')
      .then(async (res) => setDogs(res.ok ? await res.json() : []))
      .catch((e) => { if (e instanceof SessionExpiredError) expired(); })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => setAdding(true);

  const mine = dogs.filter((d) => !d.forGift);
  const gifts = dogs.filter((d) => d.forGift);
  const shown = tab === 'mine' ? mine : tab === 'gift' ? gifts : dogs;

  return (
    <div>
      <Heading kind="section" as="h1" title={t('dogs.title')} subtitle={t('dogs.sub')}
        actions={<IconButton icon="plus" label={t('dogs.add')} tone="primary" onClick={openAdd} />} />

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
        <Loading label={t('global.loading')} className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="flex gap-4 rounded-3xl bg-white ring-1 ring-gray-100 p-4"><Bone className="w-20 h-20 rounded-2xl shrink-0" /><div className="flex-1 space-y-2 pt-1"><Bone className="h-5 w-1/2" /><Bone className="h-3.5 w-3/4" /><Bone className="h-3.5 w-2/5" /></div></div>)}
        </Loading>
      ) : dogs.length === 0 ? (
        <button type="button" onClick={openAdd} className="group relative w-full overflow-hidden rounded-[28px] bg-teal-50/70 py-14 text-center">
          <PawTrail />
          <span className="relative inline-block text-6xl animate-[bob_2s_ease-in-out_infinite]" aria-hidden="true"><span className="inline-block animate-[wag_1.4s_ease-in-out_infinite]">🐶</span></span>
          <span className="relative block mt-3 text-[14px] font-semibold text-gray-700">{t('dogs.empty')}</span>
          <span className="relative mt-4 mx-auto w-11 h-11 rounded-full bg-teal-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform"><Icon name="plus" className="w-5 h-5" strokeWidth={2.6} /></span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {shown.map((d, i) => {
            const gift = d.forGift;
            const age = dogAge(d.birthday, t);
            const bday = birthdayLine(d.birthday, t);
            const plan = d.subscriptions?.some((s: any) => s.status === 'ACTIVE');
            return (
              <li key={d.id} className="animate-[fadeUp_0.4s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                <Link href={`/account/dogs/${d.id}`} aria-label={`${d.name} — ${t('dogs.open')}`}
                  className="group block bg-white rounded-3xl p-2 ring-1 ring-gray-200/60 hover:ring-teal-200 hover:-translate-y-0.5 transition-all">
                  <div className={`relative aspect-square rounded-[20px] overflow-hidden ${gift ? 'bg-lilac-50' : TINTS[i % TINTS.length]}`}>
                    {d.photoUrl
                      ? <DogPhoto src={d.photoUrl} alt={d.name} />
                      : <span className="absolute inset-0 flex items-center justify-center text-[52px]" aria-hidden="true"><span className="inline-block animate-[bob_2.6s_ease-in-out_infinite]"><span className="inline-block group-hover:animate-[wag_0.5s_ease-in-out_infinite]">{gift ? '🐕' : '🐶'}</span></span></span>}
                    <span className="absolute left-1/2 bottom-5 pointer-events-none" aria-hidden="true">
                      {[0, 1].map((k) => <span key={k} className="absolute opacity-0 text-[15px] group-hover:animate-[heartUp_1.3s_ease-out_infinite]" style={{ left: `${(k ? 1 : -1) * 12}px`, animationDelay: `${k * 0.35}s` }}>{gift ? '💜' : '💚'}</span>)}
                    </span>
                    {gift && <span className="absolute top-2 left-2 max-w-[80%] truncate h-6 px-2 rounded-full bg-white/90 text-[11px] font-bold text-lilac-600 inline-flex items-center gap-1" title={d.giftFor ? fill(t('dogs.giftFor'), { name: d.giftFor }) : t('dogs.giftDog')}>🎁 {d.giftFor || t('dogs.giftDog')}</span>}
                    {bday && <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-[14px] animate-[wiggle_2.4s_ease-in-out_infinite]" title={bday} aria-label={bday}>🎂</span>}
                  </div>
                  <div className="px-2 pt-2.5 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-extrabold text-gray-900 truncate">{d.name}</p>
                      {d.gender && <span className={`text-[13px] font-bold ${d.gender === 'MALE' ? 'text-teal-600' : 'text-lilac-600'}`}>{d.gender === 'MALE' ? '♂' : '♀'}</span>}
                      <svg className="ml-auto w-4 h-4 text-gray-300 group-hover:text-teal-600 transition-all group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                    </div>
                    <p className="text-[12px] text-gray-500 truncate">{[d.breed, age].filter(Boolean).join(' · ') || ' '}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {d.size && <span className="h-6 min-w-[1.5rem] px-1.5 rounded-full bg-gray-50 text-[11px] font-bold text-gray-600 flex items-center justify-center" title={t(`dog.size.${d.size}`)}>{SIZE_SHORT[d.size]}</span>}
                      {d.weightKg != null && <span className="h-6 px-2 rounded-full bg-gray-50 text-[11px] font-bold text-gray-600 flex items-center">{d.weightKg} {t('dog.kg')}</span>}
                      {d.allergies?.length > 0 && <span className="h-6 px-2 rounded-full bg-red-50 text-[11px] font-bold text-red-500 flex items-center" title={t('dogs.allergies')}>⚠ {d.allergies.length}</span>}
                      {plan && <span className="ml-auto w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center" title={t('dogs.planOn')}><Icon name="box" className="w-3.5 h-3.5" /></span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
          {tab !== 'gift' && (
            <li>
              <button type="button" onClick={openAdd} aria-label={t('dogs.add')} title={t('dogs.add')}
                className="group w-full h-full min-h-[220px] rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/40 transition-colors flex items-center justify-center">
                <span className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center group-hover:animate-[bob_1s_ease-in-out_infinite]"><Icon name="plus" className="w-6 h-6" strokeWidth={2.2} /></span>
              </button>
            </li>
          )}
        </ul>
      )}

      {/* Adding a dog: the step-by-step pop-up, then straight to the new dog's profile */}
      <DogEditor open={adding} onClose={() => setAdding(false)} onExpired={expired}
        onSaved={(dog) => router.push(`/account/dogs/${dog.id}?new=1`)} />
    </div>
  );
}
