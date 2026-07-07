'use client';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function AddToCartButton({ productId, inStock }: { productId: string; inStock: boolean }) {
  const { addProduct } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function handle() {
    if (!inStock) return;
    setLoading(true);
    try {
      await addProduct(productId, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex gap-3 mb-8">
      <div className="flex items-center border border-gray-200 rounded-lg">
        <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-3 text-gray-600 hover:text-teal-600 font-bold">−</button>
        <span className="px-4 py-3 font-medium">{qty}</span>
        <button onClick={() => setQty(q => q + 1)} className="px-4 py-3 text-gray-600 hover:text-teal-600 font-bold">+</button>
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
  );
}
