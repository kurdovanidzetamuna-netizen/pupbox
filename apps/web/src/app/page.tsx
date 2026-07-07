import { api } from '@/lib/api';
import { Metadata } from 'next';
import HomePageClient from '@/components/HomePageClient';

export const metadata: Metadata = {
  title: 'Pupbox — ყოველთვიური კუთხის გამოწერა საქართველოში',
  description: 'პრემიუმ საჭმლის, სათამაშოებისა და აქსესუარების კურირებული ყოველთვიური კოლოფი შენი ძაღლისთვის. მიწოდება მთელ საქართველოში.',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Pupbox',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge',
  description: 'Curated monthly subscription boxes for your dog. Fresh treats, toys, and accessories delivered across Georgia.',
};

export default async function HomePage() {
  let plans: any[] = [];
  let cmsHomepage: any = null;
  let cmsFaq: any = null;
  try { plans = await api.plans.list(); } catch {}
  try { cmsHomepage = await api.cms.get('config-homepage'); } catch {}
  try { cmsFaq = await api.cms.get('config-faq-global'); } catch {}

  const enabled: Record<string, boolean> = cmsHomepage?.content?.enabled || {};

  const faqItems: any[] = (cmsFaq?.content?.items || []).filter((item: any) =>
    !item.pages?.length || item.pages.includes('home')
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <HomePageClient plans={plans} enabled={enabled} faqItems={faqItems} />
    </>
  );
}
