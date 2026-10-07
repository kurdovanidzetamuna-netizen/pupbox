import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Prefix rules: '/checkout' also covers /checkout/thank-you. Gift claim
        // links carry a private token and must never be indexed.
        disallow: ['/account', '/cart', '/checkout', '/gift/', '/login', '/register', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
