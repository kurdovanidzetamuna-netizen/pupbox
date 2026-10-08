/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Page descriptions shared with admin, shipped as TypeScript source.
  transpilePackages: ['@pupbox/content'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudflare.com' },
    ],
  },
};

export default nextConfig;
