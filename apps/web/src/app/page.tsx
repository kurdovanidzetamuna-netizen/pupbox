import { api } from '@/lib/api';
import { Metadata } from 'next';
import HomePageClient from '@/components/HomePageClient';
import { homePage, pricingPage } from '@pupbox/content';
import { getFaq, getStoredContent, pageMetadata } from '@/lib/content';

export const generateMetadata = () => pageMetadata(homePage, { fullTitle: true });

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Pupbox',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge',
  description: 'ყოველთვიური კოლოფი შენი ძაღლისთვის: ნუგბარი, სათამაშოები და აქსესუარები — მიწოდება მთელ საქართველოში.',
};

export default async function HomePage() {
  let plans: any[] = [];
  try { plans = await api.plans.list(); } catch {}
  const [content, faq, pricing] = await Promise.all([getStoredContent(homePage), getFaq(), getStoredContent(pricingPage)]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <HomePageClient plans={plans} content={content} faq={faq} pricing={pricing} />
    </>
  );
}
