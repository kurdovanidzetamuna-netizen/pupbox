'use client';
import { faqFor, homePage, type FaqItem, type StoredContent } from '@pupbox/content';
import FadeIn from '@/components/FadeIn';
import PlanSection from '@/app/prices/PlanSection';
import HeroAnimate from '@/components/HeroAnimate';
import DogRunner from '@/components/DogRunner';
import SmartLink from '@/components/SmartLink';
import Accent from '@/components/Accent';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import { mdCols } from '@/lib/grid';

interface Props {
  plans: any[];
  content: StoredContent | null;
  faq: FaqItem[] | null;
  /** Pricing Page content: the plan cards' words are edited there. */
  pricing: StoredContent | null;
}

const CARD_TINTS = ['bg-teal-50', 'bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-amber-50', 'bg-pink-50'];

/** Every word, picture and list here is edited in admin → Page Builder → Home Page. */
export default function HomePageClient({ plans, content, faq, pricing }: Props) {
  const { lang, t } = useLanguage();
  const c = usePage(homePage, content);
  const { hero, stats, whatsInBox: box, howItWorks: hiw, testimonials } = c;
  const faqItems = faqFor('home', faq, lang);

  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO ── */}
      {c.on('hero') && (
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-amber-50 py-10 md:py-12">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-200 rounded-full opacity-25 blur-3xl pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center">
              <div>
                {hero.badge && (
                  <HeroAnimate delay={0}>
                    <span className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">
                      {hero.badge}
                    </span>
                  </HeroAnimate>
                )}
                <HeroAnimate delay={100}>
                  <h1 className="text-3xl md:text-[2.6rem] font-extrabold text-gray-900 leading-tight mb-4">
                    <Accent text={hero.heading} accent={hero.headingAccent} />
                  </h1>
                </HeroAnimate>
                {hero.description && (
                  <HeroAnimate delay={200}>
                    <p className="text-base text-gray-500 mb-7 leading-relaxed max-w-md line-clamp-3">{hero.description}</p>
                  </HeroAnimate>
                )}
                <HeroAnimate delay={300}>
                  {/* One primary action and one alternative. "How it works" is in the
                      nav and summarised by the steps right below, so a third
                      button only competed with the two that matter. */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-7">
                    {hero.cta1Text && (
                      <SmartLink href={hero.cta1Href} className="inline-flex whitespace-nowrap items-center justify-center bg-teal-600 text-white font-semibold px-6 py-3 rounded-full text-sm hover:bg-teal-700 transition">
                        {hero.cta1Text}
                      </SmartLink>
                    )}
                    {hero.cta2Text && (
                      <SmartLink href={hero.cta2Href} className="inline-flex whitespace-nowrap items-center justify-center bg-teal-50 text-teal-700 font-semibold px-6 py-3 rounded-full text-sm hover:bg-teal-100 transition">
                        {hero.cta2Text}
                      </SmartLink>
                    )}
                  </div>
                </HeroAnimate>
                {(hero.steps.length > 0 || hero.stepsNote) && (
                  <HeroAnimate delay={420}>
                    <div className="w-full max-w-md">
                      <div className="flex items-center justify-between">
                        {hero.steps.map((step: any, i: number, arr: any[]) => (
                          <div key={i} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                              <span className="text-base mb-1">{step.icon}</span>
                              <p className="text-xs text-gray-400 font-medium leading-tight text-center">{step.label}</p>
                            </div>
                            {i < arr.length - 1 && <div className="w-6 h-px bg-gray-200 mb-4 shrink-0" />}
                          </div>
                        ))}
                      </div>
                      {hero.stepsNote && <p className="text-xs text-gray-400 mt-4">{hero.stepsNote}</p>}
                    </div>
                  </HeroAnimate>
                )}
              </div>

              {hero.imageUrl && (
                <HeroAnimate delay={150}>
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-teal-100">
                    <img src={hero.imageUrl} alt={hero.imageAlt} className="w-full h-[300px] md:h-[360px] object-cover" />
                    {(hero.cardTitle || hero.cardSub) && (
                      <div className="absolute bottom-5 left-5 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
                        {hero.cardIcon && <span className="text-2xl">{hero.cardIcon}</span>}
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{hero.cardTitle}</p>
                          <p className="text-xs text-teal-600">{hero.cardSub}</p>
                        </div>
                      </div>
                    )}
                    {/* Placeholder social proof — kept during development by decision, remove before launch. */}
                    {hero.rating && (
                      <div className="absolute top-5 right-5 bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg">
                        <div className="flex gap-0.5 text-amber-400 text-sm">★★★★★</div>
                        <p className="text-xs text-gray-500 font-medium">{hero.rating}</p>
                      </div>
                    )}
                  </div>
                </HeroAnimate>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── STATS ── */}
      {c.on('stats') && stats.items.length > 0 && (
        <section className="border-y border-gray-100 bg-white py-5">
          <div className="max-w-7xl mx-auto px-6 grid gap-8 text-center" style={{ gridTemplateColumns: `repeat(${stats.items.length}, minmax(0, 1fr))` }}>
            {stats.items.map((s: any, i: number) => (
              <div key={i}>
                <p className="text-2xl font-extrabold text-teal-600">{s.value}</p>
                <p className="text-sm text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── WHAT'S IN THE BOX ── */}
      {c.on('whatsInBox') && (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">{box.heading}</h2>
              {box.description && <p className="text-base text-gray-500 max-w-xl mx-auto">{box.description}</p>}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {box.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 80} direction="up">
                  <div className={`${CARD_TINTS[i % CARD_TINTS.length]} rounded-2xl p-5 h-full`}>
                    <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-xl mb-3">{item.icon}</div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      {c.on('howItWorks') && (
        <section className="bg-teal-50 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">{hiw.heading}</h2>
              {hiw.description && <p className="text-gray-500 text-base">{hiw.description}</p>}
            </div>
            <div className={`grid ${mdCols(hiw.steps.length)} gap-8`}>
              {hiw.steps.map((step: any, i: number) => (
                <FadeIn key={i} delay={i * 100} direction="up">
                  <div className="text-center bg-white rounded-2xl p-5 shadow-sm border border-teal-100 h-full">
                    <div className="text-2xl mb-2">{step.icon}</div>
                    <div className="inline-block text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full mb-3">{String(i + 1).padStart(2, '0')}</div>
                    <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PLANS ── */}
      {c.on('plans') && plans.length > 0 && (
        <section className="py-12 bg-white" id="pricing">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">{c.plans.heading}</h2>
              {c.plans.description && <p className="text-base text-gray-500">{c.plans.description}</p>}
            </div>
            <PlanSection plans={plans} content={pricing} />
          </div>
        </section>
      )}

      {/* ── BREAK TIME ── a small game: Pupbox isn't a standard shop */}
      <section className="py-10 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-5">
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">{t('game.break')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('game.breakSub')}</p>
          </div>
          <DogRunner />
        </div>
      </section>

      {/* ── TESTIMONIALS ── placeholder reviews until launch, by decision */}
      {c.on('testimonials') && testimonials.items.length > 0 && (
        <section className="bg-teal-50 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">{testimonials.heading}</h2>
              {testimonials.description && <p className="text-base text-gray-500">{testimonials.description}</p>}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 120} direction="up">
                  <div className="bg-white rounded-2xl p-5 shadow-sm h-full">
                    <div className="flex mb-3">{'★★★★★'.split('').map((s, j) => <span key={j} className="text-amber-400 text-lg">{s}</span>)}</div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-5">"{item.quote}"</p>
                    <div className="flex items-center gap-3">
                      {item.image && <img src={item.image} alt={item.dog} className="w-10 h-10 rounded-full object-cover border-2 border-teal-100" />}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.dog}</p>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {c.on('faq') && faqItems.length > 0 && (
        <section className="py-12 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">{c.faq.heading}</h2>
            </div>
            <div className="space-y-4">
              {faqItems.map((item, i) => (
                <details key={i} className="group border border-gray-100 rounded-xl">
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none font-semibold text-gray-900 hover:text-teal-600 transition-colors">
                    {item.q}
                    <span className="text-teal-600 text-xl font-bold transition-transform duration-200 group-open:rotate-45 inline-block">+</span>
                  </summary>
                  <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
