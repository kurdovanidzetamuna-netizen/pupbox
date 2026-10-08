/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Page descriptions shared with the site, shipped as TypeScript source.
  transpilePackages: ['@pupbox/content'],
};
export default nextConfig;
