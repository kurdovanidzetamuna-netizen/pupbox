'use client';
import { faqFor, homePage, type FaqItem, type StoredContent } from '@pupbox/content';
import FadeIn from '@/components/FadeIn';
import PlanSection from '@/app/prices/PlanSection';
import HeroAnimate from '@/components/HeroAnimate';
import SmartLink from '@/components/SmartLink';
import Accent from '@/components/Accent';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import { mdCols } from '@/lib/grid';

interface Props {
  plans: any[];
  content: StoredContent | null;
  faq: FaqItem[] | null;
}

const CARD_TINTS = ['bg-teal-50', 'bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-amber-50', 'bg-pink-50'];

/** Every word, picture and list here is edited in admin → Page Builder → Home Page. */
export default function HomePageClient({ plans, content, faq }: Props) {
  const { lang } = useLanguage();
  const c = usePage(homePage, content);
  const { hero, stats, whatsInBox: box, howItWorks: hiw, testimonials } = c;
  const faqItems = faqFor('home', faq, lang);

  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO ── */}
      {c.on('hero') && (
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-amber-50 py-16">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-200 rounded-full opacity-25 blur-3xl pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                {hero.badge && (
                  <HeroAnimate delay={0}>
                    <span className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">
                      {hero.badge}
                    </span>
                  </HeroAnimate>
                )}
                <HeroAnimate delay={100}>
                  <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                    <Accent text={hero.heading} accent={hero.headingAccent} />
                  </h1>
                </HeroAnimate>
                {hero.description && (
                  <HeroAnimate delay={200}>
                    <p className="text-lg text-gray-500 mb-10 leading-relaxed">{hero.description}</p>
                  </HeroAnimate>
                )}
                <HeroAnimate delay={300}>
                  {/* One primary action and one alternative. "How it works" is in the
                      nav and summarised by the steps right below, so a third
                      button only competed with the two that matter. */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-10">
                    {hero.cta1Text && (
                      <SmartLink href={hero.cta1Href} className="inline-flex whitespace-nowrap items-center justify-center bg-teal-600 text-white font-semibold px-7 py-3.5 rounded-xl text-base hover:bg-teal-700 transition shadow-md shadow-teal-100">
                        {hero.cta1Text}
                      </SmartLink>
                    )}
                    {hero.cta2Text && (
                      <SmartLink href={hero.cta2Href} className="inline-flex whitespace-nowrap items-center justify-center border-2 border-amber-300 text-amber-700 font-semibold px-6 py-3 rounded-xl text-base hover:bg-amber-50 transition">
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
                              <span className="text-xl mb-1">{step.icon}</span>
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
                    <img src={hero.imageUrl} alt={hero.imageAlt} className="w-full h-[480px] object-cover" />
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
        <section className="border-y border-gray-100 bg-white py-6">
          <div className="max-w-6xl mx-auto px-6 grid gap-8 text-center" style={{ gridTemplateColumns: `repeat(${stats.items.length}, minmax(0, 1fr))` }}>
            {stats.items.map((s: any, i: number) => (
              <div key={i}>
                <p className="text-3xl font-extrabold text-teal-600">{s.value}</p>
                <p className="text-sm text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── WHAT'S IN THE BOX ── */}
      {c.on('whatsInBox') && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{box.heading}</h2>
              {box.description && <p className="text-lg text-gray-500 max-w-2xl mx-auto">{box.description}</p>}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {box.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 80} direction="up">
                  <div className={`${CARD_TINTS[i % CARD_TINTS.length]} rounded-2xl p-6 h-full`}>
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      {c.on('howItWorks') && (
        <section className="bg-teal-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{hiw.heading}</h2>
              {hiw.description && <p className="text-gray-500 text-lg">{hiw.description}</p>}
            </div>
            <div className={`grid ${mdCols(hiw.steps.length)} gap-8`}>
              {hiw.steps.map((step: any, i: number) => (
                <FadeIn key={i} delay={i * 100} direction="up">
                  <div className="text-center bg-white rounded-2xl p-6 shadow-sm border border-teal-100 h-full">
                    <div className="text-4xl mb-3">{step.icon}</div>
                    <div className="inline-block text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full mb-3">{String(i + 1).padStart(2, '0')}</div>
                    <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PLANS ── */}
      {c.on('plans') && plans.length > 0 && (
        <section className="py-16 bg-white" id="pricing">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{c.plans.heading}</h2>
              {c.plans.description && <p className="text-lg text-gray-500">{c.plans.description}</p>}
            </div>
            <PlanSection plans={plans} />
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── placeholder reviews until launch, by decision */}
      {c.on('testimonials') && testimonials.items.length > 0 && (
        <section className="bg-teal-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{testimonials.heading}</h2>
              {testimonials.description && <p className="text-lg text-gray-500">{testimonials.description}</p>}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 120} direction="up">
                  <div className="bg-white rounded-2xl p-6 shadow-sm h-full">
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
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-4">{c.faq.heading}</h2>
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
