'use client';
import Link from 'next/link';
import { useBasketLine } from '@/lib/useBasketLine';
import QuantityStepper from '@/components/shop/QuantityStepper';
import InBasketTag from '@/components/shop/InBasketTag';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Icon } from '@/components/ui/icons';
import { categoryLook } from '@/lib/shopIcons';

const money = (n: unknown) => `₾${Number(n).toFixed(2)}`;

/** How many can still be bought (stock minus what's held in open orders). */
export const available = (inv: any) => (inv ? Math.max(0, Number(inv.quantity) - Number(inv.reservedQty || 0)) : 0);

/**
 * A compact product card: a soft image with its badges, name, a two-line
 * description and the price. ＋ adds one; once it's in the basket the button
 * becomes − n + (up to what's in stock) and a 🛍 n badge marks the card.
 * Products that need a choice (size, engraving) open their page instead.
 */
export default function ProductCard({ product, index = 0 }: { product: any; index?: number }) {
  const { t, lang } = useLanguage();
  const basket = useBasketLine(product.id);
  const { inCart, line, busy } = basket;
  const error = !!basket.error;

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

  const add = () => basket.more();

  return (
    <div className={`group relative flex flex-col rounded-3xl p-2 sm:p-2.5 ${soldOut ? '' : 'bg-white'} transition-all duration-200 animate-[fadeUp_0.35s_ease-out_both] ${
      soldOut ? 'bg-gray-50/80 ring-1 ring-gray-100' : inCart ? 'ring-2 ring-teal-200' : 'ring-1 ring-gray-100 hover:ring-teal-200'}`} style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}>
      <Link href={href} tabIndex={-1} aria-hidden="true"
        className={`relative block aspect-[4/3] rounded-2xl overflow-hidden ${soldOut ? 'bg-gray-100' : `bg-gradient-to-br ${look.tint}`}`}>
        {img ? (
          <img src={img.url} alt="" loading="lazy" className={`w-full h-full object-cover transition-transform duration-500 ${soldOut ? 'grayscale opacity-50' : 'group-hover:scale-[1.05]'}`} />
        ) : (
          <span className={`absolute inset-0 flex items-center justify-center text-[44px] transition-transform duration-500 ${soldOut ? 'grayscale opacity-40' : 'group-hover:scale-110 group-hover:-rotate-6'}`}>{look.icon}</span>
        )}
        <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {sale && <span className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-peach-400 text-white">−{off}%</span>}
          {!soldOut && low && <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">{fill(t('shop.onlyLeft'), { n: left })}</span>}
        </span>
        {/* Sold out: said across the picture, not just in a corner. */}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-1.5 bg-gray-700/75 text-white text-[11.5px] font-bold">
            <Icon name="ban" className="w-3.5 h-3.5" strokeWidth={2.4} />{t('shop.outOfStock')}
          </span>
        )}
      </Link>

      {/* In the basket: how many */}
      {/* In the basket: how many. Tapping it takes the product out. */}
      <InBasketTag count={inCart} onRemove={basket.remove} busy={busy} className="absolute top-3.5 right-3.5" />

      <Link href={href} className="px-1 pt-2.5 flex-1 flex flex-col rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
        {category && <span className={`text-[10.5px] font-bold uppercase tracking-wider truncate ${soldOut ? 'text-gray-400' : 'text-teal-700/70'}`}>{category}</span>}
        <h3 className={`mt-0.5 text-[13.5px] font-bold leading-snug line-clamp-2 transition-colors ${soldOut ? 'text-gray-500' : 'text-gray-900 group-hover:text-teal-700'}`}>{name}</h3>
        {short && <p className={`mt-1 text-[12px] leading-snug line-clamp-2 ${soldOut ? 'text-gray-400' : 'text-gray-500'}`}>{short}</p>}
      </Link>

      <div className="px-1 pt-2.5 pb-0.5 flex items-center justify-between gap-2">
        <div className="min-w-0 leading-none">
          <span className={`text-[15px] font-extrabold ${soldOut ? 'text-gray-400' : sale ? 'text-peach-600' : 'text-gray-900'}`}>{money(sale ? product.salePrice : product.price)}</span>
          {sale && <span className="block sm:inline sm:ml-1.5 mt-0.5 text-[11px] text-gray-400 line-through">{money(product.price)}</span>}
        </div>

        {soldOut ? (
          <span aria-hidden="true" title={t('shop.outOfStock')}
            className="w-9 h-9 shrink-0 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center cursor-not-allowed">
            <Icon name="ban" className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </span>
        ) : needsChoice ? (
          <Link href={href} aria-label={`${t('shop.choose')}: ${name}`} title={t('shop.choose')}
            className="w-9 h-9 shrink-0 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-100 hover:text-teal-800 transition-colors">
            <Icon name="sliders" className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </Link>
        ) : line ? (
          <QuantityStepper value={line.quantity} onLess={basket.less} onMore={basket.more} max={left} busy={busy} trashAtOne label={fill(t('shop.inBasket'), { n: inCart })} />
        ) : (
          <button type="button" onClick={add} disabled={busy} aria-label={`${t('shop.quickAdd')}: ${name}`} title={t('shop.quickAdd')}
            className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors active:scale-90 ${
              error ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-800'}`}>
            {busy ? <span className="w-4 h-4 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              : <Icon name={error ? 'alert' : 'plus'} className="w-[18px] h-[18px]" strokeWidth={2.4} />}
          </button>
        )}
      </div>
    </div>
  );
}
