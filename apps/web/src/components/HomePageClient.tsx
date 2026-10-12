'use client';
import Link from 'next/link';
import { homePage, type StoredContent } from '@pupbox/content';
import FadeIn from '@/components/FadeIn';
import PlanSection from '@/app/prices/PlanSection';
import HeroAnimate from '@/components/HeroAnimate';
import SmartLink from '@/components/SmartLink';
import BuildBoxPromo from '@/components/BuildBoxPromo';
import Accent from '@/components/Accent';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import { Icon } from '@/components/ui/icons';

interface Props {
  plans: any[];
  content: StoredContent | null;
  /** Pricing Page content: the plan cards' words are edited there. */
  pricing: StoredContent | null;
}

const WAYS = [
  { key: 'box', icon: 'box', href: '/prices#plans', tile: 'from-teal-100 to-teal-50 text-teal-700' },
  { key: 'custom', icon: 'sparkle', href: '/build-box', tile: 'from-lilac-100 to-lilac-50 text-lilac-600', isNew: true },
  { key: 'gift', icon: 'gift', href: '/prices?gift=true', tile: 'from-peach-100 to-peach-50 text-peach-600' },
  { key: 'shop', icon: 'bag', href: '/shop', tile: 'from-teal-100 to-teal-50 text-teal-700' },
] as const;

/**
 * Button words typed in admin sometimes carry their own arrow ("Start →") or
 * emoji ("🎁 Gift"); the buttons draw their own, so those are taken off.
 */
const EMOJI = /^\p{Extended_Pictographic}\uFE0F?\s*/u;
const label = (s: string) => s.replace(/\s*[→›>]+\s*$/u, '').replace(EMOJI, '').trim();

const BOX_TINTS = ['bg-teal-50', 'bg-peach-50', 'bg-lilac-50', 'bg-teal-50', 'bg-peach-50', 'bg-lilac-50'];

