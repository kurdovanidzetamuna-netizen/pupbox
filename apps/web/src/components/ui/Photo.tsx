import Image, { type ImageProps } from 'next/image';

/** Addresses next.config.mjs lets the image service resize (keep the two in step). */
const OK = /^(\/(?!\/)|https:\/\/images\.unsplash\.com\/|https:\/\/api\.pupbox\.ge\/uploads\/|http:\/\/localhost:4000\/uploads\/|https:\/\/[^/]+\.(amazonaws|cloudflare)\.com\/)/;

/**
 * A photo served at the size the screen needs, as AVIF/WebP (much lighter
 * than the original JPEG). A picture from anywhere else (a link pasted in
 * admin) is shown as it is, so it can never break the page.
 */
export default function Photo({ src, alt, ...rest }: Omit<ImageProps, 'src'> & { src: string }) {
  if (OK.test(src)) return <Image src={src} alt={alt} {...rest} />;
  const { fill, priority, sizes, quality, placeholder, blurDataURL, loader, unoptimized, ...img } = rest as any;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} {...img} style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...(img.style ?? {}) } : img.style} />;
}
