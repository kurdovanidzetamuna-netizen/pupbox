import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import AddToCartButton from '@/components/AddToCartButton';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const product = await api.products.get(params.slug);
    return { title: product.seoTitle || product.name, description: product.seoDesc || product.shortDescription };
  } catch {
    return { title: 'Product not found' };
  }
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  let product: any;
  try {
    product = await api.products.get(params.slug);
  } catch {
    notFound();
  }

  const primaryImage = product.images?.find((i: any) => i.isPrimary) || product.images?.[0];
  const otherImages = product.images?.filter((i: any) => !i.isPrimary).slice(0, 4) || [];
  const inStock = product.inventory?.quantity > 0;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-8 flex gap-2">
          <Link href="/shop" className="hover:text-teal-600">Shop</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/shop?category=${product.category.slug}`} className="hover:text-teal-600">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-700">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="bg-gray-50 rounded-2xl aspect-square flex items-center justify-center mb-4 overflow-hidden">
              {primaryImage ? (
                <img src={primaryImage.url} alt={primaryImage.altText || product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl">🐾</span>
              )}
            </div>
            {otherImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {otherImages.map((img: any) => (
                  <div key={img.id} className="bg-gray-50 rounded-lg aspect-square overflow-hidden">
                    <img src={img.url} alt={img.altText || ''} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {product.brand && (
                <Link href={`/shop?brand=${encodeURIComponent(product.brand)}`} className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-teal-600 transition">
                  {product.brand}
                </Link>
              )}
              {product.brand && product.category && <span className="text-gray-200">·</span>}
              {product.category && (
                <Link href={`/shop?category=${product.category.slug}`} className="text-sm text-teal-600 font-medium hover:underline">
                  {product.category.name}
                </Link>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-1 mb-3">{product.name}</h1>
            <p className="text-gray-500 mb-4">{product.shortDescription}</p>

            {/* Price */}
            <div className="flex items-center gap-3 mb-2">
              {product.salePrice ? (
                <>
                  <span className="text-3xl font-bold text-teal-600">₾{Number(product.salePrice).toFixed(2)}</span>
                  <span className="text-xl text-gray-400 line-through">₾{Number(product.price).toFixed(2)}</span>
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">
                    -{Math.round((1 - product.salePrice / product.price) * 100)}%
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-gray-900">₾{Number(product.price).toFixed(2)}</span>
              )}
            </div>

            {/* Stock */}
            <div className="mb-6">
              {inStock ? (
                <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                  In stock ({product.inventory.quantity} available)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-500 text-sm font-medium">
                  <span className="w-2 h-2 bg-red-400 rounded-full inline-block"></span>
                  Out of stock
                </span>
              )}
            </div>

            {/* Add to Cart */}
            <AddToCartButton productId={product.id} inStock={inStock} />

            {/* SKU, Brand & Tags */}
            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-400">
              {product.brand && <p>Brand: <span className="text-gray-700 font-medium">{product.brand}</span></p>}
              <p>SKU: <span className="text-gray-600">{product.sku}</span></p>
              {product.tags?.length > 0 && (
                <p>Tags: {product.tags.map((t: any) => (
                  <span key={t.tag.id} className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs mr-1">{t.tag.name}</span>
                ))}</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-12 border-t border-gray-100 pt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Product Description</h2>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        )}
      </div>
    </main>
  );
}