/** One look for every section title on this page: short, centred, confident. */
function Title({ children, link }: { children: React.ReactNode; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-center sm:justify-between gap-4 mb-6 sm:mb-8">
      <h2 className="text-[24px] sm:text-[32px] font-extrabold tracking-tight text-gray-900 text-center sm:text-left text-balance">{children}</h2>
      {link && (
        <Link href={link.href} className="hidden sm:inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-teal-700 hover:gap-2 transition-all">
          {link.label}<Icon name="arrow" className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

/**
 * The home page, short and scannable: a hero with one clear action, the four
 * ways to buy, what's in the box, three steps, the plans, reviews and a last
 * call to action. Questions moved to /faq (footer and menu link there).
 * Words, pictures and lists are edited in admin → Page Builder → Home Page.
 */
export default function HomePageClient({ plans, content, pricing }: Props) {
  const { t } = useLanguage();
  const c = usePage(homePage, content);
  const { hero, stats, whatsInBox: box, howItWorks: hiw, testimonials } = c;
  const trust = [['truck', 'home.trust1'], ['repeat', 'home.trust2'], ['heart', 'home.trust3']] as const;

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* ── HERO ── */}
      {c.on('hero') && (
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-white to-white">
          <span aria-hidden="true" className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-teal-200/40 blur-3xl" />
          <span aria-hidden="true" className="absolute top-20 -right-32 w-[380px] h-[380px] rounded-full bg-peach-200/40 blur-3xl" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-10 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20 grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div className="text-center lg:text-left">
              {hero.badge && (
                <HeroAnimate delay={0}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 ring-1 ring-teal-100 px-3.5 py-1.5 text-[11.5px] sm:text-[12px] font-bold text-teal-700 shadow-soft mb-4">
                    {hero.badge}
                  </span>
                </HeroAnimate>
              )}
              <HeroAnimate delay={100}>
                <h1 className="text-[34px] leading-[1.12] sm:text-[44px] lg:text-[50px] font-extrabold tracking-tight text-gray-900 text-balance">
                  <Accent text={hero.heading} accent={hero.headingAccent} />
                </h1>
              </HeroAnimate>
              {hero.description && (
                <HeroAnimate delay={200}>
                  <p className="hidden sm:block mt-4 text-[17px] leading-relaxed text-gray-600 max-w-lg mx-auto lg:mx-0">{hero.description}</p>
                </HeroAnimate>
              )}
              <HeroAnimate delay={300}>
                <div className="mt-7 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                  {hero.cta1Text && (
                    <SmartLink href={hero.cta1Href}
                      className="group w-full sm:w-auto max-w-xs whitespace-nowrap inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-teal-600 text-white text-[16px] font-bold shadow-glow hover:bg-teal-700 hover:-translate-y-0.5 transition-all">
                      <Icon name="box" className="w-5 h-5" strokeWidth={2} />
                      {label(hero.cta1Text)}
                      <Icon name="arrow" className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
                    </SmartLink>
                  )}
                  {hero.cta2Text && (
                    <SmartLink href={hero.cta2Href}
                      className="w-full sm:w-auto max-w-xs whitespace-nowrap inline-flex items-center justify-center gap-2 h-14 px-7 rounded-full bg-white text-gray-800 ring-1 ring-gray-200 text-[15px] font-bold hover:ring-peach-300 hover:text-peach-600 transition-all">
                      <Icon name="gift" className="w-5 h-5 text-peach-500" />
                      {label(hero.cta2Text)}
                    </SmartLink>
                  )}
                </div>
              </HeroAnimate>
              <HeroAnimate delay={400}>
                <ul className="mt-6 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-[13px] font-semibold text-gray-600">
                  {trust.map(([icon, key]) => (
                    <li key={key} className="inline-flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center"><Icon name={icon} className="w-3.5 h-3.5" strokeWidth={2.2} /></span>
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </HeroAnimate>
            </div>

            {hero.imageUrl && (
              <HeroAnimate delay={150}>
                <div className="relative max-w-md sm:max-w-lg mx-auto lg:max-w-none">
                  <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[40px] bg-gradient-to-br from-teal-200 to-peach-200" aria-hidden="true" />
                  <div className="relative rounded-[40px] overflow-hidden bg-teal-100 aspect-[4/3] lg:aspect-[5/4]">
                    <img src={hero.imageUrl} alt={hero.imageAlt} className="w-full h-full object-cover" />
                  </div>
                  {(hero.cardTitle || hero.cardSub) && (
                    <div className="absolute -bottom-4 left-4 sm:left-6 bg-white rounded-2xl pl-3 pr-5 py-2.5 shadow-xl flex items-center gap-3 animate-[bob_4s_ease-in-out_infinite]">
                      {hero.cardIcon && <span className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-xl">{hero.cardIcon}</span>}
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-[13.5px] leading-tight">{hero.cardTitle}</p>
                        <p className="text-[12px] text-teal-600 font-semibold">{hero.cardSub}</p>
                      </div>
                    </div>
                  )}
                  {/* Placeholder social proof — kept during development by decision, remove before launch. */}
                  {hero.rating && (
                    <div className="absolute -top-3 right-4 sm:right-6 bg-white rounded-2xl px-3.5 py-2 shadow-xl text-left">
                      <div className="text-amber-400 text-[13px] tracking-tight">★★★★★</div>
                      <p className="text-[11.5px] text-gray-600 font-semibold">{hero.rating}</p>
                    </div>
                  )}
                </div>
              </HeroAnimate>
            )}
          </div>

          {/* Numbers, as one calm strip under the hero. */}
          {c.on('stats') && stats.items.length > 0 && (
            <div className="relative max-w-3xl mx-auto px-4 pb-10 sm:pb-14">
              <div className="grid rounded-3xl bg-white shadow-soft ring-1 ring-gray-100 divide-x divide-gray-100" style={{ gridTemplateColumns: `repeat(${stats.items.length}, minmax(0, 1fr))` }}>
                {stats.items.map((s: any, i: number) => (
                  <div key={i} className="py-4 sm:py-5 px-2 text-center">
                    <p className="text-[22px] sm:text-[28px] font-extrabold text-teal-600 leading-none">{s.value}</p>
                    <p className="text-[11.5px] sm:text-[13px] text-gray-500 mt-1.5 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── FOUR WAYS ── big tappable tiles, two by two on phones */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Title>{t('home.waysTitle')}</Title>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {WAYS.map((w, i) => (
              <FadeIn key={w.key} delay={i * 70} direction="up">
                <Link href={w.href}
                  className="group relative h-full flex flex-col items-center text-center rounded-3xl bg-white ring-1 ring-gray-100 shadow-soft p-4 sm:p-6 hover:-translate-y-1 hover:shadow-xl hover:ring-teal-200 transition-all duration-300">
                  {'isNew' in w && w.isNew && <span className="absolute top-3 right-3 text-[10.5px] font-extrabold text-white bg-lilac-600 rounded-full px-2 py-0.5">{t('ways.new')}</span>}
                  <span className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-gradient-to-br ${w.tile} flex items-center justify-center mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                    <Icon name={w.icon} className="w-8 h-8 sm:w-9 sm:h-9" strokeWidth={1.7} />
                  </span>
                  <span className="text-[14.5px] sm:text-[17px] font-bold text-gray-900 leading-snug">{t(`ways.${w.key}.t`)}</span>
                  <span className="mt-1 text-[12px] sm:text-[13.5px] text-gray-500 leading-snug">{t(`home.way.${w.key}`)}</span>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT'S IN THE BOX ── icons and names only */}
      {c.on('whatsInBox') && box.items.length > 0 && (
        <section className="py-12 sm:py-16 bg-gradient-to-b from-teal-50/70 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Title>{box.heading || t('home.boxTitle')}</Title>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {box.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 60} direction="up">
                  <div className="group h-full rounded-3xl bg-white ring-1 ring-gray-100 px-2 py-5 sm:py-7 text-center hover:ring-teal-200 hover:shadow-soft transition-all">
                    <span className={`mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full ${BOX_TINTS[i % BOX_TINTS.length]} flex items-center justify-center text-[28px] sm:text-[32px] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>{item.icon}</span>
                    <p className="mt-3 text-[12.5px] sm:text-[14px] font-bold text-gray-800 leading-tight px-1">{item.title}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── numbered steps joined by a line */}
      {c.on('howItWorks') && hiw.steps.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Title link={{ href: '/how-it-works', label: t('home.seeAll') }}>{hiw.heading || t('home.stepsTitle')}</Title>
            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <span aria-hidden="true" className="hidden lg:block absolute top-8 left-[12%] right-[12%] border-t-2 border-dashed border-teal-200" />
              {hiw.steps.map((step: any, i: number) => (
                <FadeIn key={i} delay={i * 90} direction="up">
                  <div className="relative h-full flex lg:flex-col items-center lg:text-center gap-4 lg:gap-0 rounded-3xl lg:rounded-none bg-gray-50 lg:bg-transparent p-4 lg:p-0">
                    <span className="relative shrink-0 w-16 h-16 rounded-full bg-white ring-4 ring-teal-50 shadow-soft flex items-center justify-center text-[28px] lg:mb-4">
                      {step.icon}
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-teal-600 text-white text-[11px] font-extrabold flex items-center justify-center ring-2 ring-white">{i + 1}</span>
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15.5px] sm:text-[17px] font-bold text-gray-900">{step.title}</h3>
                      <p className="hidden sm:block mt-1 text-[13.5px] text-gray-500 leading-snug line-clamp-2 lg:max-w-[220px] lg:mx-auto">{step.desc}</p>
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
        <section className="py-12 sm:py-16 bg-gradient-to-b from-white via-teal-50/60 to-white" id="pricing">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Title link={{ href: '/prices', label: t('home.seeAll') }}>{c.plans.heading || t('home.plansTitle')}</Title>
            <PlanSection plans={plans} content={pricing} />
            <BuildBoxPromo />
          </div>
        </section>
      )}

      {/* ── REVIEWS ── swipe on phones; placeholder reviews until launch, by decision */}
      {c.on('testimonials') && testimonials.items.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <Title>{testimonials.heading || t('home.reviewsTitle')}</Title>
            <div className="flex md:grid md:grid-cols-3 gap-4 sm:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {testimonials.items.map((item: any, i: number) => (
                <figure key={i} className="snap-center shrink-0 w-[82%] sm:w-[60%] md:w-auto flex flex-col rounded-3xl bg-gradient-to-br from-white to-teal-50/60 ring-1 ring-gray-100 shadow-soft p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 text-[15px] tracking-tight">★★★★★</span>
                    <span aria-hidden="true" className="text-[40px] leading-none font-serif text-teal-200">”</span>
                  </div>
                  <blockquote className="mt-2 flex-1 text-[14px] sm:text-[15px] text-gray-700 leading-relaxed line-clamp-4">{item.quote}</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    {item.image
                      ? <img src={item.image} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-soft bg-teal-100" />
                      : <span className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center">🐶</span>}
                    <span>
                      <span className="block font-bold text-gray-900 text-[14px]">{item.name}</span>
                      <span className="block text-[12px] text-gray-500">{item.dog}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── LAST CALL ── */}
      {hero.cta1Text && (
        <section className="px-4 sm:px-6 pb-14 sm:pb-20">
          <div className="relative overflow-hidden max-w-5xl mx-auto rounded-[36px] bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 px-6 py-12 sm:py-16 text-center text-white">
            <span aria-hidden="true" className="absolute -left-6 -bottom-8 text-[140px] opacity-10 -rotate-12 select-none">🦴</span>
            <span aria-hidden="true" className="absolute -right-4 -top-6 text-[120px] opacity-10 rotate-12 select-none">🐾</span>
            <span aria-hidden="true" className="relative inline-block text-[52px] animate-[bob_2.4s_ease-in-out_infinite]">🐶</span>
            <h2 className="relative mt-2 text-[26px] sm:text-[38px] font-extrabold tracking-tight text-balance">{t('home.ctaTitle')}</h2>
            <p className="relative mt-2 text-[14.5px] sm:text-[16px] text-white/85">{t('home.ctaSub')}</p>
            <SmartLink href={hero.cta1Href}
              className="group relative mt-7 inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-white text-teal-700 text-[16px] font-extrabold shadow-xl hover:-translate-y-0.5 transition-all">
              {label(hero.cta1Text)}
              <Icon name="arrow" className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
            </SmartLink>
          </div>
        </section>
      )}
    </main>
  );
}
