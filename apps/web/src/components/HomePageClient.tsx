'use client';
import { useEffect, useRef, useState } from 'react';
import Link from '@/components/LangLink';
import { homePage, type StoredContent } from '@pupbox/content';
import PlanSection from '@/app/[lang]/prices/PlanSection';
import DogRunner from '@/components/DogRunner';
import BuildBoxPromo from '@/components/BuildBoxPromo';
import Accent from '@/components/Accent';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import { Icon, LineIcon } from '@/components/ui/icons';
import { Squiggle } from '@/components/ui/Heading';
import { GLOSSY_FOR_EMOJI, GlossyHeart, GlossyBox, GlossyPaw, GlossyPlan } from '@/components/Glossy3D';
import CtaGlow from '@/components/ui/CtaGlow';
import Caps from '@/components/ui/Caps';

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

/** bog.ge-style soft card colours, used in turn. */
const PASTEL = ['bg-pastel-sun', 'bg-pastel-peach', 'bg-pastel-lilac', 'bg-pastel-mint', 'bg-pastel-pink', 'bg-pastel-sky'];
/** A real dog photo and a line icon for each "how it works" step. */
const STEP_PHOTO = ['/images/hero/dog-2.jpg', '/images/hero/dog-6.jpg', '/images/hero/dog-5.jpg', '/images/hero/dog-1.jpg'];
const STEP_ICON = [GlossyPlan, GlossyPaw, GlossyBox, GlossyHeart];
/** Photos tilted into the wide box cards (computers), like bog's product pictures. */
const WIDE_PHOTO = ['/images/hero/dog-5.jpg', '/images/hero/dog-6.jpg', '/images/hero/dog-3.jpg'];
/** Faces for reviews without their own photo. */
const REVIEW_PHOTO = ['/images/hero/dog-6.jpg', '/images/hero/dog-5.jpg', '/images/hero/dog-1.jpg'];

/** Real dog photos for the hero, served from /public; where each dog sits in the frame. */
const HERO_PHOTOS = [
  { src: '/images/hero/dog-1.jpg', pos: 'object-[60%_40%]' },
  { src: '/images/hero/dog-2.jpg', pos: 'object-[55%_45%]' },
  { src: '/images/hero/dog-3.jpg', pos: 'object-[55%_62%]' },
];
const HERO_TINT = ['bg-teal-50', 'bg-lilac-50', 'bg-peach-50'];

/**
 * The hero slider, after bog.ge: one full-width card that stays put while its
 * insides change — colour, words, photo and button. The new slide always
 * comes in from the right (after the last one comes the first, never a jump
 * back). The current dot fills like a timer; hover pauses it; swipe on
 * phones. No auto-change for reduced motion. On load the card eases in and
 * the words rise one after another.
 * Slides: the monthly box (words and photo from admin), build your own, gift.
 */
