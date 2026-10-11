'use client';
import { pricingPage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { Heading } from '@/components/ui/Heading';

/** Edited in admin → Page Builder → Pricing Page. */
export function PricesHeader({ content }: { content: StoredContent | null }) {
  const { header } = usePage(pricingPage, content);
  return (
    <Heading align="center" title={header.heading} subtitle={header.description} />
  );
}

export function PricesIncludes({ content }: { content: StoredContent | null }) {
  const c = usePage(pricingPage, content);
  if (!c.on('includes') || !c.includes.items.length) return null;
  return (
    <section className="py-12 sm:py-14 bg-teal-50">
      <div className="max-w-7xl mx-auto px-6">
        <Heading kind="section" align="center" title={c.includes.heading} />
        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
          {c.includes.items.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-teal-100">
              <span className="text-xl">{item.icon}</span>
              {/* Older saved texts began with the same emoji as the icon. */}
              <span>{String(item.text ?? '').replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, '')}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
