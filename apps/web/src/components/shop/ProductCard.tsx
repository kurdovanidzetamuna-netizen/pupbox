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
 * A compact product card: a soft image with its badges, name, a two-line
 * description and the price. ＋ adds one; once it's in the basket the button
 * becomes − n + (up to what's in stock) and a 🛍 n badge marks the card.
 * Products that need a choice (size, engraving) open their page instead.
 */
export default function ProductCard({ product, index = 0 }: { product: any; index?: number }) {
  const { t, lang } = useLanguage();
  const { cart, addProduct, updateItem, removeItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

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

  // What's already in the basket: all lines for this product (a named bowl
  // can be in it several times, once per name).
  const lines: any[] = (cart?.items ?? []).filter((i: any) => i.productId === product.id);
  const inCart = lines.reduce((n, i) => n + Number(i.quantity || 0), 0);
  const line = lines.length === 1 ? lines[0] : null;

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(false);
    try { await fn(); } catch { setError(true); setTimeout(() => setError(false), 2000); } finally { setBusy(false); }
  }
  const add = () => run(() => (line ? updateItem(line.id, line.quantity + 1) : addProduct(product.id, 1)));
  const less = () => line && run(() => (line.quantity <= 1 ? removeItem(line.id) : updateItem(line.id, line.quantity - 1)));
  /** Take this product out of the basket altogether (every line of it). */
  const uncheck = () => run(async () => { for (const l of lines) await removeItem(l.id); });

  return (
    <div className={`group relative flex flex-col rounded-3xl bg-white p-2 sm:p-2.5 transition-all duration-200 animate-[fadeUp_0.35s_ease-out_both] ${
      inCart ? 'ring-2 ring-teal-200' : 'ring-1 ring-gray-100 hover:ring-teal-200'}`} style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}>
      <Link href={href} tabIndex={-1} aria-hidden="true"
        className={`relative block aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${look.tint} ${soldOut ? 'opacity-60' : ''}`}>
        {img ? (
          <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[44px] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">{look.icon}</span>
        )}
        <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {sale && <span className="text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-peach-400 text-white">−{off}%</span>}
          {soldOut
            ? <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full bg-white/90 text-gray-600">{t('shop.outOfStock')}</span>
            : low && <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">{fill(t('shop.onlyLeft'), { n: left })}</span>}
        </span>
      </Link>

      {/* In the basket: how many */}
      {/* In the basket: how many. Tapping it takes the product out. */}
      {inCart > 0 && (
        <button type="button" onClick={uncheck} disabled={busy}
          title={`${fill(t('shop.inBasket'), { n: inCart })} · ${t('shop.uncheck')}`} aria-label={`${fill(t('shop.inBasket'), { n: inCart })}. ${t('shop.uncheck')}`}
          className="group/tag absolute top-3.5 right-3.5 inline-flex items-center gap-1 h-7 pl-1.5 pr-1 rounded-full bg-white/90 text-teal-700 ring-1 ring-teal-100 text-[12px] font-bold backdrop-blur animate-[pop_0.3s_ease-out] hover:bg-red-50 hover:text-red-500 hover:ring-red-100 transition-colors disabled:opacity-60">
          <Icon name="bag" className="w-4 h-4" strokeWidth={2.2} />
          <span className="tabular-nums">{inCart}</span>
          <span className="w-5 h-5 rounded-full flex items-center justify-center bg-teal-50 group-hover/tag:bg-red-100"><Icon name="close" className="w-3 h-3" strokeWidth={2.8} /></span>
        </button>
      )}

      <Link href={href} className="px-1 pt-2.5 flex-1 flex flex-col rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
        {category && <span className="text-[10.5px] font-bold uppercase tracking-wider text-teal-700/70 truncate">{category}</span>}
        <h3 className="mt-0.5 text-[13.5px] font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">{name}</h3>
        {short && <p className="mt-1 text-[12px] text-gray-500 leading-snug line-clamp-2">{short}</p>}
      </Link>

      <div className="px-1 pt-2.5 pb-0.5 flex items-center justify-between gap-2">
        <div className="min-w-0 leading-none">
          <span className={`text-[15px] font-extrabold ${sale ? 'text-peach-600' : 'text-gray-900'}`}>{money(sale ? product.salePrice : product.price)}</span>
          {sale && <span className="block sm:inline sm:ml-1.5 mt-0.5 text-[11px] text-gray-400 line-through">{money(product.price)}</span>}
        </div>

        {soldOut ? null : needsChoice ? (
          <Link href={href} aria-label={`${t('shop.choose')}: ${name}`} title={t('shop.choose')}
            className="w-9 h-9 shrink-0 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-100 hover:text-teal-800 transition-colors">
            <Icon name="sliders" className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </Link>
        ) : line ? (
          <div className="flex items-center h-9 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100" role="group" aria-label={fill(t('shop.inBasket'), { n: inCart })}>
            <button type="button" onClick={less} disabled={busy} aria-label={t('shop.less')} title={t('shop.less')}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-teal-100 disabled:opacity-60">
              <Icon name={line.quantity <= 1 ? 'trash' : 'minus'} className="w-4 h-4" strokeWidth={2.4} />
            </button>
            <span className="min-w-[1.25rem] text-center text-[13px] font-extrabold tabular-nums" aria-live="polite">{busy ? '…' : line.quantity}</span>
            <button type="button" onClick={add} disabled={busy || inCart >= left} aria-label={t('shop.more')} title={inCart >= left ? fill(t('shop.onlyLeft'), { n: left }) : t('shop.more')}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-teal-100 disabled:opacity-40">
              <Icon name="plus" className="w-4 h-4" strokeWidth={2.4} />
            </button>
          </div>
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
