'use client';
import { useEffect, useRef, useState } from 'react';
import Link from '@/components/LangLink';
import { homePage, type StoredContent } from '@pupbox/content';
import PlanSection from '@/app/[lang]/prices/PlanSection';
import DogRunner from '@/components/DogRunner';
import BuildBoxPromo from '@/components/BuildBoxPromo';
import Accent from '@/components/Accent';
import SmartLink from '@/components/SmartLink';
import { BagIcon, BoxIcon, BuildIcon, DogIcon, GiftIcon, HeartIcon, ICON_FOR_EMOJI, PlanIcon } from '@/components/Icons3D';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/icons';

interface Props {
  plans: any[];
  content: StoredContent | null;
  /** Pricing Page content: the plan cards' words are edited there. */
  pricing: StoredContent | null;
}

/**
 * Button words typed in admin sometimes carry their own arrow ("Start →") or
 * emoji ("🎁 Gift"); the buttons draw their own, so those are taken off.
 */
const label = (s: string) => s.replace(/\s*[→›>]+\s*$/u, '').replace(/^\p{Extended_Pictographic}️?\s*/u, '').trim();

/** The four ways to buy, as Airbnb-style category tabs with 3D icons. */
const WAYS = [
  { key: 'box', href: '/prices#plans', Art: BoxIcon },
  { key: 'custom', href: '/build-box', Art: BuildIcon },
  { key: 'gift', href: '/prices?gift=true', Art: GiftIcon },
  { key: 'shop', href: '/shop', Art: BagIcon },
] as const;

const STEP_ART = [PlanIcon, DogIcon, BoxIcon, HeartIcon];
const STEP_TILE = ['bg-lilac-50', 'bg-rose-50', 'bg-teal-50', 'bg-rose-50'];
const BOX_TILE = ['bg-rose-50', 'bg-lilac-50', 'bg-teal-50'];

const btn = 'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-[15px] font-bold transition-colors';

/**
 * The hero as a slider: the monthly box (words and photo from admin), build
 * your own, and gift. Swipe on phones, round arrows on computers, dots on
 * both; it moves on by itself unless the visitor asks for reduced motion.
 */
