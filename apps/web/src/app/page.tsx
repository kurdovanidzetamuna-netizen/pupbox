import { api } from '@/lib/api';
import { Metadata } from 'next';
import HomePageClient from '@/components/HomePageClient';
import { homePage } from '@pupbox/content';
import { getFaq, getStoredContent } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Pupbox — ყოველთვიური ყუთის გამოწერა საქართველოში',
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
  try { plans = await api.plans.list(); } catch {}
  const [content, faq] = await Promise.all([getStoredContent(homePage), getFaq()]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <HomePageClient plans={plans} content={content} faq={faq} />
    </>
  );
}
