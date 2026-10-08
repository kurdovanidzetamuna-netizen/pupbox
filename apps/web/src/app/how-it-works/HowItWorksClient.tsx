'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { setVisible(true); obs.unobserve(el); }
      }, { threshold, rootMargin: '0px 0px -40px 0px' });
      obs.observe(el);
    });
    return () => { cancelAnimationFrame(raf); };
  }, [threshold]);
  return { ref, visible };
}

type Step = { n: string; emoji: string; paw: string; title: string; desc: string; color: string; accent: string; dot: string; pet: string };

function StepCard({ step, index }: { step: Step; index: number }) {
  const { ref, visible } = useInView(0.15);
  const isRight = index % 2 === 1;

  return (
    <div
      ref={ref}
      className={`relative flex items-center gap-0 transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: visible ? `${index * 60}ms` : '0ms' }}
    >
      <div className={`flex-1 ${isRight ? 'order-3' : 'order-1'}`}>
        <div className={`bg-gradient-to-br ${step.color} rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow duration-300 ${isRight ? 'ml-4 md:ml-8' : 'mr-4 md:mr-8'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl ${step.accent} flex items-center justify-center text-base shrink-0 shadow-sm`}>{step.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-0.5">Step {step.n}</p>
              <h2 className="text-sm font-extrabold text-gray-900 mb-1">{step.title}</h2>
              <p className="text-gray-500 leading-relaxed text-xs">{step.desc}</p>
            </div>
            <span className="text-base opacity-30 select-none shrink-0 mt-0.5">{step.pet}</span>
          </div>
        </div>
      </div>
      <div className="order-2 flex flex-col items-center shrink-0 w-10 md:w-14">
        <div className={`w-10 h-10 rounded-full ${step.dot} flex items-center justify-center shadow-lg z-10 ring-4 ring-white`}>
          <span className="text-white text-xs font-black">{step.n}</span>
        </div>
      </div>
      <div className={`flex-1 ${isRight ? 'order-1' : 'order-3'}`} />
    </div>
  );
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden hover:border-teal-200 transition-colors" style={{ transitionDelay: `${index * 50}ms` }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-5 text-left">
        <span className="font-bold text-gray-900 text-sm">{q}</span>
        <span className={`text-teal-600 text-lg font-bold transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-3">{a}</div>}
    </div>
  );
}

export default function HowItWorksPage() {
  const { t } = useLanguage();

  const steps: Step[] = [
    { n: '01', emoji: '📋', paw: '🐾', title: t('hiw.page.step1.title'), desc: t('hiw.page.step1.desc'), color: 'from-teal-50 to-teal-100',   accent: 'bg-teal-600',   dot: 'bg-teal-600',   pet: '🐕' },
    { n: '02', emoji: '🐶', paw: '🐾', title: t('hiw.page.step2.title'), desc: t('hiw.page.step2.desc'), color: 'from-amber-50 to-amber-100', accent: 'bg-amber-400', dot: 'bg-amber-400', pet: '🦴' },
    { n: '03', emoji: '🎁', paw: '🐾', title: t('hiw.page.step3.title'), desc: t('hiw.page.step3.desc'), color: 'from-teal-50 to-teal-100',   accent: 'bg-teal-600',   dot: 'bg-teal-600',   pet: '🧸' },
    { n: '04', emoji: '🚚', paw: '🐾', title: t('hiw.page.step4.title'), desc: t('hiw.page.step4.desc'), color: 'from-amber-50 to-amber-100', accent: 'bg-amber-400', dot: 'bg-amber-400', pet: '📦' },
    { n: '05', emoji: '🎉', paw: '🐾', title: t('hiw.page.step5.title'), desc: t('hiw.page.step5.desc'), color: 'from-teal-50 to-teal-100',   accent: 'bg-teal-600',   dot: 'bg-teal-600',   pet: '❤️' },
  ];

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
  ];

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-bold px-4 py-2 rounded-full mb-6 tracking-wide uppercase">
          {t('hiw.page.badge')}
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          {t('hiw.page.heading')} <span className="text-teal-600">{t('hiw.page.headingAccent')}</span>
        </h1>
        <p className="text-lg text-gray-500">
          {t('hiw.page.description')}
        </p>
      </section>

      {/* Roadmap */}
      <section className="max-w-3xl mx-auto px-6 pb-16 relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-200 via-amber-200 to-teal-200 -translate-x-1/2 hidden md:block" />
        <div className="space-y-6">
          {steps.map((step, i) => <StepCard key={i} step={step} index={i} />)}
        </div>
        <div className="flex justify-center mt-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg text-xl">🐾</div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-amber-50 py-16">
        <span className="absolute top-8 left-12 text-3xl opacity-10 animate-bounce" style={{ animationDuration: '3s' }}>🐾</span>
        <span className="absolute top-16 right-20 text-2xl opacity-10 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>🐾</span>
        <span className="absolute bottom-10 left-1/4 text-xl opacity-10 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>🐾</span>
        <span className="absolute bottom-14 right-1/3 text-2xl opacity-10 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.3s' }}>🐾</span>
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-teal-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-amber-200 rounded-full opacity-20 blur-3xl" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-teal-100 text-teal-700 text-xs font-bold px-4 py-2 rounded-full mb-8 shadow-sm tracking-wide">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            {t('hiw.page.badge', 'Delivering across Georgia')}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            {t('hiw.page.cta.heading')}
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
            {t('hiw.page.cta.desc')}
          </p>
          <div className="flex justify-center gap-3 flex-wrap mb-10">
            {[
              { icon: '🐾', label: t('cta.socialProof') },
              { icon: '📦', label: t('hiw.step4.title') },
              { icon: '⭐', label: t('cta.trustChip4') },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 bg-white border border-gray-100 text-gray-600 text-xs font-medium px-4 py-2 rounded-full shadow-sm">
                <span>{s.icon}</span><span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/prices" className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl text-base transition-all hover:scale-105 shadow-md shadow-teal-100">
              {t('hiw.page.cta.btn1')}
            </Link>
            <Link href="/prices" className="inline-flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-medium px-6 py-3 rounded-2xl text-base transition-all shadow-sm">
              {t('hiw.page.cta.btn2')}
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{t('hiw.page.faq.heading')}</h2>
          <p className="text-gray-500">{t('hiw.page.faq.sub')}</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} index={i} />)}
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <div className="flex justify-center gap-8 mb-4">
          <Link href="/pages/about" className="hover:text-teal-600">About</Link>
          <Link href="/pages/privacy" className="hover:text-teal-600">{t('footer.privacy')}</Link>
          <Link href="/pages/terms" className="hover:text-teal-600">{t('footer.terms')}</Link>
          <Link href="/blog" className="hover:text-teal-600">{t('nav.blog')}</Link>
        </div>
        <p>© {new Date().getFullYear()} Pupbox. Made with 🐾 in Georgia.</p>
      </footer>
    </main>
  );
}
