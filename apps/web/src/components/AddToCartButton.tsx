'use client';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function AddToCartButton({ productId, inStock, maxQty }: { productId: string; inStock: boolean; maxQty?: number }) {
  const { addProduct } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const max = maxQty && maxQty > 0 ? maxQty : Infinity;

  async function handle() {
    if (!inStock) return;
    setLoading(true);
    setError('');
    try {
      await addProduct(productId, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e: any) {
      // e.g. "Insufficient stock" — failing silently left people tapping a button that did nothing.
      setError(e?.message || 'Could not add to cart. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="mb-8">
    <div className="flex gap-3">
      <div className="flex items-center border border-gray-200 rounded-lg">
        <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity" className="px-4 py-3 text-gray-600 hover:text-teal-600 font-bold">−</button>
        <span className="px-4 py-3 font-medium">{qty}</span>
        <button onClick={() => setQty(q => Math.min(max, q + 1))} disabled={qty >= max} aria-label="Increase quantity" className="px-4 py-3 text-gray-600 hover:text-teal-600 font-bold disabled:opacity-30">+</button>
      </div>
      <button
        onClick={handle}
        disabled={!inStock || loading}
        className={`flex-1 font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${added ? 'bg-green-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
      >
        {loading ? 'Adding...' : added ? '✓ Added to Cart' : inStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
      {added && (
        <button onClick={() => router.push('/cart')} className="border border-teal-600 text-teal-600 px-4 py-3 rounded-lg text-sm font-medium hover:bg-teal-50">
          View Cart
        </button>
      )}
    </div>
    {error && <p role="alert" className="text-red-500 text-sm mt-2">{error}</p>}
    {qty >= max && max !== Infinity && <p className="text-xs text-gray-400 mt-2">Only {max} available</p>}
    </div>
  );
}
