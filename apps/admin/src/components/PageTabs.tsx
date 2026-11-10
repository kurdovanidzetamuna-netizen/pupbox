'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Pages that belong together, as tabs on top of each (one menu entry opens them). */
export const BOX_PRICES = [
  { href: '/dashboard/box-tiers', label: 'Box types', hint: 'Mini, Standard, Premium' },
  { href: '/dashboard/subscription-plans', label: 'Plans & prices', hint: 'Lengths and prices' },
];
export const BOX_PRODUCTS = [
  { href: '/dashboard/box-items', label: 'Ready-made boxes', hint: 'Products we pack' },
  { href: '/dashboard/custom-box-items', label: 'Build your own', hint: 'Items customers pick' },
];

export default function PageTabs({ tabs }: { tabs: { href: string; label: string; hint?: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Sections" className="adm-pagetabs">
      {tabs.map((t) => {
        const on = path === t.href || path.startsWith(t.href + '/');
        return (
          <Link key={t.href} href={t.href} aria-current={on ? 'page' : undefined} data-on={on || undefined}>
            <span>{t.label}</span>
            {t.hint && <small>{t.hint}</small>}
          </Link>
        );
      })}
    </nav>
  );
}
