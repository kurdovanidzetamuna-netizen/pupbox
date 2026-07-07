import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account/', '/cart', '/checkout/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
