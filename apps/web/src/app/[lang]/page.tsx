import { JsonLd, ORG } from '@/lib/jsonld';
import { SITE_URL, T as tx, asLang, atLang } from '@/lib/seo';
import { api } from '@/lib/api';
import { Metadata } from 'next';
import HomePageClient from '@/components/HomePageClient';
import { homePage, pricingPage } from '@pupbox/content';
import { getStoredContent, pageMetadata } from '@/lib/content';

export const generateMetadata = ({ params }: { params: { lang: string } }) => pageMetadata(homePage, { fullTitle: true, lang: params.lang });

export default async function HomePage({ params }: { params: { lang: string } }) {
  const lang = asLang(params.lang);
  let plans: any[] = [];
  try { plans = await api.plans.list(); } catch {}
  const tiers = await api.tiers.list().catch(() => []);
  const [content, pricing] = await Promise.all([getStoredContent(homePage), getStoredContent(pricingPage)]);

  return (
    <>
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          ...ORG,
          description: tx(lang, 'ყოველთვიური კოლოფი შენი ძაღლისთვის: ნუგბარი, სათამაშოები და აქსესუარები — მიწოდება მთელ საქართველოში.', 'A monthly box for your dog: treats, toys and accessories, delivered across Georgia.'),
          areaServed: 'GE',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Pupbox',
          url: `${SITE_URL}${atLang('/', lang)}`,
          inLanguage: lang,
          potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}${atLang('/shop', lang)}?search={search_term_string}`, 'query-input': 'required name=search_term_string' },
        },
      ]} />
      <HomePageClient plans={plans} tiers={tiers} content={content} pricing={pricing} />
    </>
  );
}
