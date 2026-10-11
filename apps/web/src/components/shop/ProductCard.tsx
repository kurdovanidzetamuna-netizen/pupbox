'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';
import { categoryLook } from '@/lib/shopIcons';

const money = (n: unknown) => `₾${Number(n).toFixed(2)}`;

/** How many can still be bought (stock minus what's held in open orders). */
export const available = (inv: any) => (inv ? Math.max(0, Number(inv.quantity) - Number(inv.reservedQty || 0)) : 0);

/**
 * A product in the grid: big image with its badges (sale, low stock, sold
 * out), a round ＋ that adds one to the basket right here, then category,
 * name and price. Products that need a choice (size, engraving) open their
 * page instead of adding.
 */
export default function ProductCard({ product, index = 0 }: { product: any; index?: number }) {
  const { t, lang } = useLanguage();
  const { addProduct } = useCart();
  const [state, setState] = useState<'idle' | 'adding' | 'added' | 'error'>('idle');

  const ka = product.translations?.ka ?? {};
  const name = (lang === 'ka' && ka.name?.trim()) || product.name;
  const short = (lang === 'ka' && ka.shortDescription?.trim()) || product.shortDescription || '';
  const category = product.category ? ((lang === 'ka' && product.category.translations?.ka?.name) || product.category.name) : '';
  const left = available(product.inventory);
  const soldOut = left === 0;
  const low = !soldOut && product.inventory && left <= Number(product.inventory.lowStockAlert || 0);
  const sale = product.salePrice && Number(product.salePrice) < Number(product.price);
  const off = sale ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100) : 0;
  const needsChoice = !!(product.personalisation?.engraving || product.personalisation?.sizes?.length);
  const img = product.images?.[0];
  const href = `/shop/${product.slug}`;
  const look = categoryLook(product.category);

  async function quickAdd() {
    if (soldOut || state === 'adding') return;
    setState('adding');
    try {
      await addProduct(product.id, 1);
      setState('added');
      setTimeout(() => setState('idle'), 1600);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  return (
    <div className="group relative flex flex-col animate-[fadeUp_0.35s_ease-out_both]" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <div className="relative">
      <Link href={href} tabIndex={-1} aria-hidden="true" className={`block relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br ${look.tint} ${soldOut ? 'opacity-70' : ''}`}>
        {img ? (
          <img src={img.url} alt={img.altText || name} loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" aria-hidden="true">{look.icon}</span>
          </div>
        )}

        {/* Badges, top-left */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {sale && <span className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-peach-400 text-white">−{off}%</span>}
          {soldOut
            ? <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-white/90 text-gray-600">{t('shop.outOfStock')}</span>
            : low && <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">{fill(t('shop.onlyLeft'), { n: left })}</span>}
        </div>
      </Link>

        {/* Quick add, bottom-right */}
        {!soldOut && (needsChoice ? (
          <Link href={href} aria-label={`${t('shop.choose')}: ${name}`} title={t('shop.choose')}
            className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-white/95 text-teal-700 flex items-center justify-center hover:bg-teal-600 hover:text-white transition-colors">
            <Icon name="sliders" className="w-5 h-5" strokeWidth={2.2} />
          </Link>
        ) : (
          <button type="button" onClick={quickAdd} aria-label={`${t('shop.quickAdd')}: ${name}`} title={t('shop.quickAdd')}
            className={`absolute bottom-3 right-3 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
              state === 'added' ? 'bg-teal-500 text-white scale-110' : state === 'error' ? 'bg-red-500 text-white' : 'bg-white/95 text-teal-700 hover:bg-teal-600 hover:text-white'}`}>
            {state === 'adding'
              ? <span className="w-4 h-4 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              : <Icon name={state === 'added' ? 'check' : state === 'error' ? 'alert' : 'plus'} className="w-5 h-5" strokeWidth={2.4} />}
          </button>
        ))}
        {state === 'added' && (
          <span role="status" className="absolute bottom-3 right-16 h-11 px-3 inline-flex items-center rounded-full bg-gray-900/80 text-white text-[12px] font-semibold animate-[fadeUp_0.2s_ease-out]">
            {t('shop.added')}
          </span>
        )}
      </div>

      <Link href={href} className="pt-3 px-1 flex-1 flex flex-col rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
        {(category || product.brand) && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 truncate">{category || product.brand}</p>
        )}
        <h3 className="mt-0.5 text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">{name}</h3>
        {short && <p className="mt-1 text-[12px] text-gray-500 line-clamp-1">{short}</p>}
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          <span className={`text-[16px] font-extrabold ${sale ? 'text-peach-600' : 'text-gray-900'}`}>{money(sale ? product.salePrice : product.price)}</span>
          {sale && <span className="text-[12px] text-gray-400 line-through">{money(product.price)}</span>}
        </div>
      </Link>
    </div>
  );
}
