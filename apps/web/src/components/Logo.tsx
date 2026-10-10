import Link from 'next/link';

/** The brand mark from Header & Footer settings: an uploaded logo, or icon + name. */
export default function Logo({ brand, className = '' }: { brand: { logoImage: string; logoIcon: string; name: string }; className?: string }) {
  const name = brand.name || 'Pupbox';
  return (
    <Link href="/" aria-label={name} className={`wag-hover flex items-center gap-2.5 shrink-0 text-teal-600 ${className}`}>
      {brand.logoImage
        ? <img src={brand.logoImage} alt={name} className="h-8 sm:h-9 w-auto max-w-[180px] object-contain" />
        : <>
            {brand.logoIcon && (
              <span aria-hidden="true" className="w-10 h-10 rounded-[14px] bg-sun-400 border-2 border-ink flex items-center justify-center text-xl -rotate-6 shadow-step-ink">
                <span className="wag-on-hover">{brand.logoIcon}</span>
              </span>
            )}
            <span className="font-display text-[26px] font-bold tracking-tight lowercase">{name}</span>
          </>}
    </Link>
  );
}
