'use client';
import Link from '@/components/LangLink';
import { useLanguage } from '@/context/LanguageContext';
import { Icon } from '@/components/ui/icons';
import { Heading } from '@/components/ui/Heading';
import FadeIn from '@/components/FadeIn';
import { GIFT } from '@/lib/gift';

type Step = { icon?: string; title: string; desc?: string };

const MINT = 'bg-teal-50 text-teal-700 hover:bg-teal-100';

/** The four ways to buy, shown as icon tiles on the first step. */
const WAYS = [
  { key: 'box', icon: 'box', href: '/prices#plans', tone: MINT },
  { key: 'custom', icon: 'sparkle', href: '/build-box', tone: MINT },
  { key: 'gift', icon: 'gift', href: '/prices?gift=true', tone: `${GIFT.chip} hover:bg-lilac-100` },
  { key: 'shop', icon: 'bag', href: '/shop', tone: MINT },
] as const;

function Ways() {
  const { t } = useLanguage();
  return (
    <div className="mt-3 flex gap-2">
      {WAYS.map((w) => (
        <Link key={w.key} href={w.href} aria-label={t(`ways.${w.key}.t`)}
          className="group/way relative flex flex-col items-center gap-1">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${w.tone}`}>
            <Icon name={w.icon} className="w-[18px] h-[18px]" />
          </span>
          <span className="lg:hidden text-[10.5px] leading-tight text-gray-500 text-center whitespace-nowrap">{t(`ways.${w.key}.short`)}</span>
          {/* Hover label on wide screens */}
          <span role="tooltip" className="pointer-events-none absolute bottom-full mb-1.5 hidden lg:group-hover/way:block lg:group-focus-visible/way:block whitespace-nowrap rounded-lg bg-gray-800 text-white text-[11px] font-medium px-2 py-1 z-30 animate-[fadeIn_0.12s_ease-out]">
            {t(`ways.${w.key}.t`)}
          </span>
        </Link>
      ))}
    </div>
  );
}

/**
 * How it works: four numbered steps, the four ways to buy on the first.
 * In a row on wide screens (a thin line joins the numbers), stacked on
 * phones. The title and steps come from admin → Page Builder → Home Page
 * → How it works.
 */
export default function HomeRoadmap({ heading, steps }: { heading: string; steps: Step[] }) {
  const stops = steps.slice(0, 4);
  if (!stops.length) return null;

  return (
    <section className="py-12 sm:py-14 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Heading kind="section" align="center" title={heading} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {stops.map((s, i) => (
            <FadeIn key={i} delay={i * 80} direction="up">
              <div className="relative flex gap-4 lg:flex-col lg:gap-3">
                {/* The line to the next number, on wide screens */}
                {i < stops.length - 1 && (
                  <span aria-hidden="true" className="hidden lg:block absolute top-[18px] left-12 -right-6 border-t border-dashed border-teal-200" />
                )}
                <span className="relative shrink-0 w-9 h-9 rounded-full bg-teal-50 text-teal-700 text-[15px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-gray-900">{s.title}</h3>
                  {s.desc && <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">{s.desc}</p>}
                  {i === 0 && <Ways />}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
