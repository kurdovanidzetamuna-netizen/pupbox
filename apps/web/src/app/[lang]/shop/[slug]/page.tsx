import type { Metadata } from 'next';
import { JsonLd, ORG, breadcrumbs } from '@/lib/jsonld';
import { SITE_URL, T, asLang, atLang, seo, type Lang } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { shopPage } from '@pupbox/content';
import { getStoredContent } from '@/lib/content';
import ProductView from './ProductView';

/** Name and descriptions in the page's language (Georgian lives in translations.ka). */
function inLang(product: any, lang: Lang) {
  const ka = product.translations?.ka ?? {};
  const pick = (en?: string | null, kaText?: string | null) => (lang === 'ka' && kaText?.trim()) || en || '';
  return { name: pick(product.name, ka.name), short: pick(product.shortDescription, ka.shortDescription), description: pick(product.description, ka.description) };
}
const mainImage = (product: any) => [...(product.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))[0]?.url as string | undefined;

/**
 * A product's text for Google: its own words, and when those are short, the
 * price and delivery after them so the result says what people look for.
 */
function withPrice(text: string | null | undefined, price: number, lang: 'ka' | 'en') {
  const own = (text ?? '').replace(/\s+/g, ' ').trim();
  if (own.length >= 110) return own;
  const tail = lang === 'en' ? `₾${price.toFixed(2)} · delivered across Georgia by Pupbox.` : `₾${price.toFixed(2)} · მიწოდება მთელ საქართველოში — Pupbox.`;
  return own ? `${own.replace(/[.!]?$/, '.')} ${tail}` : tail;
}

export async function generateMetadata({ params }: { params: { slug: string; lang: string } }): Promise<Metadata> {
  const lang = asLang(params.lang);
  try {
    const product = await api.products.get(params.slug);
    const p = inLang(product, lang);
    return seo({
      lang, path: `/shop/${product.slug}`,
      title: product.seoTitle || p.name,
      description: product.seoDesc || withPrice(p.short || p.description, Number(product.price), lang),
      photo: mainImage(product),
      sub: `₾${Number(product.price).toFixed(2)}${p.short ? ` · ${p.short}` : ''}`,
    });
  } catch {
    return { title: T(lang, 'გვერდი ვერ მოიძებნა', 'Page not found'), robots: { index: false } };
  }
}

export default async function ProductDetailPage({ params }: { params: { slug: string; lang: string } }) {
  const lang = asLang(params.lang);
  let product: any;
  try {
    product = await api.products.get(params.slug);
  } catch {
    notFound();
  }

  // Similar: the same category first, then anything else, up to five.
  const [sameCat, content] = await Promise.all([
    (product.category ? api.products.list({ category: product.category.slug }) : Promise.resolve({ items: [] as any[] }))
      .catch(() => ({ items: [] as any[] })),
    getStoredContent(shopPage),
  ]);
  let related = sameCat.items.filter((p: any) => p.id !== product.id);
  if (related.length < 5) {
    const more = await api.products.list().catch(() => ({ items: [] as any[] }));
    related = [...related, ...more.items.filter((p: any) => p.id !== product.id && !related.some((r: any) => r.id === p.id))];
  }

  // Name, photos, price and stock for search results (rich results).
  const p = inLang(product, lang);
  const url = `${SITE_URL}${atLang(`/shop/${product.slug}`, lang)}`;
  const inStock = (product.inventory?.quantity ?? 0) - (product.inventory?.reservedQty ?? 0) > 0;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description || p.short || undefined,
      image: (product.images ?? []).map((i: any) => i.url),
      sku: product.sku || undefined,
      ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
      ...(product.category ? { category: product.category.name } : {}),
      url,
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'GEL',
        price: Number(product.price).toFixed(2),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: ORG,
      },
    },
    breadcrumbs(lang, [
      { name: 'Pupbox', path: '/' },
      { name: T(lang, 'მაღაზია', 'Shop'), path: '/shop' },
      { name: p.name, path: `/shop/${product.slug}` },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductView product={product} related={related.slice(0, 5)} content={content} />
    </>
  );
}
