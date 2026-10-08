import { api } from '@/lib/api';
import PlanSection from './PlanSection';
import BoxContents from './BoxContents';
import { PricesHeader, PricesIncludes } from './PricesHeader';
import { pricingPage } from '@pupbox/content';
import { getStoredContent } from '@/lib/content';

export const metadata = { title: 'Pricing — Pupbox Subscription Plans', description: 'Choose the best Pupbox subscription plan for your dog.' };

export default async function PricesPage() {
  let plans: any[] = [];
  try {
    plans = await api.plans.list();
  } catch {
    plans = [];
  }
  const content = await getStoredContent(pricingPage);

  return (
    <main className="min-h-screen bg-white">
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <PricesHeader content={content} />
          <PlanSection plans={plans} />
        </div>
      </section>

      <BoxContents content={content} />
      <PricesIncludes content={content} />
    </main>
  );
}
