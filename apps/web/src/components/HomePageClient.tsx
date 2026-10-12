'use client';
import { homePage, type StoredContent } from '@pupbox/content';
import FadeIn from '@/components/FadeIn';
import PlanSection from '@/app/[lang]/prices/PlanSection';
import HeroAnimate from '@/components/HeroAnimate';
import HomeRoadmap from '@/components/HomeRoadmap';
import DogRunner from '@/components/DogRunner';
import BuildBoxPromo from '@/components/BuildBoxPromo';
import Accent from '@/components/Accent';
import { DogDoodle, PawField, Squiggle, Sticker, Wave } from '@/components/Doodles';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import { Heading, TYPE } from '@/components/ui/Heading';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';

interface Props {
  plans: any[];
  content: StoredContent | null;
  /** Pricing Page content: the plan cards' words are edited there. */
  pricing: StoredContent | null;
}

/**
 * Button words typed in admin sometimes carry their own arrow ("Start →") or
 * emoji ("🎁 Gift"); the buttons draw their own icon, so those are taken off.
 */
const label = (s: string) => s.replace(/\s*[→›>]+\s*$/u, '').replace(/^\p{Extended_Pictographic}️?\s*/u, '').trim();

/** Soft light tints, used in turn so sections and cards don't all look the same. */
const SOFT = ['bg-teal-50', 'bg-lilac-50', 'bg-sky-50', 'bg-rose-50'];
const BUBBLE = ['bg-rose-50', 'bg-lilac-50', 'bg-sky-50', 'bg-teal-50'];
/** Section colours, for the waves where one section meets the next. */
const COLOR = { white: '#FFFFFF', lilac: '#F6F4FF', sky: '#F0F9FF' };

/**
 * Cards that sit three to a row on wide screens and stay centred when there
 * are fewer (or a short last row), so 2, 4 or 5 items never leave a hole.
 * One per row on phones.
 */
const ROW = 'flex flex-wrap justify-center gap-4 sm:gap-5';
const CELL = 'w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]';

/**
 * The home page. Warm and friendly: the hero photo as a tilted print with
 * floating stickers, a hand-drawn dog along the way, soft waves between
 * sections and reviews as speech bubbles. Every word, picture and list is
 * edited in admin → Page Builder → Home Page.
 */