function HeroSlider({ hero }: { hero: any }) {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);

  const slides = [
    {
      eyebrow: hero.badge, tint: 'bg-teal-50', tone: 'text-teal-700',
      title: <Accent text={hero.heading} accent={hero.headingAccent} />,
      sub: hero.description, cta: hero.cta1Text ? label(hero.cta1Text) : '', href: hero.cta1Href,
      visual: hero.imageUrl
        ? <img src={hero.imageUrl} alt={hero.imageAlt} className="w-full h-full object-cover" />
        : <BoxIcon className="w-48 h-48" />,
      photo: !!hero.imageUrl,
    },
    {
      eyebrow: t('home.s2.eyebrow'), tint: 'bg-lilac-50', tone: 'text-lilac-600',
      title: t('home.s2.title'), sub: t('home.s2.sub'), cta: t('home.s2.cta'), href: '/build-box',
      visual: <BuildIcon className="w-44 h-44 sm:w-64 sm:h-64" />, photo: false,
    },
    {
      eyebrow: t('home.s3.eyebrow'), tint: 'bg-rose-50', tone: 'text-rose-600',
      title: t('home.s3.title'), sub: t('home.s3.sub'), cta: t('home.s3.cta'), href: '/prices?gift=true',
      visual: <GiftIcon className="w-44 h-44 sm:w-64 sm:h-64" />, photo: false,
    },
  ];
  const n = slides.length;
  const go = (to: number) => setI(((to % n) + n) % n);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => go(i + 1), 6500);
    return () => clearTimeout(id);
  }, [i, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = slides[i];
  return (
    <section aria-roledescription="carousel" className="px-4 sm:px-6 pt-4 sm:pt-6">
      <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
        onTouchEnd={(e) => {
          const from = touch.current; touch.current = null;
          if (from === null) return;
          const dx = e.changedTouches[0].clientX - from;
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        }}
        className={`relative max-w-7xl mx-auto rounded-[28px] sm:rounded-[36px] overflow-hidden transition-colors duration-500 ${s.tint}`}>
        <div key={i} className="grid lg:grid-cols-[1.05fr_1fr] items-center gap-6 lg:gap-10 p-5 pb-16 sm:p-10 sm:pb-20 lg:p-14 lg:pb-20 animate-[fadeUp_0.45s_ease-out]">
          {/* Picture first on phones */}
          <div className="lg:order-2 flex justify-center">
            {s.photo ? (
              <div className="w-full aspect-[4/3] lg:aspect-[5/4] rounded-[22px] sm:rounded-[28px] overflow-hidden bg-white shadow-[0_24px_48px_-24px_rgba(18,48,42,0.35)]">{s.visual}</div>
            ) : (
              <div className="w-56 h-56 sm:w-80 sm:h-80 rounded-full bg-white flex items-center justify-center shadow-[0_24px_48px_-24px_rgba(18,48,42,0.3)]">{s.visual}</div>
            )}
          </div>
          <div className="text-center lg:text-left">
            {s.eyebrow && (
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-bold shadow-soft ${s.tone}`}>
                <Icon name="star" className="w-3.5 h-3.5 fill-current" />{s.eyebrow}
              </span>
            )}
            <h1 className="mt-4 text-[30px] leading-[1.15] sm:text-[42px] lg:text-[50px] font-extrabold tracking-tight text-gray-900 text-balance">{s.title}</h1>
            {s.sub && <p className="mt-3 text-[15px] sm:text-[17px] leading-relaxed text-gray-600 max-w-lg mx-auto lg:mx-0">{s.sub}</p>}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
              {s.cta && (
                <SmartLink href={s.href} className={`${btn} bg-teal-700 text-white hover:bg-teal-800 shadow-[0_12px_24px_-12px_rgba(26,133,116,0.8)]`}>
                  {s.cta}<Icon name="arrow" className="w-4 h-4" strokeWidth={2.6} />
                </SmartLink>
              )}
              <Link href="/how-it-works" className={`${btn} bg-white text-gray-900 hover:bg-gray-50`}>{t('nav.howItWorks')}</Link>
            </div>
            <ul className="mt-6 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-[13.5px] font-semibold text-gray-700">
              <li className="inline-flex items-center gap-1.5"><Icon name="truck" className="w-[18px] h-[18px] text-teal-600" />{t('home.chipDelivery')}</li>
              <li className="inline-flex items-center gap-1.5"><Icon name="repeat" className="w-[18px] h-[18px] text-teal-600" />{t('home.chipCancel')}</li>
            </ul>
          </div>
        </div>

        {/* Dots and arrows */}
        <div className="absolute inset-x-0 bottom-5 px-5 sm:px-10 lg:px-14 flex items-center justify-center lg:justify-between">
          <div className="flex items-center gap-2">
            {slides.map((sl, k) => (
              <button key={k} type="button" onClick={() => go(k)} aria-label={String(sl.eyebrow || k + 1)} aria-current={k === i}
                className={`h-2 rounded-full transition-all duration-300 ${k === i ? 'w-7 bg-gray-900' : 'w-2 bg-gray-900/20 hover:bg-gray-900/40'}`} />
            ))}
          </div>
          <div className="hidden lg:flex gap-2.5">
            <button type="button" onClick={() => go(i - 1)} aria-label={t('home.prev')} className="w-11 h-11 rounded-full bg-white ring-1 ring-black/5 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2)] flex items-center justify-center hover:scale-105 transition">
              <Icon name="arrow" className="w-4 h-4 rotate-180" strokeWidth={2.6} />
            </button>
            <button type="button" onClick={() => go(i + 1)} aria-label={t('home.next')} className="w-11 h-11 rounded-full bg-white ring-1 ring-black/5 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.2)] flex items-center justify-center hover:scale-105 transition">
              <Icon name="arrow" className="w-4 h-4" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A section title in the page's one style: bold, with an optional link on the right. */
function Title({ kicker, title, link }: { kicker?: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5 sm:mb-7">
      <div>
        {kicker && <p className="text-[13px] font-bold text-teal-700 mb-1">{kicker}</p>}
        <h2 className="text-[24px] sm:text-[32px] font-extrabold tracking-tight text-gray-900 text-balance">{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="shrink-0 text-[14px] font-bold text-gray-900 underline underline-offset-4 hover:text-teal-700">{link.label}</Link>
      )}
    </div>
  );
}

/**
 * The home page, mobile first: the four ways to buy as category tabs, the
 * hero slider, how it works, what's in the box, plans, the game and reviews.
 * Words, pictures and lists are edited in admin → Page Builder → Home Page.
 */
export default function HomePageClient({ plans, content, pricing }: Props) {
  const { t } = useLanguage();
  const c = usePage(homePage, content);
  const { hero, whatsInBox: box, howItWorks: hiw, testimonials } = c;

  return (
    <main className="min-h-screen bg-white">
      {/* ── WAYS TO SHOP: Airbnb-style tabs with 3D icons ── */}
      <nav aria-label={t('home.ways')} className="border-b border-gray-100">
        <ul className="max-w-3xl mx-auto grid grid-cols-4 px-2 sm:px-6">
          {WAYS.map(({ key, href, Art }) => (
            <li key={key}>
              <Link href={href} className="group flex flex-col items-center gap-1.5 pt-3 pb-3 sm:pb-4 text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-900 transition-colors">
                <Art className="w-11 h-11 sm:w-14 sm:h-14 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105" />
                <span className="text-[11.5px] sm:text-[13.5px] font-semibold text-center leading-tight">
                  <span className="sm:hidden">{t(`ways.${key}.short`)}</span>
                  <span className="hidden sm:inline">{t(`ways.${key}.t`)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {c.on('hero') && <HeroSlider hero={hero} />}

      {/* ── HOW IT WORKS ── */}
      {c.on('howItWorks') && hiw.steps.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20">
          <Title kicker={t('home.hiwKicker')} title={hiw.heading} link={{ href: '/how-it-works', label: t('home.more') }} />
          {/* A progress track over the cards, on computers */}
          <div className="hidden lg:block relative h-2.5 rounded-full bg-teal-50 mx-[11%] mb-5" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-teal-600" />
          </div>
          <ol className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hiw.steps.slice(0, 4).map((step: any, i: number) => {
              const Art = STEP_ART[i % STEP_ART.length];
              return (
                <li key={i} className="flex lg:flex-col items-center lg:items-stretch gap-4 rounded-3xl bg-white ring-1 ring-gray-100 p-3 sm:p-4 lg:p-5 shadow-[0_8px_24px_-18px_rgba(18,48,42,0.35)] hover:-translate-y-1 hover:shadow-[0_18px_36px_-20px_rgba(18,48,42,0.35)] transition-all">
                  <div className={`shrink-0 w-[88px] h-[88px] lg:w-full lg:h-36 rounded-2xl ${STEP_TILE[i % STEP_TILE.length]} flex items-center justify-center`}>
                    <Art className="w-16 h-16 lg:w-24 lg:h-24" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-[12px] font-extrabold flex items-center justify-center">{i + 1}</span>
                      <span className="text-[11.5px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{t(`home.chip${i + 1}`)}</span>
                    </div>
                    <h3 className="text-[16px] sm:text-[17px] font-extrabold text-gray-900">{step.title}</h3>
                    {step.desc && <p className="mt-0.5 text-[13.5px] leading-snug text-gray-500 line-clamp-2 lg:line-clamp-none">{step.desc}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ── WHAT'S IN THE BOX: listing cards, swipe on phones ── */}
      {c.on('whatsInBox') && box.items.length > 0 && (
        <section className="max-w-7xl mx-auto pt-12 sm:pt-20">
          <div className="px-4 sm:px-6"><Title title={box.heading} /></div>
          <ul className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scroll-px-4 px-4 sm:px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {box.items.map((item: any, i: number) => {
              const Art = ICON_FOR_EMOJI[item.icon];
              return (
                <li key={i} className="snap-start shrink-0 w-[72%] sm:w-auto group">
                  <div className={`aspect-[4/3] sm:aspect-[16/10] lg:aspect-[2/1] rounded-[22px] ${BOX_TILE[i % BOX_TILE.length]} flex items-center justify-center overflow-hidden`}>
                    {Art
                      ? <Art className="w-28 h-28 sm:w-32 sm:h-32 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" />
                      : <span className="text-6xl" aria-hidden="true">{item.icon}</span>}
                  </div>
                  <h3 className="mt-3 text-[16px] font-extrabold text-gray-900">{item.title}</h3>
                  {item.desc && <p className="mt-0.5 text-[13.5px] leading-snug text-gray-500 line-clamp-2">{item.desc}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── PLANS ── */}
      {c.on('plans') && plans.length > 0 && (
        <section className="mt-12 sm:mt-20 py-12 sm:py-16 bg-[#FFF7F9]" id="pricing">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Heading kind="section" align="center" title={c.plans.heading} subtitle={c.plans.description || undefined} />
            <PlanSection plans={plans} content={pricing} />
            <BuildBoxPromo />
          </div>
        </section>
      )}

      {/* ── BREAK TIME ── a small game: Pupbox isn't a standard shop */}
      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Heading kind="section" align="center" title={t('game.break')} subtitle={t('game.breakSub')} />
          <DogRunner />
        </div>
      </section>

      {/* ── REVIEWS ── placeholder reviews until launch, by decision */}
      {c.on('testimonials') && testimonials.items.length > 0 && (
        <section className="max-w-7xl mx-auto pb-14 sm:pb-20">
          <div className="px-4 sm:px-6"><Title title={testimonials.heading} /></div>
          <ul className="flex md:grid md:grid-cols-3 gap-4 sm:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-4 px-4 sm:px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {testimonials.items.map((item: any, i: number) => (
              <li key={i} className="snap-start shrink-0 w-[84%] sm:w-[60%] md:w-auto">
                <figure className="h-full flex flex-col rounded-3xl bg-white ring-1 ring-gray-100 p-5 shadow-[0_8px_24px_-18px_rgba(18,48,42,0.35)]">
                  <div className="flex gap-0.5 text-gray-900" aria-label="5/5">
                    {[0, 1, 2, 3, 4].map((k) => <Icon key={k} name="star" className="w-4 h-4 fill-current" />)}
                  </div>
                  <blockquote className="mt-3 flex-1 text-[14.5px] leading-relaxed text-gray-700">“{item.quote}”</blockquote>
                  <figcaption className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                    {item.image
                      ? <img src={item.image} alt="" className="w-11 h-11 rounded-full object-cover bg-gray-100" />
                      : <span className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center"><DogIcon className="w-9 h-9" /></span>}
                    <span>
                      <span className="block font-bold text-gray-900 text-[14px]">{item.name}</span>
                      <span className="block text-[12.5px] text-gray-500">{item.dog}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
