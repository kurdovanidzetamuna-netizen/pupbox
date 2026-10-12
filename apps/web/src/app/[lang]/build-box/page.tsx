import type { Metadata } from 'next';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import BuildBoxView from './BuildBoxView';

export const metadata: Metadata = {
  title: 'ააწყე შენი კოლოფი',
  description: 'აირჩიე ნივთები შენი ძაღლისთვის — ერთჯერადად ან ყოველთვიურად.',
};

/** Build-your-own box: the products admin allows, and the shop's box rules. */
export default async function BuildBoxPage() {
  const [products, config] = await Promise.all([
    api.customBox.products().catch(() => []),
    api.customBox.config().catch(() => ({ minItems: 3, packingFee: 5, monthlyDiscount: 10, mystery: { enabled: false, price: 0, max: 0 } })),
  ]);
  return <Suspense><BuildBoxView products={products} config={config} /></Suspense>;
}
