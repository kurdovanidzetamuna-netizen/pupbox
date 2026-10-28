/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Page descriptions shared with admin, shipped as TypeScript source.
  transpilePackages: ['@pupbox/content'],
  // Going back to a page fetches it again rather than showing what the
  // browser kept from before (stock and basket counts change).
  experimental: { staleTimes: { dynamic: 0, static: 30 } },
  images: {
    // Served smaller and in modern formats (AVIF/WebP) for each screen.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudflare.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Photos uploaded in admin (the API serves /uploads).
      { protocol: 'https', hostname: 'api.pupbox.ge', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
    ],
  },
};

export default nextConfig;
