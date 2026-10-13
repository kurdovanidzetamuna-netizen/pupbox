'use client';
import EmptyState from '@/components/ui/EmptyState';
import Link from '@/components/LangLink';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { shopPage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/icons';
import ProductCard from '@/components/shop/ProductCard';
import Menu from '@/components/ui/Menu';
import PerksStrip from '@/components/shop/PerksStrip';

const DOG_SIZES = ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];

const SORTS = [
  { v: '', k: 'shop.sort.default' },
  { v: 'price_asc', k: 'shop.sort.priceAsc' },
  { v: 'price_desc', k: 'shop.sort.priceDesc' },
  { v: 'name_asc', k: 'shop.sort.nameAsc' },
  { v: 'name_desc', k: 'shop.sort.nameDesc' },
];

import { categoryLook } from '@/lib/shopIcons';

type Props = {
  products: any[];
  total: number;
  pages: number;
  page: number;
  categories: any[];
  brands: string[];
  content: StoredContent | null;
  sellers: any[];
};

/**
 * The shop, laid out like a modern store: a banner with the search, category
 * chips, a toolbar (results, active filters, collections, sort), a product
 * grid with quick add, and paging. Filters live in the address, so every
 * view can be shared and Back works.
 */
export default function ShopView({ products, total, pages, page, categories, brands, content, sellers }: Props) {
  const { t, lang } = useLanguage();
  const c = usePage(shopPage, content);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const category = params.get('category') || '';
  const brand = params.get('brand') || '';
  const sort = params.get('sort') || '';
  const search = params.get('search') || '';
  const size = params.get('size') || '';
  const seller = params.get('seller') || '';
  const sellerName = (x: any) => x ? x.name : '';
  const [query, setQuery] = useState(search);
  const [searching, startSearch] = useTransition();
  // What the box last sent: the address catching up to it mustn't overwrite
  // letters typed since. Only an outside change (a chip ✕, Back) refills it.
  const sent = useRef(search);
  useEffect(() => { if (search !== sent.current) { sent.current = search; setQuery(search); } }, [search]);

  /** The address with some filters changed (page always resets). */
  const hrefWith = (change: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(change)) { if (v) p.set(k, v); else p.delete(k); }
    if (!('page' in change)) p.delete('page');
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  const go = (change: Record<string, string | null>) => router.push(hrefWith(change), { scroll: false });

  /** Search as you type: a moment after the last key, without filling Back history. */
  const find = (text: string) => {
    const q = text.trim();
    if (q === sent.current) return;
    sent.current = q;
    startSearch(() => router.replace(hrefWith({ search: q || null }), { scroll: false }));
  };
  useEffect(() => {
    const id = setTimeout(() => find(query), 300);
    return () => clearTimeout(id);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const catName = (cat: any) => (lang === 'ka' && cat.translations?.ka?.name) || cat.name;
  const activeCat = categories.find((x) => x.slug === category);
  const active = [
    activeCat && { key: 'category', label: catName(activeCat) },
    brand && { key: 'brand', label: t(`collection.${brand}`, brand) },
    search && { key: 'search', label: `„${search}“` },
    size && { key: 'size', label: `🐕 ${t(`dog.size.${size}`)}` },
    seller && { key: 'seller', label: sellerName(sellers.find((x) => x.slug === seller)) || seller },
  ].filter(Boolean) as { key: string; label: string }[];

  const chip = (on: boolean) =>
    `shrink-0 inline-flex items-center gap-2 h-10 pl-2 pr-4 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
      on ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200' : 'bg-white text-gray-700 ring-1 ring-gray-200/80 hover:bg-teal-50/40 hover:ring-teal-200 hover:text-teal-700'}`;
  const chipIcon = (on: boolean) => `w-7 h-7 rounded-full flex items-center justify-center text-[15px] overflow-hidden ${on ? 'bg-white' : 'bg-gray-50'}`;

  return (
    <main className="min-h-screen bg-white">
      {/* ── Banner: title, the search, small promises ── */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-7">
          <Heading title={c.header.heading} subtitle={c.header.description || undefined} className="!mb-5" />
          <form role="search" onSubmit={(e) => { e.preventDefault(); find(query); }} className="w-full max-w-3xl">
            <div className="flex items-center h-11 sm:h-12 rounded-full bg-white ring-1 ring-gray-200/80 focus-within:ring-2 focus-within:ring-teal-300 pl-2 pr-1.5 transition">
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('shop.search')} aria-label={t('shop.search')}
                className="flex-1 min-w-0 h-full bg-transparent px-3 text-[13.5px] sm:text-[14px] text-gray-900 placeholder:text-gray-400 outline-none [&::-webkit-search-cancel-button]:hidden" />
              {query && (
                <button type="button" onClick={() => { setQuery(''); find(''); }} aria-label={t('shop.clear')}
                  className="w-9 h-9 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center"><Icon name="close" className="w-4 h-4" /></button>
              )}
              <button type="submit" aria-label={t('shop.find')} title={t('shop.find')}
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition-colors">
                {searching ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Icon name="search" className="w-4 h-4" strokeWidth={2.4} />}
              </button>
            </div>
          </form>
          {c.on('perks') && <PerksStrip items={c.perks.items} className="mt-4" />}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
        {/* ── Categories ── */}
        <nav aria-label={t('shop.categories')} className="flex gap-2 overflow-x-auto py-5 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={hrefWith({ category: null })} scroll={false} className={chip(!category)} aria-current={!category ? 'page' : undefined}>
            <span className={chipIcon(!category)} aria-hidden="true">✨</span>{t('shop.allProducts')}
          </Link>
          {categories.map((cat) => {
            const on = cat.slug === category;
            return (
              <Link key={cat.id} href={hrefWith({ category: on ? null : cat.slug })} scroll={false} className={chip(on)} aria-current={on ? 'page' : undefined}>
                <span className={chipIcon(on)} aria-hidden="true">{cat.imageUrl ? <img src={cat.imageUrl} alt="" className="w-full h-full object-cover" /> : categoryLook(cat).icon}</span>
                {catName(cat)}
              </Link>
            );
          })}
        </nav>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2 pb-4 mb-6 border-b border-gray-100">
          <p className="text-[13px] text-gray-500 mr-1" aria-live="polite">{fill(t('shop.results'), { n: total })}</p>
          {active.map((f) => (
            <button key={f.key} type="button" onClick={() => go({ [f.key]: null })}
              className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-teal-50 text-teal-800 text-[12px] font-semibold hover:bg-teal-100">
              {f.label}<Icon name="close" className="w-3.5 h-3.5" strokeWidth={2.4} />
            </button>
          ))}
          {active.length > 1 && (
            <Link href={pathname} scroll={false} aria-label={t('shop.clearFilters')} title={t('shop.clearFilters')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100">
              <Icon name="reset" className="w-4 h-4" strokeWidth={2.2} />
            </Link>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {sellers.length > 0 && (
              <Menu icon="store" size="md" tone="mint" title={t('shop.sellers')} onReset={() => go({ seller: null })} resetDisabled={!seller} resetLabel={t('shop.reset')}
                label={seller ? `${t('shop.sellers')}: ${sellerName(sellers.find((x) => x.slug === seller))}` : t('shop.sellers')} active={!!seller}
                items={[
                  { label: t('shop.allSellers'), checked: !seller, onClick: () => go({ seller: null }) },
                  ...sellers.map((x) => ({ label: x.name, checked: seller === x.slug, onClick: () => go({ seller: x.slug }) })),
                ]} />
            )}
            <Menu icon="paw" size="md" tone="mint" title={t('shop.dogSize')} onReset={() => go({ size: null })} resetDisabled={!size} resetLabel={t('shop.reset')}
              label={size ? `${t('shop.dogSize')}: ${t(`dog.size.${size}`)}` : t('shop.dogSize')} active={!!size}
              items={[
                { label: t('shop.allSizes'), checked: !size, onClick: () => go({ size: null }) },
                ...DOG_SIZES.map((s) => ({ label: `${t(`dog.size.${s}`)} · ${t(`dog.sizeHint.${s}`)}`, checked: size === s, onClick: () => go({ size: s }) })),
              ]} />
            {brands.length > 0 && (
              <Menu icon="filter" size="md" tone="mint" title={t('shop.brands')} onReset={() => go({ brand: null })} resetDisabled={!brand} resetLabel={t('shop.reset')} label={brand ? `${t('shop.brands')}: ${t(`collection.${brand}`, brand)}` : t('shop.brands')} active={!!brand}
                items={[
                  { label: t('shop.allBrands'), checked: !brand, onClick: () => go({ brand: null }) },
                  ...brands.map((b) => ({ label: t(`collection.${b}`, b), checked: brand === b, onClick: () => go({ brand: b }) })),
                ]} />
            )}
            <Menu icon="sort" size="md" tone="mint" title={t('shop.sort')} onReset={() => go({ sort: null })} resetDisabled={!sort} resetLabel={t('shop.reset')} label={`${t('shop.sort')}: ${t(SORTS.find((x) => x.v === sort)?.k ?? 'shop.sort.default')}`} active={!!sort}
              items={[
                ...SORTS.map((x) => ({ label: t(x.k), checked: sort === x.v, onClick: () => go({ sort: x.v || null }) })),
              ]} />
          </div>
        </div>

        {/* ── Products ── */}
        {products.length === 0 ? (
          <div className="text-center">
            <EmptyState art="ball" tint="bg-pastel-sky" title={t('shop.none')} text={t('shop.noneSub')} className="!pb-2" />
            {/* Searched inside a filter: offer the same words across the whole shop. */}
            {search && active.length > 1 && (
              <Link href={`${pathname}?search=${encodeURIComponent(search)}`}
                className="mx-auto mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-teal-50 text-teal-800 text-[13px] font-semibold hover:bg-teal-100">
                <Icon name="search" className="w-4 h-4" strokeWidth={2.2} />{fill(t('shop.searchAll'), { q: search })}
              </Link>
            )}
            {active.length > 0 && (
              <Link href={pathname} aria-label={t('shop.clearFilters')} title={t('shop.clearFilters')}
                className="mx-auto mt-5 w-11 h-11 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center hover:bg-teal-100">
                <Icon name="reset" className="w-5 h-5" strokeWidth={2.2} />
              </Link>
            )}
          </div>
        ) : (
          <div key={`${category}|${brand}|${sort}|${search}|${size}|${seller}|${page}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}

        {/* ── Pages ── */}
        {pages > 1 && (
          <nav aria-label={t('shop.pages')} className="flex items-center justify-center gap-1.5 mt-12">
            <Link href={hrefWith({ page: page > 2 ? String(page - 1) : null })} aria-disabled={page <= 1} aria-label={t('shop.prev')}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${page <= 1 ? 'pointer-events-none text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </Link>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={hrefWith({ page: n > 1 ? String(n) : null })} aria-current={n === page ? 'page' : undefined}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold ${n === page ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{n}</Link>
            ))}
            <Link href={hrefWith({ page: String(Math.min(pages, page + 1)) })} aria-disabled={page >= pages} aria-label={t('shop.next')}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${page >= pages ? 'pointer-events-none text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          </nav>
        )}
      </div>
    </main>
  );
}