export default function HomePageClient({ plans, content, pricing }: Props) {
  const { t } = useLanguage();
  const c = usePage(homePage, content);
  const { hero, whatsInBox: box, howItWorks: hiw, testimonials } = c;

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* ── HERO ── */}
      {c.on('hero') && (
        <section className="relative bg-gradient-to-br from-teal-50 via-white to-rose-50/60">
          <PawField />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4 sm:pt-12 lg:pt-14 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="text-center lg:text-left">
              {hero.badge && (
                <HeroAnimate delay={0}>
                  <span className={`${TYPE.eyebrow} mb-4`}>{hero.badge}</span>
                </HeroAnimate>
              )}
              <HeroAnimate delay={100}>
                <h1 className={TYPE.hero}>
                  <Accent text={hero.heading} accent={hero.headingAccent} />
                </h1>
                <Squiggle className="mt-1 w-40 h-3 mx-auto lg:mx-0" />
              </HeroAnimate>
              {hero.description && (
                <HeroAnimate delay={200}>
                  <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-gray-500 max-w-md mx-auto lg:mx-0">{hero.description}</p>
                </HeroAnimate>
              )}
              <HeroAnimate delay={300}>
                <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-2">
                  {hero.cta1Text && <Button href={hero.cta1Href} icon="box" label={label(hero.cta1Text)} />}
                  {hero.cta2Text && <Button href={hero.cta2Href} icon="gift" tone="soft" label={label(hero.cta2Text)} />}
                </div>
              </HeroAnimate>
            </div>

            {hero.imageUrl && (
              <HeroAnimate delay={150}>
                {/* The photo as a slightly tilted print, with stickers around it. */}
                <div className="relative mx-auto max-w-[520px] px-4 sm:px-6 py-4">
                  <div className="relative rotate-[1.5deg] rounded-[32px] bg-white p-2.5 sm:p-3 shadow-[0_24px_48px_-24px_rgba(36,48,58,0.35)] transition-transform duration-500 hover:rotate-0">
                    <div className="relative rounded-[24px] overflow-hidden bg-teal-50">
                      <img src={hero.imageUrl} alt={hero.imageAlt} className="w-full h-[230px] sm:h-[300px] lg:h-[340px] object-cover" />
                      {(hero.cardTitle || hero.cardSub) && (
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-2xl px-3.5 py-2.5 shadow-soft flex items-center gap-2.5 -rotate-[1.5deg]">
                          {hero.cardIcon && <span className="text-xl" aria-hidden="true">{hero.cardIcon}</span>}
                          <div className="text-left">
                            <p className="font-bold text-gray-900 text-[13px] leading-tight">{hero.cardTitle}</p>
                            <p className="text-[11.5px] text-teal-600">{hero.cardSub}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Sticker kind="heart" className="-top-1 left-0 w-12 h-12 sm:w-14 sm:h-14" />
                  <Sticker kind="bone" className="top-8 -right-1 w-11 h-11 sm:w-12 sm:h-12" delay={700} />
                  <Sticker kind="paw" className="-bottom-2 right-10 w-12 h-12 sm:w-14 sm:h-14" delay={1400} />
                </div>
              </HeroAnimate>
            )}
          </div>
          <Wave color={COLOR.white} className="mt-4" />
        </section>
      )}

      {/* ── HOW IT WORKS: four steps, the four ways to buy on the first ── */}
      {c.on('howItWorks') && <HomeRoadmap heading={hiw.heading} steps={hiw.steps} />}

      {/* ── WHAT'S IN THE BOX ── */}
      {c.on('whatsInBox') && box.items.length > 0 && (
        <section className="relative">
          <Wave color={COLOR.lilac} />
          <div className="bg-[#F6F4FF] py-10 sm:py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <Heading kind="section" align="center" title={box.heading} />
              <div className="flex flex-wrap justify-center gap-2.5 sm:gap-5">
                {box.items.map((item: any, i: number) => (
                  <FadeIn key={i} delay={i * 60} direction="up" className={CELL}>
                    <div className="group h-full flex items-center sm:items-start gap-4 rounded-3xl bg-white shadow-[0_6px_20px_-12px_rgba(124,104,224,0.35)] px-4 py-3 sm:p-5 transition-transform hover:-translate-y-0.5">
                      <span className={`w-12 h-12 shrink-0 rounded-2xl ${SOFT[i % SOFT.length]} flex items-center justify-center text-[22px] transition-transform group-hover:rotate-[-8deg] group-hover:scale-110`} aria-hidden="true">{item.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-[15px]">{item.title}</h3>
                        {item.desc && <p className="hidden sm:block mt-1 text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>}
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
          <Wave color={COLOR.lilac} flip />
        </section>
      )}

      {/* ── PLANS ── */}
      {c.on('plans') && plans.length > 0 && (
        <section className="relative py-12 sm:py-14 bg-white" id="pricing">
          <PawField className="opacity-70" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
            <Heading kind="section" align="center" title={c.plans.heading} subtitle={c.plans.description || undefined} />
            <PlanSection plans={plans} content={pricing} />
            <BuildBoxPromo />
          </div>
        </section>
      )}

      {/* ── BREAK TIME ── a small game: Pupbox isn't a standard shop */}
      <section className="relative">
        <Wave color={COLOR.sky} />
        <div className="bg-[#F0F9FF] py-10 sm:py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Heading kind="section" align="center" title={t('game.break')} subtitle={t('game.breakSub')} />
            <DogRunner />
          </div>
        </div>
        <Wave color={COLOR.sky} flip />
      </section>

      {/* ── REVIEWS ── as speech bubbles; placeholder reviews until launch, by decision */}
      {c.on('testimonials') && testimonials.items.length > 0 && (
        <section className="py-12 sm:py-14 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <DogDoodle mood="curious" className="mx-auto w-20 h-[70px] -mb-1" />
            <Heading kind="section" align="center" title={testimonials.heading} />
            <div className={ROW}>
              {testimonials.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 80} direction="up" className={CELL}>
                  <figure className={`h-full flex flex-col ${i % 2 ? 'lg:rotate-1' : 'lg:-rotate-1'} transition-transform hover:rotate-0`}>
                    <div className={`relative flex-1 rounded-3xl ${BUBBLE[i % BUBBLE.length]} p-5`}>
                      <div className="flex gap-0.5 text-teal-500" aria-label="5/5">
                        {[0, 1, 2, 3, 4].map((s) => <Icon key={s} name="star" className="w-4 h-4 fill-current" />)}
                      </div>
                      <blockquote className="mt-3 text-[14px] text-gray-700 leading-relaxed">“{item.quote}”</blockquote>
                      {/* the bubble's tail */}
                      <span aria-hidden="true" className={`absolute -bottom-2 left-8 w-5 h-5 rotate-45 rounded-[4px] ${BUBBLE[i % BUBBLE.length]}`} />
                    </div>
                    <figcaption className="mt-4 pl-4 flex items-center gap-3">
                      {item.image
                        ? <img src={item.image} alt="" className="w-11 h-11 rounded-full object-cover ring-4 ring-white shadow-soft bg-teal-50" />
                        : <span className="w-11 h-11 rounded-full bg-teal-50 ring-4 ring-white shadow-soft flex items-center justify-center"><DogDoodle className="w-9 h-8" /></span>}
                      <span>
                        <span className="block font-semibold text-gray-900 text-[13.5px]">{item.name}</span>
                        <span className="block text-[12px] text-gray-400">{item.dog}</span>
                      </span>
                    </figcaption>
                  </figure>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
