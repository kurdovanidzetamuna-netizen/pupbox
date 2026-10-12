import { MetadataRoute } from 'next';
import { API_URL } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

async function fetchJson(path: string) {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

type Entry = MetadataRoute.Sitemap[number];

/** One page, listed at its Georgian address with its English twin beside it. */
const page = (path: string, extra: Omit<Entry, 'url'> = {}): Entry => {
  const at = (l: string) => `${SITE_URL}/${l}${path === '/' ? '' : path}`;
  return { url: at('ka'), alternates: { languages: { ka: at('ka'), en: at('en') } }, lastModified: new Date(), ...extra };
};

/**
 * Every public page for search engines: the main pages, each product, blog
 * post and category, and the info pages (terms, privacy). Account, basket,
 * checkout and sign-in are left out (robots.txt keeps crawlers away from them).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogSlugs, categories, blogCategories, cmsPages] = await Promise.all([
    fetchJson('/blog/slugs'),
    fetchJson('/categories'),
    fetchJson('/blog/categories'),
    fetchJson('/cms'),
  ]);
  // The products endpoint pages at most 100 at a time; walk every page.
  const products: any[] = [];
  for (let n = 1; n <= 50; n++) {
    const res = await fetchJson(`/products?limit=100&page=${n}`);
    products.push(...(res?.items ?? []));
    if (!res?.pages || n >= res.pages) break;
  }
  const list = (x: unknown) => (Array.isArray(x) ? x : []);

  return [
    page('/', { changeFrequency: 'weekly', priority: 1 }),
    page('/shop', { changeFrequency: 'daily', priority: 0.9 }),
    page('/prices', { changeFrequency: 'weekly', priority: 0.9 }),
    page('/build-box', { changeFrequency: 'weekly', priority: 0.8 }),
    page('/how-it-works', { changeFrequency: 'monthly', priority: 0.7 }),
    page('/blog', { changeFrequency: 'daily', priority: 0.7 }),
    page('/faq', { changeFrequency: 'monthly', priority: 0.6 }),
    ...products.map((p: any) => page(`/shop/${p.slug}`, { lastModified: new Date(p.updatedAt || Date.now()), changeFrequency: 'weekly', priority: 0.8 })),
    ...list(categories).map((c: any) => page(`/shop?category=${c.slug}`, { changeFrequency: 'weekly', priority: 0.6 })),
    ...list(blogSlugs).map((s: any) => page(`/blog/${s.slug}`, { lastModified: new Date(s.updatedAt || Date.now()), changeFrequency: 'monthly', priority: 0.6 })),
    ...list(blogCategories).map((c: any) => page(`/blog/category/${c.slug}`, { changeFrequency: 'weekly', priority: 0.5 })),
    ...list(cmsPages).filter((p: any) => p.status === 'PUBLISHED' && !String(p.slug).startsWith('config-'))
      .map((p: any) => page(`/pages/${p.slug}`, { lastModified: new Date(p.updatedAt || Date.now()), changeFrequency: 'yearly', priority: 0.3 })),
  ];
}
