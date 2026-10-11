'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { shopPage, ALLERGENS, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Heading } from '@/components/ui/Heading';
import Field from '@/components/ui/Field';
import { FieldError } from '@/components/ui/FormError';
import { Icon } from '@/components/ui/icons';
import { categoryLook } from '@/lib/shopIcons';
import { useBasketLine } from '@/lib/useBasketLine';
import ProductCard, { available } from '@/components/shop/ProductCard';
import QuantityStepper from '@/components/shop/QuantityStepper';
import InBasketTag from '@/components/shop/InBasketTag';
import PerksStrip from '@/components/shop/PerksStrip';

const money = (n: unknown) => `₾${Number(n).toFixed(2)}`;

/**
 * A product, built from the shop's own pieces: gallery, the shared title,
 * price, stock, size chips / engraving field, the same − n + stepper and
 * 🛍 tag as the cards, the shop's promises, details, and similar products.
 * On phones the buy row stays at the bottom of the screen.
 */
export default function ProductView({ product, related, content }: { product: any; related: any[]; content: StoredContent | null }) {
  const { t, lang } = useLanguage();
  const c = usePage(shopPage, content);
  const basket = useBasketLine(product.id);
  const { inCart, line, busy } = basket;

  const ka = product.translations?.ka ?? {};
  const pick = (en?: string | null, kaText?: string | null) => (lang === 'ka' && kaText?.trim()) || en || '';
  const name = pick(product.name, ka.name);
  const short = pick(product.shortDescription, ka.shortDescription);
  const description = pick(product.description, ka.description);
  const catName = product.category ? pick(product.category.name, product.category.translations?.ka?.name) : '';
  const look = categoryLook(product.category);

  const images: any[] = [...(product.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const [shown, setShown] = useState(0);
  const left = available(product.inventory);
  const soldOut = left === 0;
  const low = !soldOut && left <= Number(product.inventory?.lowStockAlert || 0);
  const sale = product.salePrice && Number(product.salePrice) < Number(product.price);
  const off = sale ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100) : 0;
  const price = sale ? product.salePrice : product.price;

  const sizes: string[] = product.personalisation?.sizes ?? [];
  const engr = product.personalisation?.engraving as { maxLength: number } | undefined;
  const needsChoice = sizes.length > 0 || !!engr;
  const [size, setSize] = useState('');
  const [engraving, setEngraving] = useState('');
  const [qty, setQty] = useState(1);
  const [errs, setErrs] = useState<{ size?: string; engraving?: string }>({});
  const [justAdded, setJustAdded] = useState(false);

  // Steppers bind to the basket when it already holds this (plain) product.
  const bound = !!line && !needsChoice;
  const room = Math.max(0, left - inCart);

  async function addToBasket() {
    const e: typeof errs = {};
    if (sizes.length && !size) e.size = t('pdp.p.needSize');
    if (engr && !engraving.trim()) e.engraving = t('pdp.p.needName');
    setErrs(e);
    if (e.size || e.engraving) return;
    const ok = await basket.add(qty, needsChoice ? { ...(engr ? { engraving: engraving.trim() } : {}), ...(sizes.length ? { size } : {}) } : undefined);
    if (ok) {
      setQty(1); setEngraving('');
      setJustAdded(true); setTimeout(() => setJustAdded(false), 1800);
    }
  }

  // The phone buy bar steps aside once the page's content has scrolled by
  // (so it never sits on top of the footer).
  const end = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting || e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const allergens: string[] = product.allergens ?? [];
  const allergenName = (a: string) => (lang === 'ka' ? ALLERGENS.find((x) => x.key.toLowerCase() === a.toLowerCase())?.ka ?? a : a);

  /** The buy controls: one place, used in the page and in the phone bar. */
  const buy = (compact: boolean) => soldOut ? (
    <span className={`inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-500 font-bold ${compact ? 'h-11 px-4 text-[13px]' : 'h-12 px-5 text-[14px]'}`}>
      <Icon name="ban" className="w-5 h-5" strokeWidth={2.2} />{t('shop.outOfStock')}
    </span>
  ) : (
    <div className="flex items-center gap-2.5">
      {bound ? (
        <QuantityStepper size={compact ? 'sm' : 'lg'} value={line!.quantity} onLess={basket.less} onMore={basket.more} max={left} busy={busy} trashAtOne
          label={fill(t('shop.inBasket'), { n: inCart })} />
      ) : (
        <QuantityStepper size={compact ? 'sm' : 'lg'} value={qty} onLess={() => setQty((q) => Math.max(1, q - 1))} onMore={() => setQty((q) => Math.min(room || 1, q + 1))} max={room} />
      )}
      {bound ? (
        <Link href="/cart" aria-label={t('pdp.viewCart')} title={t('pdp.viewCart')}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-100 font-bold hover:bg-teal-100 transition-colors ${compact ? 'h-11 px-4 text-[13px]' : 'h-12 px-5 text-[14px]'}`}>
          <Icon name="bag" className="w-5 h-5" strokeWidth={2.2} />
          <Icon name="check" className="w-4 h-4" strokeWidth={2.6} />
        </Link>
      ) : (
        <button type="button" onClick={addToBasket} disabled={busy || room === 0} aria-label={`${t('shop.quickAdd')} · ${money(Number(price) * qty)}`} title={t('shop.quickAdd')}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-colors disabled:opacity-50 ${
            justAdded ? 'bg-teal-100 text-teal-800' : 'bg-teal-600 text-white hover:bg-teal-700'} ${compact ? 'h-11 px-5 text-[14px]' : 'h-12 px-7 text-[15px]'}`}>
          {busy ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <><Icon name={justAdded ? 'check' : 'bag'} className="w-5 h-5" strokeWidth={2.2} /><span className="tabular-nums">{money(Number(price) * qty)}</span></>}
        </button>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-28 sm:pb-14">
        {/* Where you are */}
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-[12.5px] text-gray-400 mb-5 overflow-hidden">
          <Link href="/shop" className="inline-flex items-center gap-1 hover:text-teal-700 shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            {c.header.heading}
          </Link>
          {product.category && (<>
            <span aria-hidden="true">/</span>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-teal-700 shrink-0">{catName}</Link>
          </>)}
          <span aria-hidden="true">/</span>
          <span className="text-gray-600 truncate">{name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 lg:gap-14 items-start [&>*]:min-w-0">
          {/* ── Gallery ── */}
          <div className="md:sticky md:top-24">
            <div className={`relative aspect-square rounded-[2rem] overflow-hidden ${soldOut ? 'bg-gray-100' : `bg-gradient-to-br ${look.tint}`}`}>
              {images[shown] ? (
                <img key={images[shown].id} src={images[shown].url} alt={images[shown].altText || name}
                  className={`w-full h-full object-cover animate-[fadeIn_0.25s_ease-out] ${soldOut ? 'grayscale opacity-60' : ''}`} />
              ) : (
                <span className={`absolute inset-0 flex items-center justify-center text-[120px] ${soldOut ? 'grayscale opacity-40' : 'animate-[wag_3s_ease-in-out_infinite]'}`} aria-hidden="true">{look.icon}</span>
              )}
              <span className="absolute top-4 left-4 flex flex-col items-start gap-1.5">
                {sale && <span className="text-[12px] font-extrabold px-2.5 py-1 rounded-full bg-peach-400 text-white">−{off}%</span>}
                {low && <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">{fill(t('shop.onlyLeft'), { n: left })}</span>}
              </span>
              <InBasketTag count={inCart} onRemove={basket.remove} busy={busy} className="absolute top-4 right-4 h-8 text-[13px]" />
              {soldOut && (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 py-2.5 bg-gray-700/75 text-white text-[13px] font-bold">
                  <Icon name="ban" className="w-4 h-4" strokeWidth={2.4} />{t('shop.outOfStock')}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
                {images.map((img, i) => (
                  <button key={img.id} type="button" onClick={() => setShown(i)} aria-label={`${name} ${i + 1}`} aria-pressed={i === shown}
                    className={`shrink-0 w-16 h-16 rounded-2xl overflow-hidden ring-2 transition ${i === shown ? 'ring-teal-300' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Details and buying ── */}
          <div>
            {product.category && (
              <Link href={`/shop?category=${product.category.slug}`}
                className="inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 mb-3 rounded-full bg-teal-50 text-teal-800 text-[12px] font-semibold hover:bg-teal-100">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[13px]" aria-hidden="true">{look.icon}</span>{catName}
              </Link>
            )}
            <Heading title={name} subtitle={short || undefined} className="!mb-4" />

            <div className="flex items-end gap-3 flex-wrap">
              <span className={`text-[32px] leading-none font-black tracking-tight ${soldOut ? 'text-gray-400' : sale ? 'text-peach-600' : 'text-gray-900'}`}>{money(price)}</span>
              {sale && <span className="text-[16px] text-gray-400 line-through mb-0.5">{money(product.price)}</span>}
            </div>
            <p className={`mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${soldOut ? 'text-gray-400' : low ? 'text-amber-700' : 'text-teal-700'}`}>
              <span className={`w-2 h-2 rounded-full ${soldOut ? 'bg-gray-300' : low ? 'bg-amber-400' : 'bg-teal-400'}`} aria-hidden="true" />
              {soldOut ? t('shop.outOfStock') : low ? fill(t('shop.onlyLeft'), { n: left }) : t('shop.inStock')}
            </p>

            {/* Choices the product needs */}
            {!soldOut && sizes.length > 0 && (
              <fieldset className="mt-6" aria-invalid={!!errs.size} tabIndex={errs.size ? -1 : undefined}>
                <legend className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mb-2">{t('pdp.p.size')} <span className="text-red-400">*</span></legend>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button key={s} type="button" onClick={() => { setSize(s); setErrs((x) => ({ ...x, size: undefined })); }} aria-pressed={size === s}
                      className={`min-w-[52px] h-10 px-4 rounded-full text-[13px] font-bold transition-colors ${size === s ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200' : 'bg-white text-gray-700 ring-1 ring-gray-200/80 hover:bg-teal-50/40 hover:ring-teal-200'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <FieldError message={errs.size} />
              </fieldset>
            )}
            {!soldOut && engr && (
              <div className="mt-5">
                <Field id="engraving" label={t('pdp.p.name')} value={engraving} required maxLength={engr.maxLength} error={errs.engraving}
                  hint={fill(t('pdp.p.hint'), { n: engr.maxLength - [...engraving].length })}
                  onChange={(v) => { setEngraving(v); setErrs((x) => ({ ...x, engraving: undefined })); }} />
              </div>
            )}

            {/* Buy */}
            <div className="mt-6 hidden sm:block">{buy(false)}</div>
            {basket.error && <FieldError message={basket.error} />}

            {c.on('perks') && <PerksStrip items={c.perks.items} className="mt-7" />}

            {/* Details */}
            {(allergens.length > 0 || product.tags?.length > 0) && (
              <dl className="mt-7 space-y-3">
                {allergens.length > 0 && (
                  <div>
                    <dt className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{t('pdp.allergens')}</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {allergens.map((a) => <span key={a} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-peach-50 text-peach-600 text-[12px] font-semibold"><Icon name="info" className="w-3.5 h-3.5" />{allergenName(a)}</span>)}
                    </dd>
                  </div>
                )}
                {product.tags?.length > 0 && (
                  <div>
                    <dt className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{t('pdp.tags')}</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {product.tags.map((x: any) => <span key={x.tag.id} className="h-7 px-2.5 inline-flex items-center rounded-full bg-gray-100 text-gray-600 text-[12px] font-medium">{t(`collection.${x.tag.name}`, x.tag.name)}</span>)}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <p className="mt-5 text-[11.5px] text-gray-400">{t('pdp.sku')}: {product.sku}</p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <section className="mt-12 sm:mt-14 max-w-3xl">
            <Heading kind="section" title={t('pdp.description')} />
            <p className="text-[14px] sm:text-[15px] leading-relaxed text-gray-600 whitespace-pre-line">{description}</p>
          </section>
        )}

        {/* Similar */}
        {related.length > 0 && (
          <section className="mt-12 sm:mt-14">
            <Heading kind="section" title={t('pdp.similar')} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </section>
        )}
        <div ref={end} aria-hidden="true" />
      </div>

      {/* Phones: the price and buy controls stay in reach */}
      <div className={`sm:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 ${atEnd ? 'translate-y-full' : ''}`}>
        {buy(true)}
      </div>
    </main>
  );
}
