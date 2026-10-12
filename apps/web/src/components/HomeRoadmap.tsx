'use client';
import Link from '@/components/LangLink';
import { useLanguage } from '@/context/LanguageContext';
import { Icon } from '@/components/ui/icons';
import FadeIn from '@/components/FadeIn';

type Step = { icon?: string; title: string; desc?: string };

/** Soft colours, one per stop along the road. */
const TONES = [
  { pin: 'ring-teal-100 text-teal-600', soft: 'bg-teal-50', card: 'from-teal-50/80' },
  { pin: 'ring-lilac-100 text-lilac-600', soft: 'bg-lilac-50', card: 'from-lilac-50/80' },
  { pin: 'ring-sky-100 text-sky-600', soft: 'bg-sky-50', card: 'from-sky-50/80' },
  { pin: 'ring-rose-100 text-rose-500', soft: 'bg-rose-50', card: 'from-rose-50/80' },
];

/** The four ways to buy, shown as icon tiles on the first stop. */
const WAYS = [
  { key: 'box', icon: 'box', href: '/prices#plans', tone: 'bg-teal-50 text-teal-600 hover:bg-teal-100' },
  { key: 'custom', icon: 'sparkle', href: '/build-box', tone: 'bg-lilac-50 text-lilac-600 hover:bg-lilac-100' },
  { key: 'gift', icon: 'gift', href: '/prices?gift=true', tone: 'bg-rose-50 text-rose-500 hover:bg-rose-100' },
  { key: 'shop', icon: 'bag', href: '/shop', tone: 'bg-sky-50 text-sky-600 hover:bg-sky-100' },
] as const;

/*
 * The road, drawn in a 1000×200 box: it rises and falls between the stops.
 * Stops sit on it at x = 125, 375, 625, 875 and y = 40 / 160 (20% / 80%).
 */
const ROAD = 'M0,100 C125,20 125,20 250,100 S375,180 500,100 S625,20 750,100 S875,180 1000,100';
const STOP_X = ['12.5%', '37.5%', '62.5%', '87.5%'];
const COL = ['col-start-1', 'col-start-2', 'col-start-3', 'col-start-4'];

function Ways() {
  const { t } = useLanguage();
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {WAYS.map((w) => (
        <Link key={w.key} href={w.href} aria-label={t(`ways.${w.key}.t`)}
          className="group/way relative flex flex-col items-center gap-1">
          <span className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover/way:-translate-y-0.5 ${w.tone}`}>
            <Icon name={w.icon} className="w-5 h-5" />
          </span>
          <span className="lg:hidden text-[10.5px] leading-tight text-gray-500 text-center whitespace-nowrap">{t(`ways.${w.key}.short`)}</span>
          {/* Hover label on wide screens */}
          <span role="tooltip" className="pointer-events-none absolute bottom-full mb-1.5 hidden lg:group-hover/way:block lg:group-focus-visible/way:block whitespace-nowrap rounded-lg bg-gray-800 text-white text-[11px] font-medium px-2 py-1 z-30 animate-[fadeIn_0.12s_ease-out]">
            {t(`ways.${w.key}.t`)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function Card({ step, i }: { step: Step; i: number }) {
  const tone = TONES[i % TONES.length];
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${tone.card} to-white ring-1 ring-gray-100 p-4 sm:p-5`}>
      <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900">{step.title}</h3>
      {step.desc && <p className="hidden sm:block mt-1 text-[13px] text-gray-500 leading-relaxed">{step.desc}</p>}
      {i === 0 && <Ways />}
    </div>
  );
}

function Pin({ i, className = '' }: { i: number; className?: string }) {
  const tone = TONES[i % TONES.length];
  return (
    <span className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white ring-[6px] shadow-soft flex items-center justify-center text-[18px] lg:text-[20px] font-extrabold ${tone.pin} ${className}`}>
      {i + 1}
    </span>
  );
}

/**
 * How it works, as a road: numbered stops from choosing a way to buy (the
 * four ways sit on the first stop) to a happy dog at the finish. Across the
 * page on wide screens, top to bottom on phones. The steps' words come from
 * admin → Page Builder → Home Page → How it works.
 */
export default function HomeRoadmap({ steps }: { steps: Step[] }) {
  const { t } = useLanguage();
  const stops = steps.slice(0, 4);
  if (!stops.length) return null;

  return (
    <section className="py-12 sm:py-16 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl sm:text-[26px] font-extrabold tracking-tight text-gray-900 text-center mb-8 sm:mb-12 text-balance">{t('home.roadTitle')}</h2>

        {/* Wide screens: the road runs across, cards above and below it. */}
        <div className="hidden lg:grid grid-cols-4 gap-x-6">
          {stops.map((s, i) => i % 2 === 0 && (
            <FadeIn key={`t${i}`} delay={i * 120} className={`row-start-1 self-end pb-4 ${COL[i]}`}>
              <Card step={s} i={i} />
            </FadeIn>
          ))}
          <div className="row-start-2 col-span-4 relative h-40">
            <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
              <path d={ROAD} fill="none" className="stroke-teal-100" strokeWidth={34} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <path d={ROAD} fill="none" className="stroke-white road-dash" strokeWidth={3} strokeDasharray="14 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white ring-1 ring-gray-100 shadow-soft text-teal-600 flex items-center justify-center" title={t('home.roadStart')}>
              <Icon name="home" className="w-4 h-4" />
            </span>
            {stops.map((_, i) => (
              <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: STOP_X[i], top: i % 2 === 0 ? '20%' : '80%' }}>
                <Pin i={i} />
              </span>
            ))}
            <span className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center gap-2" title={t('home.roadEnd')}>
              <span className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-100 shadow-soft text-rose-500 flex items-center justify-center"><Icon name="heart" className="w-4 h-4" /></span>
            </span>
          </div>
          {stops.map((s, i) => i % 2 === 1 && (
            <FadeIn key={`b${i}`} delay={i * 120} className={`row-start-3 pt-4 ${COL[i]}`}>
              <Card step={s} i={i} />
            </FadeIn>
          ))}
        </div>

        {/* Phones & tablets: the road runs down the left. */}
        <ol className="lg:hidden relative pl-16 space-y-5">
          <span aria-hidden="true" className="absolute left-[18px] top-3 bottom-3 w-3 rounded-full bg-teal-100" />
          <span aria-hidden="true" className="absolute left-[23px] top-5 bottom-5 border-l-2 border-dashed border-white" />
          {stops.map((s, i) => (
            <li key={i} className="relative">
              <Pin i={i} className="absolute -left-16 top-2" />
              <Card step={s} i={i} />
            </li>
          ))}
          <li className="relative flex items-center gap-3 h-12">
            <span className="absolute -left-16 w-12 h-12 rounded-full bg-white ring-[6px] ring-rose-100 shadow-soft text-rose-500 flex items-center justify-center"><Icon name="heart" className="w-5 h-5" /></span>
            <span className="text-[15px] font-bold text-gray-900">{t('home.roadEnd')}</span>
          </li>
        </ol>
      </div>
    </section>
  );
}
