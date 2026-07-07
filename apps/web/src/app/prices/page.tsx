import { api } from '@/lib/api';
import PlanSection from './PlanSection';
import BoxContents from './BoxContents';
import CustomBox from './CustomBox';
import { PricesHeader, PricesIncludes } from './PricesHeader';

export const metadata = { title: 'Pricing — Pupbox Subscription Plans', description: 'Choose the best Pupbox subscription plan for your dog.' };

export default async function PricesPage() {
  let plans: any[] = [];
  try {
    plans = await api.plans.list();
  } catch {
    plans = [];
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <PricesHeader />
          <PlanSection plans={plans} />
        </div>
      </section>

      <BoxContents />
      <CustomBox />
      <PricesIncludes />
    </main>
  );
}
