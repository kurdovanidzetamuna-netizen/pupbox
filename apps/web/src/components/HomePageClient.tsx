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

// Sunny Playground tints for the "what's in the box" cards, and the step-number chips.
const CARD_TINTS = ['bg-sun-100', 'bg-teal-100', 'bg-coral-100', 'bg-white', 'bg-sun-100', 'bg-teal-100'];
const STEP_CHIPS = ['bg-sun-400 text-ink', 'bg-coral-400 text-white', 'bg-white text-teal-700'];

/** Every word, picture and list here is edited in admin → Page Builder → Home Page. */
export default function HomePageClient({ plans, content, faq }: Props) {
  const { lang } = useLanguage();
  const c = usePage(homePage, content);
  const { hero, stats, whatsInBox: box, howItWorks: hiw, testimonials } = c;
  const faqItems = faqFor('home', faq, lang);

  return (
    <main className="min-h-screen bg-cream overflow-x-hidden">
      {/* ── HERO ── */}
      {c.on('hero') && (
        <section className="relative pt-10 pb-6 md:pt-14">
          <div className="relative max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                {hero.badge && (
                  <HeroAnimate delay={0}>
                    <span className="inline-flex items-center gap-2 bg-sun-400 text-ink text-xs font-extrabold px-4 py-2 rounded-full mb-6 -rotate-2">
                      {hero.badge}
                    </span>
                  </HeroAnimate>
                )}
                <HeroAnimate delay={100}>
                  <h1 className="text-[2.6rem] md:text-6xl font-black text-ink leading-[1.15] tracking-tight mb-6">
                    <Accent text={hero.heading} accent={hero.headingAccent}
                      className="inline-block bg-teal-600 text-sun-400 px-3 rounded-2xl -rotate-1 my-1" />
                  </h1>
                </HeroAnimate>
                {hero.description && (
                  <HeroAnimate delay={200}>
                    <p className="text-lg text-ink/75 mb-9 leading-relaxed max-w-xl">{hero.description}</p>
                  </HeroAnimate>
                )}
                <HeroAnimate delay={300}>
                  {/* One primary action and one alternative. */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-9">
                    {hero.cta1Text && (
                      <SmartLink href={hero.cta1Href} className="inline-flex whitespace-nowrap items-center justify-center bg-teal-600 text-white font-extrabold px-8 py-4 text-base hover:bg-teal-700">
                        {hero.cta1Text}
                      </SmartLink>
                    )}
                    {hero.cta2Text && (
                      <SmartLink href={hero.cta2Href} className="inline-flex whitespace-nowrap items-center justify-center bg-white text-ink font-extrabold px-7 py-4 rounded-full border-2 border-ink shadow-step-ink text-base transition-transform active:translate-y-[3px] active:shadow-none hover:bg-sun-100">
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
                              <span className="w-11 h-11 rounded-2xl bg-white border-2 border-ink/10 flex items-center justify-center text-xl mb-1.5">{step.icon}</span>
                              <p className="text-xs text-ink/70 font-semibold leading-tight text-center">{step.label}</p>
                            </div>
                            {i < arr.length - 1 && <div className="w-6 border-t-2 border-dashed border-ink/20 mb-6 shrink-0" />}
                          </div>
                        ))}
                      </div>
                      {hero.stepsNote && <p className="text-sm font-semibold text-ink/70 mt-4">{hero.stepsNote}</p>}
                    </div>
                  </HeroAnimate>
                )}
              </div>

              {hero.imageUrl && (
                <HeroAnimate delay={150}>
                  <div className="relative h-[420px] md:h-[480px]">
                    {/* The sunny blob behind the photo. */}
                    <div className="absolute inset-x-2 inset-y-4 bg-sun-400 rounded-[48%_52%_44%_56%/50%_44%_56%_50%]" aria-hidden="true" />
                    <div className="absolute inset-x-10 top-8 bottom-8 rounded-[36px] overflow-hidden border-[6px] border-white shadow-2xl rotate-2">
                      <img src={hero.imageUrl} alt={hero.imageAlt} className="w-full h-full object-cover" />
                    </div>
                    {(hero.cardTitle || hero.cardSub) && (
                      <div className="absolute bottom-4 left-0 bg-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 -rotate-3">
                        {hero.cardIcon && <span className="text-2xl">{hero.cardIcon}</span>}
                        <div>
                          <p className="font-black text-ink text-sm">{hero.cardTitle}</p>
                          <p className="text-xs text-ink/70">{hero.cardSub}</p>
                        </div>
                      </div>
                    )}
                    {/* Placeholder social proof — kept during development by decision, remove before launch. */}
                    {hero.rating && (
                      <div className="absolute top-0 right-0 bg-coral-400 text-white rounded-2xl px-3.5 py-2.5 shadow-step-coral rotate-6">
                        <div className="flex gap-0.5 text-sun-400 text-sm">★★★★★</div>
                        <p className="text-xs font-bold">{hero.rating}</p>
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
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid gap-4 text-center bg-white rounded-[28px] border-[3px] border-ink shadow-step-ink py-6 px-4" style={{ gridTemplateColumns: `repeat(${stats.items.length}, minmax(0, 1fr))` }}>
              {stats.items.map((s: any, i: number) => (
                <div key={i}>
                  <p className="font-display text-3xl md:text-4xl font-bold text-teal-600">{s.value}</p>
                  <p className="text-sm text-ink/70 font-semibold mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHAT'S IN THE BOX ── */}
      {c.on('whatsInBox') && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-ink mb-4">{box.heading}</h2>
              {box.description && <p className="text-lg text-ink/70 max-w-2xl mx-auto">{box.description}</p>}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {box.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 80} direction="up">
                  <div className={`${CARD_TINTS[i % CARD_TINTS.length]} rounded-[28px] p-6 h-full wag-hover transition-transform hover:-translate-y-1 ${i % 2 ? 'rotate-1' : '-rotate-1'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl mb-4 shadow-sm"><span className="wag-on-hover">{item.icon}</span></div>
                    <h3 className="font-extrabold text-ink text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-ink/70 leading-relaxed">{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── deep teal band with a wavy top */}
      {c.on('howItWorks') && (
        <section className="relative">
          <svg className="block w-full h-12 md:h-16 text-teal-600" viewBox="0 0 1280 70" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 40 C 160 0, 320 80, 480 40 S 800 0, 960 40 S 1180 70, 1280 30 L1280 70 L0 70 Z" fill="currentColor" />
          </svg>
          <div className="bg-teal-600 text-white pb-16 pt-6">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black mb-4">{hiw.heading}</h2>
                {hiw.description && <p className="text-white/80 text-lg">{hiw.description}</p>}
              </div>
              <div className={`grid ${mdCols(hiw.steps.length)} gap-6`}>
                {hiw.steps.map((step: any, i: number) => (
                  <FadeIn key={i} delay={i * 100} direction="up">
                    <div className="bg-teal-500/60 rounded-[28px] p-6 h-full">
                      <div className="flex items-center gap-4 mb-4">
                        <span className={`font-display shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-bold ${STEP_CHIPS[i % STEP_CHIPS.length]}`}>{i + 1}</span>
                        <span className="text-3xl" aria-hidden="true">{step.icon}</span>
                      </div>
                      <h3 className="font-extrabold text-lg mb-2">{step.title}</h3>
                      <p className="text-sm text-white/80 leading-relaxed">{step.desc}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
          <svg className="block w-full h-12 md:h-16 text-teal-600 rotate-180" viewBox="0 0 1280 70" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 40 C 160 0, 320 80, 480 40 S 800 0, 960 40 S 1180 70, 1280 30 L1280 70 L0 70 Z" fill="currentColor" />
          </svg>
        </section>
      )}

      {/* ── PLANS ── */}
      {c.on('plans') && plans.length > 0 && (
        <section className="py-14" id="pricing">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-black text-ink mb-4">{c.plans.heading}</h2>
              {c.plans.description && <p className="text-lg text-ink/70">{c.plans.description}</p>}
            </div>
            <PlanSection plans={plans} />
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── placeholder reviews until launch, by decision */}
      {c.on('testimonials') && testimonials.items.length > 0 && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-ink mb-4">{testimonials.heading}</h2>
              {testimonials.description && <p className="text-lg text-ink/70">{testimonials.description}</p>}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.items.map((item: any, i: number) => (
                <FadeIn key={i} delay={i * 120} direction="up">
                  <div className={`bg-white rounded-[28px] p-6 h-full border-2 border-ink/10 ${i % 2 ? 'rotate-1' : '-rotate-1'}`}>
                    <div className="flex mb-3">{'★★★★★'.split('').map((s, j) => <span key={j} className="text-sun-600 text-lg">{s}</span>)}</div>
                    <p className="text-ink/80 text-sm leading-relaxed mb-5">“{item.quote}”</p>
                    <div className="flex items-center gap-3">
                      {item.image && <img src={item.image} alt={item.dog} className="w-11 h-11 rounded-full object-cover border-[3px] border-sun-400" />}
                      <div>
                        <p className="font-extrabold text-ink text-sm">{item.name}</p>
                        <p className="text-xs text-ink/60">{item.dog}</p>
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
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-ink mb-4">{c.faq.heading}</h2>
            </div>
            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <details key={i} className="group bg-white border-2 border-ink/10 rounded-3xl open:border-teal-600 transition-colors">
                  <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none font-bold text-ink hover:text-teal-600 transition-colors">
                    {item.q}
                    <span className="shrink-0 w-8 h-8 rounded-full bg-sun-400 text-ink text-xl font-black flex items-center justify-center transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="px-6 pb-5 text-sm text-ink/70 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
