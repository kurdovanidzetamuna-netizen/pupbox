'use client';
import { useEffect, useRef, useState } from 'react';
import { faqFor, howItWorksPage, type FaqItem, type StoredContent } from '@pupbox/content';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import SmartLink from '@/components/SmartLink';
import Accent from '@/components/Accent';
import { Heading } from '@/components/ui/Heading';
import Button from '@/components/ui/Button';

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

type Step = { n: string; emoji: string; title: string; desc: string; color: string; accent: string; dot: string };

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
              <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-0.5">{step.n}</p>
              <h2 className="text-sm font-extrabold text-gray-900 mb-1">{step.title}</h2>
              <p className="text-gray-500 leading-relaxed text-xs">{step.desc}</p>
            </div>
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

function FaqRow({ q, a, index }: { q: string; a: string; index: number }) {
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

// Alternating colours keep the roadmap readable however many steps admin adds.
const TONES = [
  { color: 'from-teal-50 to-teal-100', accent: 'bg-teal-600', dot: 'bg-teal-600' },
  { color: 'from-amber-50 to-amber-100', accent: 'bg-amber-400', dot: 'bg-amber-400' },
];

/** Everything here is edited in admin → Page Builder → How It Works (questions in the FAQ manager). */
export default function HowItWorksClient({ content, faq }: { content: StoredContent | null; faq: FaqItem[] | null }) {
  const { lang } = useLanguage();
  const c = usePage(howItWorksPage, content);
  const { hero, cta } = c;

  const steps: Step[] = c.steps.items.map((s: any, i: number) => ({
    n: String(i + 1).padStart(2, '0'), emoji: s.icon, title: s.title, desc: s.desc, ...TONES[i % 2],
  }));
  const faqs = faqFor('how-it-works', faq, lang);

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-8 sm:pt-10 pb-8 text-center">
        {hero.badge && (
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-bold px-4 py-2 rounded-full mb-6 tracking-wide uppercase">
            {hero.badge}
          </div>
        )}
        <Heading align="center" title={<Accent text={hero.heading} accent={hero.headingAccent} />} subtitle={hero.description || undefined} className="!mb-0" />
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
      {c.on('cta') && (
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-amber-50 py-12 sm:py-14">
        <span className="absolute top-8 left-12 text-3xl opacity-10 animate-bounce" style={{ animationDuration: '3s' }}>🐾</span>
        <span className="absolute top-16 right-20 text-2xl opacity-10 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>🐾</span>
        <span className="absolute bottom-10 left-1/4 text-xl opacity-10 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>🐾</span>
        <span className="absolute bottom-14 right-1/3 text-2xl opacity-10 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.3s' }}>🐾</span>
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-teal-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-amber-200 rounded-full opacity-20 blur-3xl" />

        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-teal-100 text-teal-700 text-xs font-bold px-4 py-2 rounded-full mb-4 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            {cta.badge}
          </div>
          <Heading kind="section" align="center" title={cta.heading} subtitle={cta.description || undefined} className="!mb-7" />
          <div className="flex justify-center gap-3 flex-wrap mb-10">
            {cta.chips.filter((s: any) => s.label).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-gray-100 text-gray-600 text-xs font-medium px-4 py-2 rounded-full shadow-sm">
                <span>{s.icon}</span><span>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            {cta.button1Text && (
              <Button href={cta.button1Href} icon="box" label={cta.button1Text} />
            )}
            {cta.button2Text && (
              <Button href={cta.button2Href} icon="arrow" tone="soft" label={cta.button2Text} />
            )}
          </div>
        </div>
      </section>
      )}

      {/* FAQ */}
      {c.on('faq') && faqs.length > 0 && (
      <section className="max-w-3xl mx-auto px-6 py-12 sm:py-14">
        <Heading kind="section" align="center" title={c.faq.heading} subtitle={c.faq.description || undefined} />
        <div className="space-y-3">
          {faqs.map((faq, i) => <FaqRow key={i} q={faq.q} a={faq.a} index={i} />)}
        </div>
      </section>
      )}
    </main>
  );
}
