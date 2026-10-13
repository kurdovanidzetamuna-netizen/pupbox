'use client';
import Link from '@/components/LangLink';
import { useEffect, useRef, useState } from 'react';
import { shopPage, ALLERGENS, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { useLanguage } from '@/context/LanguageContext';
import ShareButtons from '@/components/ShareButtons';
import { fill } from '@/context/strings/purchase';
import { Heading } from '@/components/ui/Heading';
import Field from '@/components/ui/Field';
import { FieldError } from '@/components/ui/FormError';
import { Icon } from '@/components/ui/icons';
import { categoryLook } from '@/lib/shopIcons';
import { useChoice, available } from '@/lib/useChoice';
import ProductCard from '@/components/shop/ProductCard';
import SizeChips from '@/components/shop/SizeChips';
import AddButton from '@/components/shop/AddButton';
import PicksList from '@/components/shop/PicksList';
import QuantityStepper from '@/components/shop/QuantityStepper';
import InBasketTag from '@/components/shop/InBasketTag';
import PerksStrip from '@/components/shop/PerksStrip';

const money = (n: unknown) => `₾${Number(n).toFixed(2)}`;
const DOG_SIZES = ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
const STAGES = ['PUPPY', 'ADULT', 'SENIOR'];

/**
 * Which of an ordered scale a product suits, in few words: "every …" when
 * it's all (or none set), "small – large" for a run of three or more,
 * otherwise "a · b".
 */
function span(scale: string[], picked: string[] | undefined, name: (x: string) => string, all: string) {
  const on = scale.filter((x) => picked?.includes(x));
  if (!on.length || on.length === scale.length) return all;
  const run = scale.indexOf(on[on.length - 1]) - scale.indexOf(on[0]) + 1 === on.length;
  return run && on.length >= 3 ? `${name(on[0])} – ${name(on[on.length - 1])}` : on.map(name).join(' · ');
}

/**
 * A product, built from the shop's own pieces: gallery, the shared title,
 * price, stock, size chips / engraving field, the same − n + stepper and
 * 🛍 tag as the cards, the shop's promises, details, and similar products.
 * On phones the buy row stays at the bottom of the screen.
 */
export default function ProductView({ product, related, content }: { product: any; related: any[]; content: StoredContent | null }) {
  const { t, lang } = useLanguage();
  const c = usePage(shopPage, content);
  const ch = useChoice(product);
  const { basket, sizes, engr, size, engraving, qty, setQty, errs, room, picked } = ch;
  const { inCart, busy } = basket;

  const ka = product.translations?.ka ?? {};
  const pick = (en?: string | null, kaText?: string | null) => (lang === 'ka' && kaText?.trim()) || en || '';
  const name = pick(product.name, ka.name);
  const short = pick(product.shortDescription, ka.shortDescription);
  const description = pick(product.description, ka.description);
  const goodFor = pick(product.goodFor, ka.goodFor);
  const catName = product.category ? pick(product.category.name, product.category.translations?.ka?.name) : '';
  const look = categoryLook(product.category);

  const images: any[] = [...(product.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const [shown, setShown] = useState(0);
  const swipeX = useRef<number | null>(null);
  const step = (d: number) => images.length > 1 && setShown((i) => (i + d + images.length) % images.length);
  const left = available(product.inventory);
  const soldOut = left === 0;
  const low = !soldOut && left <= Number(product.inventory?.lowStockAlert || 0);
  const sale = product.salePrice && Number(product.salePrice) < Number(product.price);
  const off = sale ? Math.round((1 - Number(product.salePrice) / Number(product.price)) * 100) : 0;
  const price = sale ? product.salePrice : product.price;

  const addToBasket = ch.add;

  // Coming back with the browser's Back button can restore the page as it
  // was; start fresh instead.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) ch.reset(); };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-500 font-bold h-9 px-4 text-[13px]">
      <Icon name="ban" className="w-5 h-5" strokeWidth={2.2} />{t('shop.outOfStock')}
    </span>
  ) : (
    <div className="flex items-center gap-2.5">
      <QuantityStepper value={qty} onLess={() => setQty((q) => Math.max(1, q - 1))} onMore={() => setQty((q) => Math.min(room || 1, q + 1))} max={room} />
      {(
        <AddButton picked={picked} inBasket={inCart} qty={qty} unit={Number(price)} busy={busy} disabled={room === 0} onClick={addToBasket} className="flex-1 sm:flex-none" />
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

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] gap-6 md:gap-10 lg:gap-14 items-start [&>*]:min-w-0">
          {/* ── Gallery ── */}
          <div>
            <div className={`relative aspect-[4/3] md:aspect-square rounded-3xl overflow-hidden touch-pan-y select-none ${soldOut ? 'bg-gray-100' : `bg-gradient-to-br ${look.tint}`}`}
              onPointerDown={(e) => { swipeX.current = e.clientX; }}
              onPointerUp={(e) => { const dx = e.clientX - (swipeX.current ?? e.clientX); swipeX.current = null; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); }}>
              {images[shown] ? (
                <img key={images[shown].id} src={images[shown].url} alt={images[shown].altText || name} draggable={false}
                  className={`w-full h-full object-cover animate-[fadeIn_0.25s_ease-out] ${soldOut ? 'grayscale opacity-60' : ''}`} />
              ) : (
                <span className={`absolute inset-0 flex items-center justify-center text-[96px] ${soldOut ? 'grayscale opacity-40' : 'animate-[wag_3s_ease-in-out_infinite]'}`} aria-hidden="true">{look.icon}</span>
              )}
              <span className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                {sale && <span className="text-[11.5px] font-extrabold px-2 py-0.5 rounded-full bg-peach-400 text-white">−{off}%</span>}
                {low && <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{fill(t('shop.onlyLeft'), { n: left })}</span>}
              </span>
              <InBasketTag count={inCart} onRemove={basket.remove} busy={busy} className="absolute top-3 right-3" />
              {images.length > 1 && (<>
                <button type="button" onClick={() => step(-1)} aria-label={t('pdp.prevImg')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 text-gray-700 flex items-center justify-center hover:bg-white backdrop-blur">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                </button>
                <button type="button" onClick={() => step(1)} aria-label={t('pdp.nextImg')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 text-gray-700 flex items-center justify-center hover:bg-white backdrop-blur">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
                  {images.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === shown ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />)}
                </span>
              </>)}
              {soldOut && (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 py-2 bg-gray-700/75 text-white text-[12.5px] font-bold">
                  <Icon name="ban" className="w-4 h-4" strokeWidth={2.4} />{t('shop.outOfStock')}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-2.5 flex gap-2 overflow-x-auto [scrollbar-width:none]">
                {images.map((img, i) => (
                  <button key={img.id} type="button" onClick={() => setShown(i)} aria-label={`${name} ${i + 1}`} aria-pressed={i === shown}
                    className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden ring-2 transition ${i === shown ? 'ring-teal-300' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Details and buying ── */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {product.category && (
                <Link href={`/shop?category=${product.category.slug}`}
                  className="inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-full bg-teal-50 text-teal-800 text-[12px] font-semibold hover:bg-teal-100">
                  <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[13px]" aria-hidden="true">{look.icon}</span>{catName}
                </Link>
              )}
              {/* Sold for a seller: who, and a way to see the rest of theirs */}
              {product.seller && (
                <Link href={`/shop?seller=${product.seller.slug}`} title={fill(t('pdp.sellerMore'), { name: product.seller.name })}
                  className="inline-flex items-center gap-1.5 h-8 pl-1.5 pr-3 rounded-full bg-white ring-1 ring-gray-200/80 text-gray-700 text-[12px] font-semibold hover:ring-teal-200 hover:text-teal-800">
                  <span className="w-6 h-6 rounded-full bg-gray-50 overflow-hidden flex items-center justify-center text-teal-600">
                    {product.seller.logoUrl ? <img src={product.seller.logoUrl} alt="" className="w-full h-full object-cover" /> : <Icon name="store" className="w-3.5 h-3.5" strokeWidth={1.8} />}
                  </span>
                  <span className="text-gray-400 font-medium">{t('pdp.seller')}:</span>{product.seller.name}
                </Link>
              )}
            </div>
            <Heading title={name} as="h1" subtitle={short || undefined} className="!mb-4" />

            <div className="flex items-end gap-3 flex-wrap">
              <span className={`text-[28px] leading-none font-black tracking-tight ${soldOut ? 'text-gray-400' : sale ? 'text-peach-600' : 'text-gray-900'}`}>{money(price)}</span>
              {sale && <span className="text-[16px] text-gray-400 line-through mb-0.5">{money(product.price)}</span>}
            </div>
            <p className={`mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${soldOut ? 'text-gray-400' : low ? 'text-amber-700' : 'text-teal-700'}`}>
              <span className={`w-2 h-2 rounded-full ${soldOut ? 'bg-gray-300' : low ? 'bg-amber-400' : 'bg-teal-400'}`} aria-hidden="true" />
              {soldOut ? t('shop.outOfStock') : low ? fill(t('shop.onlyLeft'), { n: left }) : t('shop.inStock')}
            </p>

            {/* A size to choose: chips. */}
            {sizes.length > 0 && !soldOut && (
              <div className="mt-5" aria-invalid={!!errs.size} tabIndex={errs.size ? -1 : undefined}>
                <p className="text-[12px] font-semibold text-gray-500 mb-1.5">{t('pdp.size')}<span className="text-red-400"> *</span></p>
                <SizeChips sizes={sizes} value={size} onPick={ch.setSize} counts={ch.sizeCounts} error={!!errs.size} label={t('pdp.size')} />
                {errs.size && <FieldError message={errs.size} />}
              </div>
            )}

            {/* Who it's for: quiet info tiles (no hover, no outline), so they
                never read as something to tap. */}
            <dl className="mt-5 flex flex-wrap gap-2">
              {[
                ...(sizes.length === 0 ? [{ icon: 'paw' as const, label: t('shop.dogSize'), value: span(DOG_SIZES, product.dogSizes, (x) => t(`dog.size.${x}`), t('pdp.allSizes')) }]
                  : soldOut ? [{ icon: 'paw' as const, label: t('pdp.size'), value: sizes.join(' · ') }] : []),
                { icon: 'calendar' as const, label: t('pdp.age'), value: span(STAGES, product.lifeStages, (x) => t(`pdp.stage.${x}`), t('pdp.stage.ALL')) },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 rounded-2xl bg-gray-50 pl-2.5 pr-4 py-2 min-w-0">
                  <span className="w-8 h-8 shrink-0 rounded-xl bg-white text-teal-600 flex items-center justify-center" aria-hidden="true">
                    <Icon name={f.icon} className="w-4 h-4" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[11px] text-gray-400 leading-tight">{f.label}</dt>
                    <dd className="text-[13px] font-semibold text-gray-800 leading-snug">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {/* Engraved name, quantity and add — one line */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-start gap-3">
              {!soldOut && engr && (
                <div className="sm:flex-1 min-w-0">
                  <Field id="engraving" label={t('pdp.p.name')} value={engraving} required maxLength={engr.maxLength} error={errs.engraving}
                    hint={fill(t('pdp.p.hint'), { n: engr.maxLength - [...engraving].length })}
                    onChange={ch.setEngraving} />
                </div>
              )}
              <div className="hidden sm:flex sm:h-12 sm:items-center shrink-0">{buy(false)}</div>
            </div>
            {basket.error && <FieldError message={basket.error} />}

            <PicksList c={ch} className="mt-4" />

            {c.on('perks') && <PerksStrip items={c.perks.items} className="mt-5" />}

          </div>
        </div>

        {/* About: the description with what to know at a glance */}
        {(description || goodFor || allergens.length > 0 || product.tags?.length > 0) && (
          <section className="mt-12 sm:mt-14 rounded-3xl bg-gray-50 p-5 sm:p-8">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6 lg:gap-10">
              <div className="min-w-0">
                <Heading kind="section" title={t('pdp.description')} className="!mb-3" />
                {goodFor && (
                  <p className="mb-4 inline-flex items-start gap-2 rounded-2xl bg-white/80 ring-1 ring-teal-100 px-3.5 py-2.5 text-[13px] text-gray-700">
                    <Icon name="sparkle" className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" strokeWidth={1.8} />
                    <span><b className="font-semibold text-teal-800">{t('pdp.goodFor')}:</b> {goodFor}</span>
                  </p>
                )}
                {description && <p className="text-[14px] sm:text-[15px] leading-relaxed text-gray-600 whitespace-pre-line max-w-2xl">{description}</p>}
                <ShareButtons title={name} className="mt-5" />
              </div>
              {(allergens.length > 0 || product.tags?.length > 0) && (
                <dl className="space-y-4 lg:border-l lg:border-gray-200/70 lg:pl-8">
                  {allergens.length > 0 && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{t('pdp.allergens')}</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {allergens.map((a) => <span key={a} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-white ring-1 ring-peach-100 text-peach-600 text-[12px] font-semibold"><Icon name="info" className="w-3.5 h-3.5" />{allergenName(a)}</span>)}
                      </dd>
                    </div>
                  )}
                  {product.tags?.length > 0 && (
                    <div>
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{t('pdp.tags')}</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {product.tags.map((x: any) => <span key={x.tag.id} className="h-7 px-2.5 inline-flex items-center rounded-full bg-white ring-1 ring-gray-200/70 text-gray-600 text-[12px] font-medium">{t(`collection.${x.tag.name}`, x.tag.name)}</span>)}
                      </dd>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400">{t('pdp.sku')}: {product.sku}</p>
                </dl>
              )}
            </div>
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
