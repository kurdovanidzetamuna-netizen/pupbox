'use client';
import { useEffect, useRef, useState } from 'react';
import { faqFor, howItWorksPage, type FaqItem, type StoredContent } from '@pupbox/content';
import { useLanguage } from '@/context/LanguageContext';
import { usePage } from '@/lib/usePage';
import SmartLink from '@/components/SmartLink';
import Accent from '@/components/Accent';
import { Heading } from '@/components/ui/Heading';
import Caps from '@/components/ui/Caps';
import CtaGlow from '@/components/ui/CtaGlow';
import { Icon, LineIcon } from '@/components/ui/icons';
import { GLOSSY_FOR_EMOJI, GlossyBall, GlossyBone, GlossyGift, GlossyPaw } from '@/components/Glossy3D';
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

type Step = { n: string; emoji: string; title: string; desc: string; tint: string };

/**
 * One stop on the roadmap: a flat pastel card with a glossy 3D icon (from the
 * admin emoji), the step number and words. Phones: one column, the line and
 * dots on the left. Computers: cards alternate left and right of the line.
 */
function StepCard({ step, index }: { step: Step; index: number }) {
  const { ref, visible } = useInView(0.15);
  const isRight = index % 2 === 1;
  const Art = GLOSSY_FOR_EMOJI[step.emoji] ?? GLOSSY_FOR_EMOJI[step.emoji?.replace(/\uFE0F/g, '')];

  return (
    <div
      ref={ref}
      className={`relative flex items-center transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: visible ? `${index * 60}ms` : '0ms' }}
    >
      <div className={`flex-1 order-2 ${isRight ? 'md:order-3' : 'md:order-1'}`}>
        <div className={`group ${step.tint} rounded-[22px] p-4 sm:p-5 ml-3 ${isRight ? 'md:ml-8' : 'md:ml-0 md:mr-8'}`}>
          <div className="flex items-start gap-3.5">
            <span className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 -mt-1 -ml-1 flex items-center justify-center text-teal-600 transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-6deg]">
              {Art ? <Art className="w-full h-full" /> : <LineIcon emoji={step.emoji} className="w-8 h-8" />}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] sm:text-[17px] font-extrabold text-gray-900 leading-snug"><Caps text={step.title} /></h2>
              <p className="mt-1 text-gray-600 leading-relaxed text-[13.5px]">{step.desc}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="order-1 md:order-2 flex flex-col items-center shrink-0 w-10 md:w-14">
        <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center z-10 ring-4 ring-white">
          <span className="text-white text-xs font-black">{step.n}</span>
        </div>
      </div>
      <div className={`hidden md:block flex-1 ${isRight ? 'md:order-1' : 'md:order-3'}`} />
    </div>
  );
}

function FaqRow({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white ring-1 ring-gray-100 rounded-[20px] overflow-hidden hover:ring-teal-200 transition-shadow" style={{ transitionDelay: `${index * 50}ms` }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 sm:py-5 text-left">
        <span className="font-bold text-gray-900 text-sm">{q}</span>
        <span className={`text-teal-600 text-lg font-bold transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-3">{a}</div>}
    </div>
  );
}

// The home page's pastel card colours, in turn, however many steps admin adds.
const TINTS = ['bg-pastel-mint', 'bg-pastel-sun', 'bg-pastel-lilac', 'bg-pastel-peach', 'bg-pastel-pink', 'bg-pastel-sky'];

/** Everything here is edited in admin → Page Builder → How It Works (questions in the FAQ manager). */
export default function HowItWorksClient({ content, faq }: { content: StoredContent | null; faq: FaqItem[] | null }) {
  const { lang } = useLanguage();
  const c = usePage(howItWorksPage, content);
  const { hero, cta } = c;

  const steps: Step[] = c.steps.items.map((s: any, i: number) => ({
    n: String(i + 1).padStart(2, '0'), emoji: s.icon, title: s.title, desc: s.desc, tint: TINTS[i % TINTS.length],
  }));
  const faqs = faqFor('how-it-works', faq, lang);

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-8 sm:pt-10 pb-8 text-center">
        {hero.badge && (
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[12px] font-bold px-3.5 py-1.5 rounded-full mb-4">
            {hero.badge}
          </div>
        )}
        <Heading align="center" title={<Accent text={hero.heading} accent={hero.headingAccent} caps />} subtitle={hero.description || undefined} className="!mb-0" />
      </section>

      {/* Roadmap */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14 relative">
        {/* The line through the dots: on the left on phones, in the middle on computers */}
        <div className="absolute left-[calc(1rem+19px)] sm:left-[calc(1.5rem+19px)] md:left-1/2 top-0 bottom-0 w-0.5 bg-teal-100 md:-translate-x-1/2" />
        <div className="space-y-4 sm:space-y-5">
          {steps.map((step, i) => <StepCard key={i} step={step} index={i} />)}
        </div>
        <div className="relative flex md:justify-center mt-6 -ml-1 md:ml-0">
          <GlossyPaw className="w-12 h-12" />
        </div>
      </section>

      {/* CTA */}
      {c.on('cta') && (
      <section className="px-4 sm:px-6 py-10 sm:py-14">
        {/* A sunny feature card: happy dog with floating treats, the promise, three facts, the buttons */}
        <div className="relative max-w-5xl mx-auto overflow-hidden rounded-[28px] sm:rounded-[36px] bg-pastel-sun px-5 py-8 sm:px-10 sm:py-10 grid md:grid-cols-[auto_1fr] items-center gap-6 md:gap-10 text-center md:text-left">
          <span aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_8%_15%,#22A38B_0_4px,transparent_5px),radial-gradient(circle_at_92%_12%,#FF5C8D_0_4px,transparent_5px),radial-gradient(circle_at_70%_90%,#7C68E0_0_3px,transparent_4px),radial-gradient(circle_at_40%_95%,#F5A623_0_3px,transparent_4px)]" />
          <div className="relative mx-auto w-36 h-36 sm:w-52 sm:h-52" aria-hidden="true">
            <img src="/images/hero/dog-1.jpg" alt="" loading="lazy" className="w-full h-full rounded-full object-cover object-[60%_40%] ring-[6px] ring-white" />
            <GlossyBone className="absolute -left-5 top-3 w-12 h-12 sm:w-14 sm:h-14 animate-[bob_3s_ease-in-out_infinite]" />
            <GlossyBall className="absolute -right-3 -top-1 w-10 h-10 sm:w-12 sm:h-12 animate-[bob_3.4s_ease-in-out_.4s_infinite]" />
            <GlossyGift className="absolute -right-4 bottom-1 w-12 h-12 sm:w-14 sm:h-14 animate-[bob_3.2s_ease-in-out_.8s_infinite]" />
          </div>
          <div className="relative min-w-0">
            {cta.badge && (
              <span className="inline-flex items-center gap-1.5 -rotate-2 bg-white text-teal-700 text-[12px] font-extrabold px-3 py-1 rounded-full shadow-[0_6px_14px_-8px_rgba(36,48,58,0.4)]">
                <Icon name="paw" className="w-3.5 h-3.5" />{cta.badge.replace(/^\p{Extended_Pictographic}️?\s*/u, '')}
              </span>
            )}
            <h2 className="mt-3 text-[22px] sm:text-[30px] leading-tight font-extrabold tracking-tight text-gray-900 text-balance"><Caps text={cta.heading} /></h2>
            {cta.description && <p className="mt-2 text-[14px] sm:text-[15px] text-gray-700 leading-relaxed max-w-lg mx-auto md:mx-0">{cta.description}</p>}
            {cta.chips.some((c: any) => c.label) && (
              <ul className="mt-5 grid grid-cols-3 gap-2 max-w-md mx-auto md:mx-0">
                {cta.chips.filter((s: any) => s.label).slice(0, 3).map((s: any, i: number) => (
                  <li key={i} className="rounded-[16px] bg-white/80 px-2 py-2.5 flex flex-col items-center gap-1 text-center">
                    <LineIcon emoji={s.icon} className="w-5 h-5 text-teal-600" />
                    <span className="text-[11.5px] sm:text-[12px] font-semibold text-gray-700 leading-tight">{s.label}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-start gap-2.5">
              {cta.button1Text && (
                <CtaGlow href={cta.button1Href} icon="box" label={cta.button1Text.replace(/\s*[→›>]+\s*$/u, '')} className="justify-center [&>a]:w-full sm:[&>a]:w-auto" />
              )}
              {cta.button2Text && (
                <Button href={cta.button2Href} icon="arrow" tone="soft" label={cta.button2Text.replace(/\s*[→›>]+\s*$/u, '')} className="!h-11 !bg-white" />
              )}
            </div>
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
