'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CartIcon() {
  const { cart } = useCart();
  const count = cart?.itemCount ?? 0;
  return (
    <Link href="/cart" className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition">
      <span className="text-lg">🛒</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
