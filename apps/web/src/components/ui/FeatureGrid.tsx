import { Heading } from '@/components/ui/Heading';
import { LineIcon } from '@/components/ui/icons';

export type Feature = { icon: string; text: string };

/** Older saved texts began with the same emoji as their icon. */
const clean = (t: unknown) => String(t ?? '').replace(/^\p{Extended_Pictographic}️?\s*/u, '').trim();

/**
 * "What you get" lists, the same everywhere: the title on the left, the
 * points on the right in two columns, each with a mint line icon on a small
 * white tile. Flat — no cards, borders or shadows. Stacks on phones.
 * Icons come from Page Builder emoji (shown as line icons, never in colour).
 */
export default function FeatureGrid({ title, subtitle, items, className = '' }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  items: Feature[];
  className?: string;
}) {
  const list = items.filter((x) => clean(x.text));
  if (!list.length) return null;
  return (
    <section className={`py-12 sm:py-14 bg-teal-50/60 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 lg:gap-14 items-start">
        <Heading kind="section" title={title} subtitle={subtitle} className="!mb-0 lg:sticky lg:top-24" />
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          {list.map((f, i) => (
            <li key={i} className="flex items-center gap-3.5 min-w-0 animate-[fadeUp_0.35s_ease-out_both]" style={{ animationDelay: `${i * 40}ms` }}>
              <span className="w-11 h-11 shrink-0 rounded-2xl bg-white text-teal-600 flex items-center justify-center text-lg" aria-hidden="true">
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
