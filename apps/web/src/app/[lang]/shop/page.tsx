import { Suspense } from 'react';
import { api } from '@/lib/api';
import { shopPage } from '@pupbox/content';
import { getStoredContent, pageMetadata } from '@/lib/content';
import ShopView from './ShopView';
import { JsonLd, breadcrumbs } from '@/lib/jsonld';
import { SITE_URL, asLang, atLang } from '@/lib/seo';

export const generateMetadata = ({ params }: { params: { lang: string } }) => pageMetadata(shopPage, { lang: params.lang });

export default async function ShopPage({
  params: route,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { category?: string; search?: string; page?: string; sort?: string; brand?: string; size?: string; seller?: string };
}) {
  // Category, search, brand, sort and page all go to the API, so ordering
  // and filtering apply to the whole catalogue rather than one page of it.
  const params: Record<string, string> = {};
  // The visitor's language, so A–Z sorts by the names they read.
  params.lang = route.lang === 'en' ? 'en' : 'ka';
  for (const k of ['category', 'search', 'page', 'sort', 'brand', 'size', 'seller'] as const) {
    if (searchParams[k]) params[k] = searchParams[k]!;
  }

  // Caught per-promise: one failing request shouldn't blank the whole page.
  const [{ items: products, total, pages }, categories, brands, content, sellers] = await Promise.all([
    api.products.list(params).catch(() => ({ items: [] as any[], total: 0, pages: 0 })),
    api.categories.list().catch(() => [] as any[]),
    api.products.brands().catch(() => [] as string[]),
    getStoredContent(shopPage),
    api.sellers.list().catch(() => [] as any[]),
  ]);

  const lang = asLang(route.lang);
  const list = {
    '@type': 'ItemList',
    itemListElement: (products as any[]).slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${atLang(`/shop/${p.slug}`, lang)}`, name: (lang === 'ka' && p.translations?.ka?.name) || p.name })),
  };

  return (
    <Suspense fallback={null}>
      <JsonLd data={[list, breadcrumbs(lang, [{ name: 'Pupbox', path: '/' }, { name: lang === 'en' ? 'Shop' : 'მაღაზია', path: '/shop' }])]} />
      <ShopView products={products} total={total} pages={pages} page={Number(searchParams.page || 1)}
        categories={categories as any[]} brands={brands} content={content} sellers={sellers} />
    </Suspense>
  );
}
