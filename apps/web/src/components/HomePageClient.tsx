'use client';
import Link from 'next/link';
import { homePage, type StoredContent } from '@pupbox/content';
import FadeIn from '@/components/FadeIn';
import PlanSection from '@/app/prices/PlanSection';
import HeroAnimate from '@/components/HeroAnimate';
import HomeRoadmap from '@/components/HomeRoadmap';
import DogRunner from '@/components/DogRunner';
import BuildBoxPromo from '@/components/BuildBoxPromo';
import Accent from '@/components/Accent';
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

/**
 * Cards that sit three to a row on wide screens and stay centred when there
 * are fewer (or a short last row), so 2, 4 or 5 items never leave a hole.
 * One per row on phones.
 */
/** Soft light tints, used in turn so sections don't all look the same. */
const SOFT = ['bg-teal-50', 'bg-lilac-50', 'bg-sky-50', 'bg-rose-50'];
const CARD = ['from-teal-50/70', 'from-lilac-50/70', 'from-sky-50/70', 'from-rose-50/70'];

const ROW = 'flex flex-wrap justify-center gap-4 sm:gap-5';
const CELL = 'w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]';

/** Every word, picture and list here is edited in admin → Page Builder → Home Page. */
export default function HomePageClient({ plans, content, pricing }: Props) {
  const { t } = useLanguage();
  const c = usePage(homePage, content);
  const { hero, whatsInBox: box, howItWorks: hiw, testimonials } = c;

  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO ── text and one clear action beside the photo; stacked and centred on phones */}
      {c.on('hero') && (
        <section className="bg-gradient-to-br from-teal-50/80 via-white to-sky-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-14 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
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
                <div className="relative rounded-3xl overflow-hidden bg-teal-50 shadow-soft">
                  <img src={hero.imageUrl} alt={hero.imageAlt} className="w-full h-[240px] sm:h-[320px] lg:h-[380px] object-cover" />
                  {(hero.cardTitle || hero.cardSub) && (
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-2xl px-3.5 py-2.5 shadow-soft flex items-center gap-2.5">
                      {hero.cardIcon && <span className="text-xl" aria-hidden="true">{hero.cardIcon}</span>}
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-[13px] leading-tight">{hero.cardTitle}</p>
                        <p className="text-[11.5px] text-teal-600">{hero.cardSub}</p>
                      </div>
                    </div>
                  )}
                </div>
              </HeroAnimate>
            )}
          </div>
        </section>
      )}

      {/* ── ROADMAP: the four ways and how it works, as one road ── */}
      {c.on('howItWorks') && <HomeRoadmap steps={hiw.steps} />}

      {/* ── WHAT'S IN THE BOX ── */}
      {c.on('whatsInBox') && box.items.length > 0 && (
        <section className="py-12 sm:py-14 bg-gradient-to-b from-lilac-50/60 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Heading kind="section" align="center" title={box.heading} />
            <div className="flex flex-wrap justify-center gap-2.5 sm:gap-5">
              {box.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 60} direction="up" className={CELL}>
                  <div className="h-full flex items-center sm:items-start gap-4 rounded-2xl bg-white ring-1 ring-gray-100 px-4 py-3 sm:p-5">
                    <span className={`w-11 h-11 shrink-0 rounded-xl ${SOFT[i % SOFT.length]} flex items-center justify-center text-xl`} aria-hidden="true">{item.icon}</span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-[15px]">{item.title}</h3>
                      {item.desc && <p className="hidden sm:block mt-1 text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>}
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PLANS ── */}
      {c.on('plans') && plans.length > 0 && (
        <section className="py-12 sm:py-14 bg-gradient-to-b from-white via-teal-50/50 to-white" id="pricing">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Heading kind="section" align="center" title={c.plans.heading} subtitle={c.plans.description || undefined} />
            <PlanSection plans={plans} content={pricing} />
            <BuildBoxPromo />
          </div>
        </section>
      )}

      {/* ── BREAK TIME ── a small game: Pupbox isn't a standard shop */}
      <section className="py-12 sm:py-14 bg-gradient-to-b from-white via-sky-50/60 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Heading kind="section" align="center" title={t('game.break')} subtitle={t('game.breakSub')} />
          <DogRunner />
        </div>
      </section>

      {/* ── REVIEWS ── placeholder reviews until launch, by decision */}
      {c.on('testimonials') && testimonials.items.length > 0 && (
        <section className="py-12 sm:py-14 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Heading kind="section" align="center" title={testimonials.heading} />
            <div className={ROW}>
              {testimonials.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 80} direction="up" className={CELL}>
                  <figure className={`h-full flex flex-col rounded-2xl bg-gradient-to-br ${CARD[i % CARD.length]} to-white ring-1 ring-gray-100 p-5`}>
                    <div className="flex gap-0.5 text-teal-500" aria-label="5/5">
                      {[0, 1, 2, 3, 4].map((s) => <Icon key={s} name="star" className="w-4 h-4 fill-current" />)}
                    </div>
                    <blockquote className="mt-3 flex-1 text-[14px] text-gray-600 leading-relaxed">“{item.quote}”</blockquote>
                    <figcaption className="mt-4 flex items-center gap-3">
                      {item.image
                        ? <img src={item.image} alt="" className="w-10 h-10 rounded-full object-cover bg-teal-50" />
                        : <span className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[13px] font-bold">{String(item.name || '?')[0]}</span>}
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
