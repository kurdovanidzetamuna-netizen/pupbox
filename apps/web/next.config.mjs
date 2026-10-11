/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Page descriptions shared with admin, shipped as TypeScript source.
  transpilePackages: ['@pupbox/content'],
  // Going back to a page fetches it again rather than showing what the
  // browser kept from before (stock and basket counts change).
  experimental: { staleTimes: { dynamic: 0, static: 30 } },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudflare.com' },
    ],
  },
};

export default nextConfig;
