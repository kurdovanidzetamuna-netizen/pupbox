import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Prefix rules: '/checkout' also covers /checkout/thank-you.
        disallow: ['/account', '/cart', '/checkout', '/login', '/register', '/verify', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
