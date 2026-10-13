import { api } from '@/lib/api';
import PlanSection from './PlanSection';
import BoxContents from './BoxContents';
import BuildBoxPromo from '@/components/BuildBoxPromo';
import { PricesHeader, PricesIncludes } from './PricesHeader';
import { pricingPage } from '@pupbox/content';
import { getStoredContent, pageMetadata } from '@/lib/content';

export const generateMetadata = ({ params }: { params: { lang: string } }) => pageMetadata(pricingPage, { lang: params.lang });

export default async function PricesPage() {
  let plans: any[] = [];
  try {
    plans = await api.plans.list();
  } catch {
    plans = [];
  }
  const boxConfig = await api.customBox.config().catch(() => null);
  const content = await getStoredContent(pricingPage);

  return (
    <main className="min-h-screen bg-white">
      <section id="plans" className="pt-8 sm:pt-10 pb-14 sm:pb-14 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <PricesHeader content={content} />
          <PlanSection plans={plans} content={content} />
          {boxConfig && <BuildBoxPromo monthlyDiscount={boxConfig.monthlyDiscount} />}
        </div>
      </section>

      <BoxContents content={content} />
      <PricesIncludes content={content} />
    </main>
  );
}
