import Link from 'next/link';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import ShopControls from './ShopControls';
import T, { L } from '@/components/T';
import ContentText from '@/components/ContentText';
import { shopPage } from '@pupbox/content';
import { getStoredContent, pageMetadata } from '@/lib/content';

export const generateMetadata = () => pageMetadata(shopPage);

function PriceDisplay({ price, salePrice }: { price: number; salePrice?: number | null }) {
  if (salePrice) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-teal-600">₾{Number(salePrice).toFixed(2)}</span>
        <span className="text-xs text-gray-400 line-through">₾{Number(price).toFixed(2)}</span>
      </div>
    );
  }
  return <span className="text-base font-bold text-gray-900">₾{Number(price).toFixed(2)}</span>;
}

function StockBadge({ inventory }: { inventory: any }) {
  if (!inventory || inventory.quantity === 0)
    return <span className="text-xs text-red-500 font-medium"><T k="shop.outOfStock" /></span>;
  if (inventory.quantity <= inventory.lowStockAlert)
    return <span className="text-xs text-amber-500 font-medium"><T k="shop.lowStock" /></span>;
  return <span className="text-xs text-teal-600 font-medium"><T k="shop.inStock" /></span>;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { category?: string; search?: string; page?: string; sort?: string; brand?: string };
}) {
  // Category, search, brand, sort and page all go to the API, so ordering
  // and filtering apply to the whole catalogue rather than one page of it.
  const params: Record<string, string> = {};
  for (const k of ['category', 'search', 'page', 'sort', 'brand'] as const) {
    if (searchParams[k]) params[k] = searchParams[k]!;
  }

  // Caught per-promise: one failing request shouldn't blank the whole page.
  const [{ items: products, total, pages }, categories, allBrands] = await Promise.all([
    api.products.list(params).catch(() => ({ items: [] as any[], total: 0, pages: 0 })),
    api.categories.list().catch(() => [] as any[]),
    api.products.brands().catch(() => [] as string[]),
  ]);

  const currentPage = Number(searchParams.page || 1);
  const content = await getStoredContent(shopPage);
  const baseParams = Object.fromEntries(Object.entries(searchParams).filter(([k]) => !['brand', 'page'].includes(k)));

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1"><ContentText page={shopPage} content={content} at="header.heading" /></h1>
          <div className="text-sm text-gray-500 max-w-2xl mb-1"><ContentText page={shopPage} content={content} at="header.description" as="p" /></div>
          <p className="text-sm text-gray-400"><T k="shop.count" vars={{ n: total }} /></p>
        </div>

        <div className="flex gap-8">

          {/* ── SIDEBAR ── */}
          <aside className="w-52 shrink-0 space-y-7">

            {/* Categories */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2"><T k="shop.categories" /></p>
              <ul className="space-y-0.5">
                <li>
                  <Link href="/shop" className={`block px-3 py-2 rounded-xl text-sm font-medium transition ${!searchParams.category ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <T k="shop.allProducts" />
                  </Link>
                </li>
                {(categories as any[]).map((cat: any) => (
                  <li key={cat.id}>
                    <Link
                      href={`/shop?category=${cat.slug}`}
                      className={`block px-3 py-2 rounded-xl text-sm font-medium transition ${searchParams.category === cat.slug ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <L en={cat.name} ka={cat.translations?.ka?.name} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Brands */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2"><T k="shop.brands" /></p>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={`/shop?${new URLSearchParams(baseParams).toString()}`}
                    className={`block px-3 py-2 rounded-xl text-sm font-medium transition ${!searchParams.brand ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <T k="shop.allBrands" />
                  </Link>
                </li>
                {allBrands.map(b => {
                  const active = searchParams.brand === b;
                  const href = active
                    ? `/shop?${new URLSearchParams(baseParams).toString()}`
                    : `/shop?${new URLSearchParams({ ...baseParams, brand: b }).toString()}`;
                  return (
                    <li key={b}>
                      <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${active ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${active ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                          {active && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <T k={`collection.${b}`} fallback={b} />
                      </Link>
                    </li>
                  );
                })}
                {allBrands.length === 0 && <p className="text-xs text-gray-300 px-3"><T k="shop.noBrands" /></p>}
              </ul>
            </div>
          </aside>

          {/* ── MAIN ── */}
          <div className="flex-1 min-w-0">

            {/* Top bar: search + sort */}
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-gray-100">
              <p className="text-sm text-gray-400">
                {searchParams.brand && <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-0.5 rounded-lg mr-2">{searchParams.brand}</span>}
                <T k="shop.results" vars={{ n: total }} />
              </p>
              <Suspense fallback={null}>
                <ShopControls brands={allBrands} />
              </Suspense>
            </div>

            {/* Grid */}
            {products.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg mb-2"><T k="shop.none" /></p>
                <Link href="/shop" className="text-sm text-teal-600 hover:underline"><T k="shop.clearFilters" /></Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product: any) => (
                  <Link key={product.id} href={`/shop/${product.slug}`} className="group">
                    <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square mb-3 flex items-center justify-center group-hover:bg-teal-50 transition">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].altText || product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-5xl">🐾</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">
                        {product.brand || (product.category ? <L en={product.category.name} ka={product.category.translations?.ka?.name} /> : '')}
                      </p>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-teal-600 transition leading-snug">
                        <L en={product.name} ka={product.translations?.ka?.name} />
                      </h3>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2"><L en={product.shortDescription || ''} ka={product.translations?.ka?.shortDescription} /></p>
                      <div className="flex items-center justify-between">
                        <PriceDisplay price={product.price} salePrice={product.salePrice} />
                        <StockBadge inventory={product.inventory} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/shop?${new URLSearchParams({ ...searchParams, page: String(p) }).toString()}`}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition ${p === currentPage ? 'bg-teal-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-teal-400'}`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
