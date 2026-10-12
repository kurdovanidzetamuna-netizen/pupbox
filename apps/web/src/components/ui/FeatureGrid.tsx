import Link from 'next/link';
import { TYPE } from '@/components/ui/Heading';
import { LineIcon } from '@/components/ui/icons';

export type Feature = { icon: string; text: string };

/** Older saved texts began with the same emoji as their icon. */
const clean = (t: unknown) => String(t ?? '').replace(/^\p{Extended_Pictographic}️?\s*/u, '').trim();

/**
 * "What you get" lists, the same everywhere: the title (with an optional
 * line and link) on the left, the points on the right in two columns, each with a mint line icon on a small
 * pale mint tile, on one flat white panel (no borders or shadows). Stacks on phones.
 * Icons come from Page Builder emoji (shown as line icons, never in colour).
 */
export default function FeatureGrid({ title, subtitle, items, cta, className = '' }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  items: Feature[];
  /** A small link under the title, e.g. up to the plans. */
  cta?: { label: string; href: string };
  className?: string;
}) {
  const list = items.filter((x) => clean(x.text));
  if (!list.length) return null;
  return (
    <section className={`py-12 sm:py-14 bg-teal-50/60 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-7 lg:gap-14 lg:items-center">
        {/* The title side: a short mint bar, the title, one line, a link. */}
        <div className="min-w-0">
          <span className="block w-10 h-1 rounded-full bg-teal-400 mb-4" aria-hidden="true" />
          <h2 className={`${TYPE.section} [overflow-wrap:anywhere]`}>{title}</h2>
          {subtitle && <p className="mt-2 text-[14px] leading-relaxed text-gray-500 max-w-sm">{subtitle}</p>}
          {cta?.label && (
            <Link href={cta.href} className="group mt-5 inline-flex items-center gap-2 h-10 pl-4 pr-3 rounded-full bg-white text-teal-700 text-[13px] font-bold hover:bg-teal-600 hover:text-white transition-colors">
              {cta.label}
              <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
            </Link>
          )}
        </div>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-5 rounded-3xl bg-white p-5 sm:p-7">
          {list.map((f, i) => (
            <li key={i} className="flex items-center gap-3.5 min-w-0 animate-[fadeUp_0.35s_ease-out_both]" style={{ animationDelay: `${i * 40}ms` }}>
              <span className="w-11 h-11 shrink-0 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-lg" aria-hidden="true">
                <LineIcon emoji={f.icon} className="w-5 h-5" />
              </span>
              <span className="text-[14px] leading-snug font-medium text-gray-700">{clean(f.text)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
