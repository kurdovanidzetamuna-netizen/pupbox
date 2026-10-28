import { T as tx, asLang, seo } from '@/lib/seo';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import BuildBoxView from './BuildBoxView';

export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => {
  const lang = asLang(params.lang);
  return seo({
    lang, path: '/build-box',
    title: tx(lang, 'ააწყე ძაღლის კოლოფი შენით', 'Build your own dog box'),
    description: tx(lang, 'თავად აირჩიე ნუგბარი, სათამაშოები და მოვლის საშუალებები შენი ძაღლისთვის — ერთჯერადად ან ყოველთვიურად, მიწოდებით მთელ საქართველოში.', 'Pick the treats, toys and care items for your dog yourself — as a one-off box or every month, delivered across Georgia.'),
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
