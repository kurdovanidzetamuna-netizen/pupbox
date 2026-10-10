import Link from 'next/link';

/** The brand mark from Header & Footer settings: an uploaded logo, or icon + name. */
export default function Logo({ brand, className = '' }: { brand: { logoImage: string; logoIcon: string; name: string }; className?: string }) {
  const name = brand.name || 'Pupbox';
  return (
    <Link href="/" aria-label={name} className={`text-2xl font-extrabold text-teal-600 flex items-center gap-1 shrink-0 ${className}`}>
      {brand.logoImage
        ? <img src={brand.logoImage} alt={name} className="h-8 sm:h-9 w-auto max-w-[180px] object-contain" />
        : <>{brand.logoIcon && <span aria-hidden="true">{brand.logoIcon}</span>} {name}</>}
    </Link>
  );
}