function HeroSlider({ hero }: { hero: any }) {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);

  const slides = [
    {
      eyebrow: hero.badge ? label(hero.badge) : '', title: <Accent text={hero.heading} accent={hero.headingAccent} caps />,
      sub: hero.description, cta: hero.cta1Text ? label(hero.cta1Text) : '', href: hero.cta1Href, icon: 'box',
      photo: hero.imageUrl || HERO_PHOTOS[0].src, pos: HERO_PHOTOS[0].pos, alt: hero.imageAlt || '',
    },
    {
      eyebrow: t('home.s2.eyebrow'), title: <Caps text={t('home.s2.title')} />, sub: t('home.s2.sub'), cta: t('home.s2.cta'), href: '/build-box', icon: 'sparkle',
      photo: HERO_PHOTOS[1].src, pos: HERO_PHOTOS[1].pos, alt: '',
    },
    {
      eyebrow: t('home.s3.eyebrow'), title: <Caps text={t('home.s3.title')} />, sub: t('home.s3.sub'), cta: t('home.s3.cta'), href: '/prices?gift=true', icon: 'gift',
      photo: HERO_PHOTOS[2].src, pos: HERO_PHOTOS[2].pos, alt: '',
    },
  ];
  const n = slides.length;
  const go = (to: number) => {
    const next = ((to % n) + n) % n;
    if (next === i) return;
    setPrev(i);
    setI(next);
  };

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => go(i + 1), 7000);
    return () => clearTimeout(id);
  }, [i, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Where a slide's insides sit: shown, just left (going out), or waiting on the right. Only in and out animate. */
  const place = (k: number, [out, wait]: [string, string]) =>
    k === i ? 'translate-x-0 opacity-100 transition-all duration-700 ease-[cubic-bezier(.22,.8,.24,1)]'
    : k === prev ? `${out} opacity-0 transition-all duration-700 ease-[cubic-bezier(.22,.8,.24,1)] pointer-events-none`
    : `${wait} opacity-0 pointer-events-none`;

  return (
    <section aria-roledescription="carousel" className="relative px-4 sm:px-6 pt-3 sm:pt-5"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        const from = touch.current; touch.current = null;
        if (from === null) return;
        const dx = e.changedTouches[0].clientX - from;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      }}>
      <div className={`hero-in relative z-[2] max-w-7xl mx-auto overflow-hidden rounded-[24px] lg:rounded-[32px] transition-colors duration-700 ${HERO_TINT[i % HERO_TINT.length]} p-3 sm:p-5 lg:p-6 grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 md:gap-6 lg:gap-8 items-center`}>
        {/* The photo frame stays; photos slide through it */}
        <div className="md:order-2 relative aspect-[16/10] md:aspect-auto md:h-[300px] lg:h-[360px] rounded-[18px] lg:rounded-[24px] overflow-hidden bg-white/60">
          {slides.map((sl, k) => (
            <img key={k} src={sl.photo} alt={k === i ? sl.alt : ''} aria-hidden={k !== i} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : 'auto'}
              className={`absolute inset-0 w-full h-full object-cover ${sl.pos} ${place(k, ['-translate-x-full', 'translate-x-full'])}`} />
          ))}
          {/* Slide switches on the photo: big bars in a frosted pill; the current one fills like a timer */}
          <div className={`absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 flex items-center gap-1 rounded-full bg-black/25 backdrop-blur-md px-2 py-1 ${paused ? 'is-paused' : ''}`}>
            {slides.map((sl, k) => (
              <button key={k} type="button" onClick={() => go(k)} aria-label={String(sl.eyebrow || k + 1)} aria-current={k === i}
                className="group/dot h-7 px-1 flex items-center">
                <span className={`relative block h-2 rounded-full overflow-hidden transition-all duration-300 ${k === i ? 'w-12 sm:w-14 bg-white/40' : 'w-6 sm:w-8 bg-white/50 group-hover/dot:bg-white/80'}`}>
                  {k === i && <span key={i} className="fill-bar absolute inset-0 rounded-full bg-white" />}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* The words: all slides share one spot, so the card keeps its height */}
        <div className="grid px-2 pb-2 sm:px-3 md:pl-4 md:pr-0 md:pb-0 lg:pl-8">
          {slides.map((sl, k) => {
            const H = k === 0 ? 'h1' : 'h2';
            return (
              <div key={k} aria-hidden={k !== i} className={`[grid-area:1/1] min-w-0 self-center ${k === 0 ? 'hero-rise' : ''} ${place(k, ['-translate-x-12', 'translate-x-12'])}`}>
                {sl.eyebrow && <p className="text-[12.5px] font-bold text-teal-700 truncate">{sl.eyebrow}</p>}
                <H className="mt-1.5 text-[24px] leading-[1.15] sm:text-[30px] md:text-[28px] lg:text-[40px] font-extrabold tracking-tight text-gray-900 text-balance">{sl.title}</H>
                {sl.sub && <p className="mt-2.5 text-[14px] sm:text-[15.5px] leading-relaxed text-gray-600 max-w-md line-clamp-2">{sl.sub}</p>}
                {sl.cta && <CtaGlow href={sl.href} label={sl.cta} icon={sl.icon} className="mt-5" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * A section title: big, bold and centred (Georgian in capital letters), with
 * Pupbox's own touch — a sunny hand-drawn squiggle under it — and a short line.
 */
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-7 sm:mb-10 px-4">
      <h2 className="text-[23px] leading-tight sm:text-[32px] lg:text-[38px] font-extrabold tracking-tight text-gray-900 text-balance"><Caps text={title} /></h2>
      <Squiggle center />
      {sub && <p className="mt-2.5 text-[15px] sm:text-[16.5px] text-gray-500 text-balance">{sub}</p>}
    </div>
  );
}

/** Soft colours for the cards under the slider, in turn. */
const WAY_TINT = ['bg-teal-50 hover:bg-teal-100/70', 'bg-pastel-pink/60 hover:bg-pastel-pink', 'bg-pastel-lilac/60 hover:bg-pastel-lilac'];

/**
 * The ways to buy, under the slider: their own icon, title, short title,
 * description and link, edited in admin → Page Builder → Home Page →
 * "Cards under the slider". The icon emoji picks a glossy 3D picture.
 */
function Ways({ items }: { items: any[] }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t('home.ways')} className="px-4 sm:px-6 pt-3 sm:pt-4">
      <ul className="max-w-7xl mx-auto grid grid-cols-3 gap-2.5 sm:gap-4">
        {items.slice(0, 3).map((w: any, k: number) => {
          const Art = GLOSSY_FOR_EMOJI[w.icon] ?? GLOSSY_FOR_EMOJI[w.icon?.replace(/\uFE0F/g, '')];
          return (
            <li key={k}>
              <Link href={w.href || '/'} className={`group h-full flex flex-col sm:flex-row items-center gap-2 sm:gap-4 rounded-[20px] sm:rounded-[24px] ${WAY_TINT[k % WAY_TINT.length]} px-2 py-3 sm:px-5 sm:py-4 text-center sm:text-left transition-colors`}>
                <span className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center text-teal-600 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-6deg]">
                  {Art ? <Art className="w-full h-full" /> : <LineIcon emoji={w.icon} className="w-8 h-8" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] sm:text-[16px] font-extrabold text-gray-900 leading-tight">
                    <span className="sm:hidden"><Caps text={w.short || w.title} /></span><span className="hidden sm:inline"><Caps text={w.title} /></span>
                  </span>
                  {w.desc && <span className="hidden lg:block mt-0.5 text-[13px] leading-snug text-gray-600"><span className="line-clamp-2">{w.desc}</span></span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const STEP_MS = 6000;

/**
 * How it works, after bog.ge's changing feature block: a pastel card with a
 * dog photo on one side and the steps as a list on the other. The open step
 * shows its words and a bar that fills; then the next one opens. Click a step
 * to open it; hovering pauses; no auto-change for reduced motion.
 */
function Steps({ steps }: { steps: any[] }) {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const n = steps.length;
  useEffect(() => setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  useEffect(() => {
    if (paused || still) return;
    const id = setTimeout(() => setI((v) => (v + 1) % n), STEP_MS);
    return () => clearTimeout(id);
  }, [i, paused, still, n]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className={`grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-14 items-center ${paused ? 'is-paused' : ''}`}>
      {/* The picture card */}
      <div className={`relative rounded-[24px] lg:rounded-[32px] p-3 sm:p-5 transition-colors duration-500 ${PASTEL[(i + 2) % PASTEL.length]}`}>
        <div className="relative aspect-[16/10] sm:aspect-[4/3] rounded-[18px] lg:rounded-[24px] overflow-hidden bg-white">
          {steps.map((_, k) => (
            <img key={k} src={STEP_PHOTO[k % STEP_PHOTO.length]} alt="" loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${k === i ? 'opacity-100' : 'opacity-0'}`} />
          ))}
        </div>
        {/* A floating chip, like bog's little app cards */}
        <div key={i} className="absolute right-5 sm:right-[-14px] bottom-6 sm:bottom-12 flex items-center gap-2.5 rounded-2xl bg-white pl-2 pr-3.5 py-1.5 sm:py-2 shadow-[0_12px_30px_-12px_rgba(36,48,58,0.35)] animate-[fadeUp_0.4s_ease-out]">
          {(() => { const G = STEP_ICON[i % STEP_ICON.length]; return <G className="w-9 h-9" />; })()}
          <span className="text-[13px] font-semibold text-gray-800">{t(`home.chip${(i % 4) + 1}`)}</span>
        </div>
      </div>

      {/* The steps */}
      <ol className="space-y-2 lg:space-y-0 lg:divide-y lg:divide-gray-200 lg:border-y lg:border-gray-200">
        {steps.map((step: any, k: number) => {
          const on = k === i;
          return (
            <li key={k} className={`overflow-hidden rounded-[18px] lg:rounded-none transition-colors duration-300 ${on ? 'bg-teal-50 lg:bg-transparent' : 'bg-gray-50 lg:bg-transparent'}`}>
              <button type="button" onClick={() => setI(k)} aria-expanded={on}
                className={`w-full flex items-center gap-3 lg:gap-4 px-3.5 py-3 lg:px-0 lg:py-5 text-left transition-colors ${on ? 'text-gray-900' : 'text-gray-500 lg:text-gray-400 hover:text-gray-700'}`}>
                <span className={`shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-[13px] lg:text-[14px] font-extrabold transition-colors ${on ? 'bg-teal-600 text-white' : 'bg-white lg:bg-gray-100 text-gray-500'}`}>{k + 1}</span>
                <span className="text-[15px] sm:text-[17px] lg:text-[20px] font-extrabold leading-snug"><Caps text={step.title} /></span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-500 ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className="pl-[58px] pr-4 pb-4 lg:pl-[52px] lg:pr-0 lg:pb-5">
                    {step.desc && <p className="text-[14px] lg:text-[15px] leading-relaxed text-gray-600">{step.desc}</p>}
                    <Link href="/how-it-works" className="mt-2 lg:mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-teal-700 hover:text-teal-800">
                      {t('home.more')}<Icon name="arrow" className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
              {/* The bar under the open step fills until the next one opens */}
              <div className="relative h-[3px] lg:h-0.5 lg:-mt-px">
                {on && !still && <span key={i} className="fill-bar absolute inset-0 bg-teal-600" style={{ ['--dur' as any]: `${STEP_MS}ms` }} />}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * The home page, mobile first, after bog.ge: the hero slider, then sections
 * with big centred titles — how it works as a changing block, what's in the
 * box as soft pastel cards, plans, the game and reviews as photo cards.
 * Words, pictures and lists are edited in admin → Page Builder → Home Page.
 */
export default function HomePageClient({ plans, content, pricing }: Props) {
  const { t } = useLanguage();
  const c = usePage(homePage, content);
  const { hero, whatsInBox: box, howItWorks: hiw, testimonials } = c;
  // Wide cards in the box grid, so three rows close neatly on computers.
  const isWide = (k: number, total: number) => k === 0 || k === 3 || (k === total - 1 && total % 3 === 0 && k !== 3);
  let wides = 0;

  return (
    <main className="min-h-screen bg-white">
      {c.on('hero') && <HeroSlider hero={hero} />}
      {c.on('ways') && c.ways.items.length > 0 && <Ways items={c.ways.items} />}

      {/* ── HOW IT WORKS: bog's changing block ── */}
      {c.on('howItWorks') && hiw.steps.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20">
          <SectionHead title={hiw.heading} sub={t('home.hiwKicker')} />
          <Steps steps={hiw.steps.slice(0, 4)} />
        </section>
      )}

      {/* ── WHAT'S IN THE BOX: bog's pastel product cards ── */}
      {c.on('whatsInBox') && box.items.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20">
          <SectionHead title={box.heading} />
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {box.items.map((item: any, k: number) => {
              const wide = isWide(k, box.items.length);
              const photo = wide ? WIDE_PHOTO[wides++ % WIDE_PHOTO.length] : '';
              return (
              <li key={k} className={`group relative overflow-hidden rounded-[24px] ${PASTEL[k % PASTEL.length]} p-5 sm:p-6 min-h-[170px] sm:min-h-[200px] flex flex-col ${wide ? 'lg:col-span-2' : ''}`}>
                {photo && (
                  <img src={photo} alt="" loading="lazy"
                    className="hidden lg:block absolute right-28 top-1/2 -translate-y-1/2 h-[74%] aspect-[4/5] object-cover rounded-[20px] rotate-[-5deg] ring-[5px] ring-white shadow-[0_18px_40px_-18px_rgba(36,48,58,0.45)] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-[1.03]" />
                )}
                {/* A glossy 3D icon, edge to edge in the corner (Airbnb-style); a line icon if there's no match */}
                <span className="relative z-[1] self-end -mt-1 -mr-1 mb-auto w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-teal-600 transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[-6deg]">
                  {(() => { const G = GLOSSY_FOR_EMOJI[item.icon] ?? GLOSSY_FOR_EMOJI[item.icon?.replace(/\uFE0F/g, '')]; return G ? <G className="w-full h-full" /> : <LineIcon emoji={item.icon} className="w-10 h-10" strokeWidth={1.5} />; })()}
                </span>
                <h3 className={`relative mt-3 text-[17px] sm:text-[19px] font-extrabold text-gray-900 ${photo ? 'lg:max-w-[42%]' : ''}`}><Caps text={item.title} /></h3>
                {item.desc && <p className={`relative mt-1.5 text-[13.5px] sm:text-[14px] leading-relaxed text-gray-700 max-w-md ${photo ? 'lg:max-w-[42%]' : ''}`}>{item.desc}</p>}
              </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── PLANS ── */}
      {c.on('plans') && plans.length > 0 && (
        <section className="mt-12 sm:mt-20 py-12 sm:py-16 bg-pastel-grey" id="pricing">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHead title={c.plans.heading} />
            <PlanSection plans={plans} content={pricing} />
            <BuildBoxPromo />
          </div>
        </section>
      )}

      {/* ── BREAK TIME ── a small game: Pupbox isn't a standard shop */}
      <section className="pt-12 sm:pt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionHead title={t('game.break')} sub={t('game.breakSub')} />
          <DogRunner />
        </div>
      </section>

      {/* ── REVIEWS: bog's cards with a round photo on top ── placeholder reviews until launch, by decision */}
      {c.on('testimonials') && testimonials.items.length > 0 && (
        <section className="mt-12 sm:mt-20 pt-12 sm:pt-16 pb-14 sm:pb-20 bg-gradient-to-b from-pastel-grey to-white">
          <SectionHead title={testimonials.heading} />
          <ul className="max-w-6xl mx-auto flex md:grid md:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-4 px-4 sm:px-6 pt-14 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {testimonials.items.map((item: any, k: number) => (
              <li key={k} className="snap-start shrink-0 w-[82%] sm:w-[60%] md:w-auto">
                <figure className="relative h-full flex flex-col items-center text-center rounded-[28px] bg-white px-6 pt-16 pb-7 shadow-[0_14px_40px_-24px_rgba(36,48,58,0.35)]">
                  <img src={item.image || REVIEW_PHOTO[k % REVIEW_PHOTO.length]} alt="" loading="lazy"
                    className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full object-cover ring-[6px] ring-white bg-gray-100" />
                  <figcaption>
                    <span className="block text-[17px] font-extrabold text-gray-900"><Caps text={item.name} /></span>
                    <span className="block text-[13px] text-gray-500">{item.dog}</span>
                  </figcaption>
                  <div className="mt-3 flex gap-0.5 text-amber-400" aria-label="5/5">
                    {[0, 1, 2, 3, 4].map((s) => <Icon key={s} name="star" className="w-4 h-4 fill-current" />)}
                  </div>
                  <blockquote className="mt-3 flex-1 text-[14.5px] leading-relaxed text-gray-600">“{item.quote}”</blockquote>
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
