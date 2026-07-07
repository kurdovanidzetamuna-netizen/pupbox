'use client';
import Link from 'next/link';
import FadeIn from '@/components/FadeIn';
import PlanSection from '@/app/prices/PlanSection';
import HeroAnimate from '@/components/HeroAnimate';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  plans: any[];
  enabled: Record<string, boolean>;
  faqItems: any[];
}

export default function HomePageClient({ plans, enabled, faqItems }: Props) {
  const { t } = useLanguage();
  const isSectionOn = (id: string) => enabled[id] !== false;

  return (
    <main className="min-h-screen bg-white">
      {/* ── HERO ── */}
      {isSectionOn('hero') && (
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-amber-50 py-16">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-200 rounded-full opacity-25 blur-3xl pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <HeroAnimate delay={0}>
                  <span className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wide">
                    {t('hero.badge')}
                  </span>
                </HeroAnimate>
                <HeroAnimate delay={100}>
                  <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                    {t('hero.heading').replace(t('hero.headingAccent'), '')}
                    <span className="text-teal-600">{t('hero.headingAccent')}</span>
                  </h1>
                </HeroAnimate>
                <HeroAnimate delay={200}>
                  <p className="text-lg text-gray-500 mb-10 leading-relaxed">{t('hero.description')}</p>
                </HeroAnimate>
                <HeroAnimate delay={300}>
                  <div className="flex flex-col sm:flex-row gap-3 mb-10 flex-wrap">
                    <Link href="/prices" className="inline-flex items-center justify-center bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl text-base hover:bg-teal-700 transition shadow-md shadow-teal-100">
                      {t('hero.cta1')}
                    </Link>
                    <Link href="/prices?gift=true" className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl text-base transition shadow-md shadow-amber-100">
                      {t('hero.cta2')}
                    </Link>
                    <Link href="/how-it-works" className="inline-flex items-center justify-center border border-gray-200 text-gray-600 font-medium px-6 py-3 rounded-2xl text-base hover:border-teal-400 hover:text-teal-600 transition">
                      {t('hero.cta3')}
                    </Link>
                  </div>
                </HeroAnimate>
                <HeroAnimate delay={420}>
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-between">
                      {[
                        { n: 1, emoji: '👤', labelKey: 'hero.step1' },
                        { n: 2, emoji: '🐾', labelKey: 'hero.step2' },
                        { n: 3, emoji: '📦', labelKey: 'hero.step3' },
                        { n: 4, emoji: '💳', labelKey: 'hero.step4' },
                      ].map((step, i, arr) => (
                        <div key={step.n} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-xl mb-1">{step.emoji}</span>
                            <p className="text-xs text-gray-400 font-medium leading-tight text-center">{t(step.labelKey)}</p>
                          </div>
                          {i < arr.length - 1 && <div className="w-6 h-px bg-gray-200 mb-4 shrink-0" />}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-4">{t('hero.cancelNote')}</p>
                  </div>
                </HeroAnimate>
              </div>

              <HeroAnimate delay={150}>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-teal-100">
                  <img
                    src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80"
                    alt="Happy dog with Pupbox"
                    className="w-full h-[480px] object-cover"
                  />
                  <div className="absolute bottom-5 left-5 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Monthly Box</p>
                      <p className="text-xs text-teal-600">5–8 premium products</p>
                    </div>
                  </div>
                  <div className="absolute top-5 right-5 bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg">
                    <div className="flex gap-0.5 text-amber-400 text-sm">★★★★★</div>
                    <p className="text-xs text-gray-500 font-medium">500+ happy pups</p>
                  </div>
                </div>
              </HeroAnimate>
            </div>
          </div>
        </section>
      )}

      {/* ── STATS ── */}
      {isSectionOn('stats') && (
        <section className="border-y border-gray-100 bg-white py-6">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
            {[
              { value: '500+', labelKey: 'stats.happyDogs' },
              { value: '4.9★', labelKey: 'stats.avgRating' },
              { value: '5–8',  labelKey: 'stats.productsPerBox' },
            ].map(s => (
              <div key={s.labelKey}>
                <p className="text-3xl font-extrabold text-teal-600">{s.value}</p>
                <p className="text-sm text-gray-400 mt-1">{t(s.labelKey)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── WHAT'S IN THE BOX ── */}
      {isSectionOn('whatsInBox') && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{t('box.heading')}</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('box.description')}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { emoji: '🦴', titleKey: 'box.item1.title', descKey: 'box.item1.desc', bg: 'bg-teal-50' },
                { emoji: '🧸', titleKey: 'box.item2.title', descKey: 'box.item2.desc', bg: 'bg-blue-50' },
                { emoji: '✨', titleKey: 'box.item3.title', descKey: 'box.item3.desc', bg: 'bg-green-50' },
                { emoji: '🎁', titleKey: 'box.item4.title', descKey: 'box.item4.desc', bg: 'bg-purple-50' },
                { emoji: '🐶', titleKey: 'box.item5.title', descKey: 'box.item5.desc', bg: 'bg-teal-50' },
                { emoji: '📦', titleKey: 'box.item6.title', descKey: 'box.item6.desc', bg: 'bg-pink-50' },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 80} direction="up">
                  <div className={`${item.bg} rounded-2xl p-6 h-full`}>
                    <div className="text-3xl mb-3">{item.emoji}</div>
                    <h3 className="font-bold text-gray-900 mb-2">{t(item.titleKey)}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{t(item.descKey)}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      {isSectionOn('howItWorks') && (
        <section className="bg-teal-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{t('hiw.heading')}</h2>
              <p className="text-gray-500 text-lg">{t('hiw.subheading')}</p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {([
                { emoji: '📋', titleKey: 'hiw.step1.title', descKey: 'hiw.step1.desc' },
                { emoji: '🐶', titleKey: 'hiw.step2.title', descKey: 'hiw.step2.desc' },
                { emoji: '📦', titleKey: 'hiw.step3.title', descKey: 'hiw.step3.desc' },
                { emoji: '🎉', titleKey: 'hiw.step4.title', descKey: 'hiw.step4.desc' },
              ] as const).map((step, i) => (
                <FadeIn key={i} delay={i * 100} direction="up">
                  <div className="text-center bg-white rounded-2xl p-6 shadow-sm border border-teal-100 h-full">
                    <div className="text-4xl mb-3">{step.emoji}</div>
                    <div className="inline-block text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full mb-3">{String(i + 1).padStart(2, '0')}</div>
                    <h3 className="font-bold text-gray-900 mb-2">{t(step.titleKey)}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{t(step.descKey)}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PLANS ── */}
      {isSectionOn('plans') && plans.length > 0 && (
        <section className="py-16 bg-white" id="pricing">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{t('plans.heading')}</h2>
              <p className="text-lg text-gray-500">{t('plans.subheading')}</p>
            </div>
            <PlanSection plans={plans} />
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      {isSectionOn('testimonials') && (
        <section className="bg-teal-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                {t('testimonials.heading')}
              </h2>
              <p className="text-lg text-gray-500">
                {t('testimonials.subheading')}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Nino T.',    cityEn: 'Tbilisi',  cityKa: 'თბილისი',  dog: 'Golden Retriever', quoteKey: 'testimonials.t1.quote', dogImg: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=100&q=80' },
                { name: 'Giorgi K.', cityEn: 'Batumi',   cityKa: 'ბათუმი',   dog: 'French Bulldog',   quoteKey: 'testimonials.t2.quote', dogImg: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=100&q=80' },
                { name: 'Salome M.', cityEn: 'Kutaisi',  cityKa: 'ქუთაისი',  dog: 'Labrador',         quoteKey: 'testimonials.t3.quote', dogImg: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=100&q=80' },
              ].map((item, i) => (
                <FadeIn key={item.name} delay={i * 120} direction="up">
                  <div className="bg-white rounded-2xl p-6 shadow-sm h-full">
                    <div className="flex mb-3">{'★★★★★'.split('').map((s, j) => <span key={j} className="text-amber-400 text-lg">{s}</span>)}</div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t(item.quoteKey)}"</p>
                    <div className="flex items-center gap-3">
                      <img src={item.dogImg} alt={item.dog} className="w-10 h-10 rounded-full object-cover border-2 border-teal-100" />
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
      {isSectionOn('faq') && (
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 mb-4">{t('faq.heading')}</h2>
            </div>
            <div className="space-y-4">
              {(faqItems.length > 0
                ? faqItems.map((item: any) => ({ q: item.question, a: item.answer }))
                : [
                    { q: t('faq.q1'), a: t('faq.a1') },
                    { q: t('faq.q2'), a: t('faq.a2') },
                    { q: t('faq.q3'), a: t('faq.a3') },
                    { q: t('faq.q4'), a: t('faq.a4') },
                    { q: t('faq.q5'), a: t('faq.a5') },
                  ]
              ).map((item, i) => (
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

      {/* ── FINAL CTA ── */}
      {false && isSectionOn('cta') && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-50 via-white to-amber-50 border border-teal-100 px-8 py-16 text-center shadow-sm">
              <div className="absolute -top-16 -left-16 w-64 h-64 bg-teal-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-amber-200 rounded-full opacity-25 blur-3xl pointer-events-none" />
              <span className="absolute top-6 left-10 text-2xl opacity-10 select-none">🐾</span>
              <span className="absolute top-10 right-16 text-xl opacity-10 select-none">🐾</span>
              <span className="absolute bottom-8 left-1/4 text-lg opacity-10 select-none">🐾</span>
              <span className="absolute bottom-6 right-1/4 text-2xl opacity-10 select-none">🐾</span>

              <div className="relative">
                <div className="flex justify-center mb-6">
                  <div className="flex -space-x-3">
                    {['🐕','🐩','🦮','🐈','🐾'].map((e, i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-lg">{e}</div>
                    ))}
                  </div>
                  <div className="ml-3 flex flex-col justify-center text-left">
                    <div className="flex gap-0.5 text-amber-400 text-xs">★★★★★</div>
                    <p className="text-xs text-gray-500">{t('cta.socialProof')}</p>
                  </div>
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
                  {t('cta.heading').replace(t('cta.headingAccent'), '')}<br />
                  <span className="text-teal-600">{t('cta.headingAccent')}</span>
                </h2>
                <p className="text-gray-500 text-lg mb-8 max-w-lg mx-auto">{t('cta.description')}</p>

                <div className="flex flex-wrap justify-center gap-3 mb-10">
                  {[
                    t('cta.trustChip1'),
                    t('cta.trustChip2'),
                    t('cta.trustChip3'),
                    t('cta.trustChip4'),
                  ].map(chip => (
                    <span key={chip} className="bg-white border border-gray-100 text-gray-600 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm">{chip}</span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/prices" className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl text-base transition hover:scale-105 shadow-md shadow-teal-100">
                    {t('cta.btn1')}
                  </Link>
                  <Link href="/prices" className="inline-flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-medium px-6 py-3 rounded-2xl text-base transition shadow-sm">
                    {t('cta.btn2')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-gray-50 border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <Link href="/" className="text-2xl font-extrabold text-teal-600 flex items-center gap-1 mb-3">🐾 Pupbox</Link>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{t('footer.tagline')}</p>
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm mb-4">{t('footer.company')}</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/how-it-works" className="text-gray-500 hover:text-teal-600 transition-colors">{t('nav.howItWorks')}</Link></li>
                <li><Link href="/prices" className="text-gray-500 hover:text-teal-600 transition-colors">{t('nav.pricing')}</Link></li>
                <li><Link href="/shop" className="text-gray-500 hover:text-teal-600 transition-colors">{t('nav.shop')}</Link></li>
                <li><Link href="/blog" className="text-gray-500 hover:text-teal-600 transition-colors">{t('nav.blog')}</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm mb-4">{t('footer.account')}</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="text-gray-500 hover:text-teal-600 transition-colors">{t('nav.signIn')}</Link></li>
                <li><Link href="/register" className="text-gray-500 hover:text-teal-600 transition-colors">{t('footer.createAccount')}</Link></li>
                <li><Link href="/account/orders" className="text-gray-500 hover:text-teal-600 transition-colors">{t('footer.myOrders')}</Link></li>
                <li><Link href="/subscribe" className="text-gray-500 hover:text-teal-600 transition-colors">{t('nav.subscribe')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Pupbox. {t('footer.copyright')}</p>
            <div className="flex gap-6">
              <Link href="/pages/privacy" className="hover:text-teal-600 transition-colors">{t('footer.privacy')}</Link>
              <Link href="/pages/terms" className="hover:text-teal-600 transition-colors">{t('footer.terms')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
