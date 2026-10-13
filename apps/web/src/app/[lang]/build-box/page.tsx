import { T as tx, asLang, seo } from '@/lib/seo';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import BuildBoxView from './BuildBoxView';

export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => {
  const lang = asLang(params.lang);
  return seo({
    lang, path: '/build-box',
    title: tx(lang, 'ააწყე შენი კოლოფი', 'Build your own box'),
    description: tx(lang, 'აირჩიე ნივთები შენი ძაღლისთვის — ერთჯერადად ან ყოველთვიურად.', 'Pick every item for your dog — once, or every month.'),
  });
};

/** Build-your-own box: the products admin allows, and the shop's box rules. */
export default async function BuildBoxPage() {
  const [products, config] = await Promise.all([
    api.customBox.products().catch(() => []),
    api.customBox.config().catch(() => ({ minItems: 3, packingFee: 5, monthlyDiscount: 10, mystery: { enabled: false, price: 0, max: 0 } })),
  ]);
  return <Suspense><BuildBoxView products={products} config={config} /></Suspense>;
}
