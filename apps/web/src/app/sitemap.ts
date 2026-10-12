import { MetadataRoute } from 'next';
import { API_URL } from '@/lib/api';

// Pages are listed at their Georgian address (the site's main language).
const BASE = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge'}/ka`;

async function fetchJson(path: string) {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogSlugs, categories] = await Promise.all([
    fetchJson('/blog/slugs'),
    fetchJson('/categories'),
  ]);
  // The products endpoint pages at most 100 at a time; walk every page.
  const productList: any[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await fetchJson(`/products?limit=100&page=${page}`);
    productList.push(...(res?.items ?? []));
    if (!res?.pages || page >= res.pages) break;
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/prices`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ];

  const productPages: MetadataRoute.Sitemap = productList.map((p: any) => ({
    url: `${BASE}/shop/${p.slug}`,
    lastModified: new Date(p.updatedAt || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = (Array.isArray(categories) ? categories : []).map((c: any) => ({
    url: `${BASE}/shop?category=${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const blogPages: MetadataRoute.Sitemap = (Array.isArray(blogSlugs) ? blogSlugs : []).map((s: any) => ({
    url: `${BASE}/blog/${s.slug}`,
    lastModified: new Date(s.updatedAt || Date.now()),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages];
}
