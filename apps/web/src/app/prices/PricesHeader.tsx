'use client';
import { pricingPage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { Heading } from '@/components/ui/Heading';
import FeatureGrid from '@/components/ui/FeatureGrid';

/** Edited in admin → Page Builder → Pricing Page. */
export function PricesHeader({ content }: { content: StoredContent | null }) {
  const { header } = usePage(pricingPage, content);
  return (
    <Heading align="center" title={header.heading} subtitle={header.description} />
  );
}

export function PricesIncludes({ content }: { content: StoredContent | null }) {
  const c = usePage(pricingPage, content);
  if (!c.on('includes')) return null;
  return <FeatureGrid title={c.includes.heading} subtitle={c.includes.description} items={c.includes.items}
    cta={c.includes.cta ? { label: c.includes.cta, href: '#plans' } : undefined} />;
}
