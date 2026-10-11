import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { shopPage } from '@pupbox/content';
import { getStoredContent } from '@/lib/content';
import ProductView from './ProductView';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const product = await api.products.get(params.slug);
    // Search engines and the browser tab get the Georgian name — the site's language.
    const ka = product.translations?.ka ?? {};
    return {
      title: product.seoTitle || ka.name?.trim() || product.name,
      description: product.seoDesc || ka.shortDescription?.trim() || product.shortDescription,
    };
  } catch {
    return { title: 'გვერდი ვერ მოიძებნა' };
  }
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
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

  return <ProductView product={product} related={related.slice(0, 5)} content={content} />;
}
