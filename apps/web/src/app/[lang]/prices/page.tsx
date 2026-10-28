import { api } from '@/lib/api';
import PlanSection from './PlanSection';
import BoxContents from './BoxContents';
import BuildBoxPromo from '@/components/BuildBoxPromo';
import { PricesHeader, PricesIncludes } from './PricesHeader';
import { pricingPage } from '@pupbox/content';
import { getStoredContent, pageMetadata } from '@/lib/content';
import { JsonLd, breadcrumbs, ORG } from '@/lib/jsonld';
import { SITE_URL, asLang, atLang } from '@/lib/seo';

export const generateMetadata = ({ params }: { params: { lang: string } }) => pageMetadata(pricingPage, { lang: params.lang });

export default async function PricesPage({ params }: { params: { lang: string } }) {
  const lang = asLang(params.lang);
  let plans: any[] = [];
  try {
    plans = await api.plans.list();
  } catch {
    plans = [];
  }
  const tiers = await api.tiers.list().catch(() => []);
  const boxConfig = await api.customBox.config().catch(() => null);
  const content = await getStoredContent(pricingPage);

  // For Google: each box with what it costs per term (lowest to highest), and where we are.
  const boxes = (tiers as any[]).map((tr) => {
    const prices = (tr.plans ?? []).map((p: any) => Number(p.price)).filter((n: number) => n > 0);
    const name = (lang === 'ka' && tr.translations?.ka?.name) || tr.name;
    const description = (lang === 'ka' && tr.translations?.ka?.tagline) || tr.tagline || tr.description;
    return prices.length ? {
      '@type': 'Product', name: `Pupbox ${name}`, ...(description ? { description } : {}), brand: { '@type': 'Brand', name: 'Pupbox' },
      offers: { '@type': 'AggregateOffer', priceCurrency: 'GEL', lowPrice: Math.min(...prices).toFixed(2), highPrice: Math.max(...prices).toFixed(2), offerCount: prices.length, availability: 'https://schema.org/InStock', url: `${SITE_URL}${atLang('/prices', lang)}` },
    } : null;
  }).filter(Boolean) as object[];

  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={[ORG, ...boxes, breadcrumbs(lang, [{ name: 'Pupbox', path: '/' }, { name: lang === 'en' ? 'Pricing' : 'ფასები', path: '/prices' }])]} />
      <section id="plans" className="pt-8 sm:pt-10 pb-14 sm:pb-14 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <PricesHeader content={content} />
          <PlanSection plans={plans} tiers={tiers} content={content} />
          {boxConfig && <BuildBoxPromo monthlyDiscount={boxConfig.monthlyDiscount} />}
        </div>
      </section>

      <BoxContents content={content} />
      <PricesIncludes content={content} />
    </main>
  );
}
