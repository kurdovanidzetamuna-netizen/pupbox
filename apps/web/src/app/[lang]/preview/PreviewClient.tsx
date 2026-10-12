'use client';
/**
 * Design preview: three warmer green palettes and two big-photo hero
 * versions, so the owner can pick before the home page changes.
 * Not linked from anywhere and kept out of search results.
 */
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import { BagIcon, BoxIcon, BuildIcon, GiftIcon } from '@/components/Icons3D';

const PALETTES = [
  { key: 'A', name: 'Leaf', brand: '#2F9E5E', dark: '#22784A', tint: '#ECF7EF', accent: '#FF6B8E', accentTint: '#FFF0F4', cream: '#FCFBF7' },
  { key: 'B', name: 'Grass + lilac', brand: '#3FA34D', dark: '#2E7F3B', tint: '#EFF8EA', accent: '#8B6CF6', accentTint: '#F3EFFF', cream: '#FBFCF7' },
  { key: 'C', name: 'Sage + rose', brand: '#4E9F72', dark: '#3B7D58', tint: '#EEF5EF', accent: '#E86A8F', accentTint: '#FCEFF3', cream: '#FFFBF8' },
  { key: 'Now', name: 'Current teal', brand: '#16B492', dark: '#0E7C66', tint: '#EAF8F4', accent: '#7C5CFA', accentTint: '#F3EFFF', cream: '#FFFFFF' },
] as const;

const PHOTO = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;
const SLIDES = [
  { photo: PHOTO('photo-1587300003388-59208cc962cb'), kicker: 'ყოველთვიური ყუთი', title: 'შენი ძაღლი იმსახურებს სიურპრიზს ყოველ თვე', cta: 'გამოწერის დაწყება' },
  { photo: PHOTO('photo-1548199973-03cce0bbc87b'), kicker: 'ააწყე შენი ყუთი', title: 'შენ ირჩევ ყველაფერს, ჩვენ ვფუთავთ', cta: 'ყუთის აწყობა' },
  { photo: PHOTO('photo-1517849845537-4d257902454a'), kicker: 'საჩუქარი', title: 'საუკეთესო საჩუქარი ძაღლის მოყვარულს', cta: 'აჩუქე ყუთი' },
];

/** A photo that falls back to a soft tint if it can't load. */
function Photo({ src, className = '' }: { src: string; className?: string }) {
  const [ok, setOk] = useState(true);
  return ok
    ? <img src={src} alt="" onError={() => setOk(false)} className={`w-full h-full object-cover ${className}`} />
    : <div className={`w-full h-full bg-[var(--tint)] flex items-center justify-center ${className}`}><Icon name="paw" className="w-12 h-12 text-[var(--brand)] opacity-40" /></div>;
}

/** Slow crossfade, paused for reduced motion. */
function useSlide(n: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI(v => (v + 1) % n), 7000);
    return () => clearInterval(id);
  }, [n]);
  return [i, setI] as const;
}

function Dots({ i, set, light = false }: { i: number; set: (n: number) => void; light?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {SLIDES.map((_, k) => (
        <button key={k} type="button" aria-label={`${k + 1}`} onClick={() => set(k)}
          style={{ opacity: k === i ? 1 : 0.35 }}
          className={`h-2 rounded-full transition-all duration-500 ${k === i ? 'w-6' : 'w-2'} ${light ? 'bg-white' : 'bg-[var(--brand)]'}`} />
      ))}
    </div>
  );
}

const Btn = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-[var(--brand)] text-white text-[15px] font-bold shadow-[0_10px_24px_-10px_var(--brand)]">
    {children}<Icon name="arrow" className="w-4 h-4" />
  </span>
);

/** Version 1: big photo first, text under it (mobile) / beside it (desktop). */
function HeroPhotoTop() {
  const [i, set] = useSlide(SLIDES.length);
  return (
    <section className="bg-[var(--tint)] rounded-[32px] p-3 sm:p-4 lg:p-6">
      <div className="grid lg:grid-cols-[1fr_1.25fr] gap-5 lg:gap-10 items-center">
        <div className="relative lg:order-2 aspect-[4/5] sm:aspect-[16/11] lg:aspect-[5/4] max-h-[44vh] lg:max-h-none w-full rounded-[26px] lg:rounded-[30px] overflow-hidden">
          {SLIDES.map((s, k) => (
            <div key={k} className={`absolute inset-0 transition-opacity duration-1000 ${k === i ? 'opacity-100' : 'opacity-0'}`}><Photo src={s.photo} /></div>
          ))}
          <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-gray-800">
            <Icon name="truck" className="w-4 h-4 text-[var(--brand)]" />უფასო მიწოდება
          </span>
        </div>
        <div className="text-center lg:text-left px-2 pb-3 lg:pb-0 lg:pl-6">
          <p className="text-[13px] font-bold text-[var(--dark)]">{SLIDES[i].kicker}</p>
          <h2 className="mt-1.5 text-[25px] sm:text-[34px] lg:text-[46px] leading-[1.15] font-extrabold text-gray-900">{SLIDES[i].title}</h2>
          <div className="mt-4"><Btn>{SLIDES[i].cta}</Btn></div>
          <div className="mt-5 flex justify-center lg:justify-start"><Dots i={i} set={set} /></div>
        </div>
      </div>
    </section>
  );
}

