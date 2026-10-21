'use client';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import DogEditor from '@/components/DogEditor';
import DogPhoto from '@/components/DogPhoto';
import PawTrail from '@/components/PawTrail';
import { Icon } from '@/components/ui/icons';
import { dogAge, SIZE_SHORT } from '@/lib/dog';

const TINTS = ['bg-teal-50', 'bg-lilac-50', 'bg-sky-50', 'bg-teal-50/60'];

/**
 * "Who's this box for?" — the customer's dogs as little cards to tap, the
 * same faces as on My dogs. Adding a dog here opens the very same
 * step-by-step pop-up as My dogs, and the new dog is picked straight away.
 * The chosen dog gets a tick and a line underneath (with Edit), and a
 * gentle nudge if we still don't know their size.
 */
export default function DogChooser({ dogs, value, onChange, onDogsChange, onExpired, error }: {
  dogs: any[];
  value: string | null;
  onChange: (id: string) => void;
  onDogsChange: (dogs: any[]) => void;
  onExpired?: () => void;
  error?: string;
}) {
  const { t } = useLanguage();
  // null: closed; 'new': adding; a dog: editing it.
  const [editor, setEditor] = useState<any | 'new' | null>(null);
  const chosen = dogs.find((d) => d.id === value);

  function saved(dog: any) {
    const known = dogs.some((d) => d.id === dog.id);
    onDogsChange(known ? dogs.map((d) => (d.id === dog.id ? { ...d, ...dog } : d)) : [...dogs, dog]);
    onChange(dog.id);
    setEditor(null);
  }

  const editorEl = (
    <DogEditor open={editor !== null} dog={editor === 'new' ? undefined : editor ?? undefined}
      onClose={() => setEditor(null)} onSaved={saved} onExpired={onExpired} />
  );

  // No dogs yet: one big friendly card that opens the pop-up.
  if (!dogs.length) {
    return (
      <>
        <button type="button" onClick={() => setEditor('new')}
          className={`group relative w-full overflow-hidden rounded-[28px] py-10 px-6 text-center transition-colors ${error ? 'bg-red-50 ring-1 ring-red-200' : 'bg-teal-50/70 hover:bg-teal-50'}`}>
          <PawTrail />
          <span className="relative inline-block text-6xl motion-safe:animate-[bob_2s_ease-in-out_infinite]" aria-hidden="true"><span className="inline-block motion-safe:animate-[wag_1.4s_ease-in-out_infinite]">🐶</span></span>
          <span className="relative block mt-3 text-[17px] font-extrabold text-gray-900">{t('co.dog.emptyTitle')}</span>
          <span className="relative block mt-1 text-[13px] text-gray-600 max-w-xs mx-auto">{t('co.dog.emptySub')}</span>
          <span className="relative mt-5 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-teal-600 text-white text-[14px] font-bold shadow-[0_10px_24px_-12px_rgba(13,148,136,0.9)] group-hover:bg-teal-700 transition-colors">
            <Icon name="plus" className="w-5 h-5" strokeWidth={2.6} />{t('co.dog.add')}
          </span>
        </button>
        {error && <p className="mt-2 px-1 text-[12.5px] font-semibold text-red-500" role="alert">{error}</p>}
        {editorEl}
      </>
    );
  }

  return (
    <>
      <ul role="radiogroup" aria-label={t('co.dog.which')} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {dogs.map((d, i) => {
          const on = d.id === value;
          const age = dogAge(d.birthday, t);
          return (
            <li key={d.id} className="motion-safe:animate-[fadeUp_0.35s_ease-out_both]" style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}>
              <button type="button" role="radio" aria-checked={on} onClick={() => onChange(d.id)}
                className={`group relative w-full text-left rounded-3xl p-2 transition-all duration-200 ${on
                  ? 'bg-teal-50 ring-2 ring-teal-500 shadow-[0_12px_28px_-16px_rgba(13,148,136,0.8)]'
                  : 'bg-white ring-1 ring-gray-200/70 hover:ring-teal-200 hover:-translate-y-0.5'}`}>
                <span className={`relative block aspect-[5/4] rounded-[20px] overflow-hidden ${TINTS[i % TINTS.length]}`}>
                  {d.photoUrl
                    ? <DogPhoto src={d.photoUrl} alt={d.name} size="w-[60%]" />
                    : <span className="absolute inset-0 flex items-center justify-center text-[44px]" aria-hidden="true"><span className={`inline-block ${on ? 'motion-safe:animate-[wag_0.6s_ease-in-out_3]' : 'motion-safe:animate-[bob_2.6s_ease-in-out_infinite]'}`}>🐶</span></span>}
                  {/* Hearts float up from the one you pick */}
                  {on && (
                    <span className="absolute left-1/2 bottom-4 pointer-events-none" aria-hidden="true">
                      {[0, 1, 2].map((k) => <span key={k} className="absolute opacity-0 text-[14px] motion-safe:animate-[heartUp_1.2s_ease-out_both]" style={{ left: `${(k - 1) * 14}px`, animationDelay: `${k * 0.15}s` }}>💚</span>)}
                    </span>
                  )}
                </span>
                {/* The tick: an empty ring until picked */}
                <span className={`absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${on ? 'bg-teal-600 text-white ring-[3px] ring-white motion-safe:animate-[pop_0.3s_ease-out]' : 'bg-white/90 ring-1 ring-gray-200'}`} aria-hidden="true">
                  {on && <Icon name="check" className="w-3.5 h-3.5" strokeWidth={3.2} />}
                </span>
                <span className="block px-1.5 pt-2.5 pb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[15px] font-extrabold text-gray-900 truncate">{d.name}</span>
                    {d.gender && <span className={`text-[13px] font-bold ${d.gender === 'MALE' ? 'text-teal-600' : 'text-lilac-600'}`} aria-hidden="true">{d.gender === 'MALE' ? '♂' : '♀'}</span>}
                    {d.size && <span className="ml-auto shrink-0 h-5 min-w-[1.25rem] px-1.5 rounded-full bg-white text-[10.5px] font-bold text-gray-600 ring-1 ring-gray-200/80 flex items-center justify-center" title={t(`dog.size.${d.size}`)}>{SIZE_SHORT[d.size]}</span>}
                  </span>
                  <span className="block text-[12px] text-gray-500 truncate">{[d.breed, age].filter(Boolean).join(' · ') || ' '}</span>
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => setEditor('new')}
            className="group w-full h-full min-h-[150px] rounded-3xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/40 transition-colors flex flex-col items-center justify-center gap-2 px-3">
            <span className="w-11 h-11 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center group-hover:motion-safe:animate-[bob_1s_ease-in-out_infinite]"><Icon name="plus" className="w-5 h-5" strokeWidth={2.4} /></span>
            <span className="text-[13px] font-bold text-center">{t('co.dog.add')}</span>
          </button>
        </li>
      </ul>

      {/* What happens with the pick — and a nudge when the size is missing */}
      {chosen ? (
        <div key={chosen.id} className={`mt-4 flex items-center gap-3 rounded-[20px] px-4 py-3 motion-safe:animate-[fadeUp_0.25s_ease-out] ${chosen.size ? 'bg-teal-50/70' : 'bg-amber-50'}`}>
          <span className="text-[22px] shrink-0" aria-hidden="true">{chosen.size ? '📦' : '📏'}</span>
          <p className="flex-1 min-w-0 text-[13px] leading-snug text-gray-700">
            {fill(t(chosen.size ? 'co.dog.picked' : 'co.dog.needSize'), { name: chosen.name })}
          </p>
          <button type="button" onClick={() => setEditor(chosen)}
            className="shrink-0 h-9 px-3.5 rounded-full bg-white text-[12.5px] font-bold text-teal-700 ring-1 ring-teal-200 hover:bg-teal-600 hover:text-white hover:ring-teal-600 transition-colors">
            {t(chosen.size ? 'co.dog.edit' : 'co.dog.addSize')}
          </button>
        </div>
      ) : error ? (
        <p className="mt-3 px-1 text-[12.5px] font-semibold text-red-500" role="alert">{error}</p>
      ) : null}

      {editorEl}
    </>
  );
}
