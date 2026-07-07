'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { cart, loading, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true); setCouponError('');
    try { await applyCoupon(couponInput.trim()); setCouponInput(''); }
    catch (e: any) { setCouponError(e.message); }
    finally { setCouponLoading(false); }
  }

  if (!cart || cart.items?.length === 0) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="text-6xl mb-6">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Your cart is empty</h1>
          <p className="text-gray-500 mb-8">Add some products or a subscription plan to get started.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/shop" className="inline-flex items-center justify-center bg-teal-600 text-white px-6 py-3 rounded-full font-medium hover:bg-teal-700 transition">Browse Products</Link>
            <Link href="/prices" className="border border-teal-600 text-teal-600 px-6 py-3 rounded-full font-medium hover:bg-teal-50 transition">View Plans</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart ({cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''})</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Items */}
          <div className="md:col-span-2 space-y-4">
            {cart.items.map((item: any) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {item.product?.images?.[0] ? (
                    <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{item.subscriptionPlan ? '📦' : '🐾'}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{item.product?.name || item.subscriptionPlan?.name}</p>
                      {item.subscriptionPlan && (
                        <p className="text-xs text-teal-600 font-medium mt-0.5">Subscription Box</p>
                      )}
                      {item.product?.sku && (
                        <p className="text-xs text-gray-400 mt-0.5">SKU: {item.product.sku}</p>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition text-lg leading-none">×</button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    {item.subscriptionPlan ? (
                      <span className="text-sm text-gray-500">Qty: 1</span>
                    ) : (
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button onClick={() => updateItem(item.id, item.quantity - 1)} className="px-3 py-1 text-gray-500 hover:text-teal-600 font-bold text-sm">−</button>
                        <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateItem(item.id, item.quantity + 1)} className="px-3 py-1 text-gray-500 hover:text-teal-600 font-bold text-sm">+</button>
                      </div>
                    )}
                    <span className="font-bold text-gray-900">₾{(Number(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Promo Code</h3>
              {cart.coupon ? (
                <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-medium text-green-700 text-sm">{cart.coupon.code}</p>
                    <p className="text-xs text-green-600">
                      {cart.coupon.discountType === 'PERCENTAGE' ? `${cart.coupon.discountValue}% off` : `₾${cart.coupon.discountValue} off`}
                    </p>
                  </div>
                  <button onClick={removeCoupon} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <button onClick={handleApplyCoupon} disabled={couponLoading} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                    Apply
                  </button>
                </div>
              )}
              {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
            </div>

            {/* Totals */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₾{cart.subtotal.toFixed(2)}</span>
                </div>
                {cart.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>−₾{cart.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Delivery</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>₾{cart.total.toFixed(2)}</span>
                </div>
              </div>
              <Link href="/checkout" className="mt-5 flex w-full items-center justify-center bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition">
                Proceed to Checkout →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