/** Version 2: the photo fills the whole card, text sits on it. */
function HeroOverlay() {
  const [i, set] = useSlide(SLIDES.length);
  return (
    <section className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9] max-h-[78vh] w-full rounded-[30px] lg:rounded-[36px] overflow-hidden">
      {SLIDES.map((s, k) => (
        <div key={k} className={`absolute inset-0 transition-opacity duration-1000 ${k === i ? 'opacity-100' : 'opacity-0'}`}><Photo src={s.photo} /></div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#10261a]/75 via-[#10261a]/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 lg:inset-y-0 lg:right-auto lg:w-1/2 p-6 sm:p-8 lg:p-14 flex flex-col justify-end lg:justify-center items-center lg:items-start text-center lg:text-left">
        <span className="rounded-full bg-white/90 px-3 py-1 text-[12px] font-bold text-[var(--dark)]">{SLIDES[i].kicker}</span>
        <h2 className="mt-3 text-[27px] sm:text-[34px] lg:text-[46px] leading-[1.15] font-extrabold text-white">{SLIDES[i].title}</h2>
        <div className="mt-5"><Btn>{SLIDES[i].cta}</Btn></div>
        <div className="mt-6"><Dots i={i} set={set} light /></div>
      </div>
    </section>
  );
}

/** A few real bits of the page so the colours can be judged in context. */
function Sample() {
  const ways = [[BoxIcon, 'ყუთი'], [BuildIcon, 'ააწყე'], [GiftIcon, 'საჩუქარი'], [BagIcon, 'მაღაზია']] as const;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 rounded-[26px] bg-white p-3 shadow-[0_10px_30px_-18px_rgba(20,60,40,.35)]">
        {ways.map(([Art, t]) => (
          <div key={t} className="flex flex-col items-center gap-1"><Art className="w-11 h-11" /><span className="text-[12px] font-semibold text-gray-700">{t}</span></div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-[26px] bg-[var(--accentTint)] p-5">
          <div className="inline-flex p-1 rounded-full bg-white">
            <span className="h-10 px-3 rounded-full bg-[var(--tint)] inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-bold text-[var(--dark)]"><Icon name="paw" className="w-[18px] h-[18px]" />ჩემი ძაღლისთვის</span>
            <span className="h-10 px-3 rounded-full inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-bold text-gray-500"><Icon name="gift" className="w-[18px] h-[18px]" />საჩუქრად</span>
          </div>
          <p className="mt-4 text-[22px] font-extrabold text-gray-900">₾44.99<span className="text-[14px] font-semibold text-gray-500"> / თვეში</span></p>
          <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white bg-[var(--accent)]">დაზოგე 10%</span>
        </div>
        <div className="rounded-[26px] bg-[var(--cream)] ring-1 ring-black/5 p-5">
          <p className="text-[13px] font-bold text-[var(--dark)]">4 მარტივი ნაბიჯი</p>
          <p className="mt-1 text-[20px] font-extrabold text-gray-900">როგორ მუშაობს</p>
          <div className="mt-3 flex items-center gap-2">
            {[1, 2, 3, 4].map(n => <span key={n} className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-[13px] font-bold ${n === 1 ? 'bg-[var(--brand)] text-white' : 'bg-[var(--tint)] text-[var(--dark)]'}`}>{n}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreviewClient() {
  const [p, setP] = useState(0);
  const pal = PALETTES[p];
  const vars = { '--brand': pal.brand, '--dark': pal.dark, '--tint': pal.tint, '--accent': pal.accent, '--accentTint': pal.accentTint, '--cream': pal.cream } as React.CSSProperties;
  return (
    <div style={vars} className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="sticky top-16 z-20 -mx-4 px-4 py-3 bg-white/90 backdrop-blur border-b border-gray-100 flex items-center lg:justify-center gap-2 overflow-x-auto [scrollbar-width:none]">
        {PALETTES.map((x, k) => (
          <button key={x.key} type="button" onClick={() => setP(k)}
            className={`shrink-0 inline-flex items-center gap-2 h-10 pl-1.5 pr-3.5 rounded-full text-[13px] font-bold transition-colors ${k === p ? 'bg-gray-100 text-gray-900 ring-2 ring-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}>
            <span className="flex -space-x-1.5">
              <span className="w-6 h-6 rounded-full ring-2 ring-white" style={{ background: x.brand }} />
              <span className="w-6 h-6 rounded-full ring-2 ring-white" style={{ background: x.accent }} />
              <span className="w-6 h-6 rounded-full ring-2 ring-white" style={{ background: x.tint }} />
            </span>
            {x.key} · {x.name}
          </button>
        ))}
      </div>

      <h1 className="mt-8 mb-3 text-[15px] font-extrabold text-gray-500">Hero 1 — photo first, text under it</h1>
      <HeroPhotoTop />

      <h2 className="mt-12 mb-3 text-[15px] font-extrabold text-gray-500">Hero 2 — text on the photo</h2>
      <HeroOverlay />

      <h2 className="mt-12 mb-3 text-[15px] font-extrabold text-gray-500">The colours in other parts of the page</h2>
      <Sample />
    </div>
  );
}
