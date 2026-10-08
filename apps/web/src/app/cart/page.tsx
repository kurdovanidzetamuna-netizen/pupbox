'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { gel } from '@/lib/format';
import { itemName } from '@/lib/localize';
import ChoiceNote from '@/components/ChoiceNote';

export default function CartPage() {
  const { t, lang } = useLanguage();
  const { cart, ready, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
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

  if (!ready) {
    return <main className="min-h-screen bg-gray-50" aria-busy="true" />;
  }

  if (!cart || !(cart.itemCount > 0)) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="text-6xl mb-6">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('co.empty.title')}</h1>
          <p className="text-gray-500 mb-8">{t('co.empty.sub')}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/prices" className="inline-flex items-center justify-center bg-teal-600 text-white px-6 py-3 rounded-full font-medium hover:bg-teal-700 transition">{t('co.empty.plans')}</Link>
            <Link href="/shop" className="border border-teal-600 text-teal-600 px-6 py-3 rounded-full font-medium hover:bg-teal-50 transition">{t('cart.browse')}</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('cart.title')} <span className="text-gray-400 font-medium">({cart.itemCount})</span></h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Items */}
          <ul className="md:col-span-2 space-y-4">
            {cart.items.map((item: any) => (
              <li key={item.id} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {item.product?.images?.[0] ? (
                    <img src={item.product.images[0].url} alt={item.product.images[0].altText || item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl" aria-hidden="true">{item.subscriptionPlan ? '📦' : '🐾'}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{itemName(item, lang)}</p>
                      <ChoiceNote choice={item.personalisation} className="text-sm text-gray-500 mt-0.5" />
                      {item.subscriptionPlan && <p className="text-xs text-teal-600 font-medium mt-0.5">{t('cart.subscription')}</p>}
                    </div>
                    <button onClick={() => removeItem(item.id)} aria-label={`${t('cart.remove')}: ${itemName(item, lang)}`}
                      className="text-gray-300 hover:text-red-500 transition text-xl leading-none px-1">×</button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    {item.subscriptionPlan ? (
                      <span className="text-sm text-gray-500">{fill(t('cart.qty'), { n: 1 })}</span>
                    ) : (
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button onClick={() => updateItem(item.id, item.quantity - 1)} aria-label={t('cart.decrease')} className="px-3 py-1 text-gray-500 hover:text-teal-600 font-bold text-sm">−</button>
                        <span className="px-3 py-1 text-sm font-medium" aria-live="polite">{item.quantity}</span>
                        <button onClick={() => updateItem(item.id, item.quantity + 1)} aria-label={t('cart.increase')} className="px-3 py-1 text-gray-500 hover:text-teal-600 font-bold text-sm">+</button>
                      </div>
                    )}
                    <span className="font-bold text-gray-900">{gel((Number(item.price) * item.quantity).toFixed(2))}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">{t('cart.promo')}</h2>
              {cart.coupon ? (
                <div className="flex items-center justify-between bg-teal-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-medium text-teal-800 text-sm">{cart.coupon.code}</p>
                    <p className="text-xs text-teal-700">
                      {cart.coupon.discountType === 'PERCENTAGE'
                        ? fill(t('cart.percentOff'), { v: Number(cart.coupon.discountValue) })
                        : fill(t('cart.amountOff'), { v: gel(cart.coupon.discountValue) })}
                    </p>
                  </div>
                  <button onClick={removeCoupon} className="text-red-500 hover:text-red-700 text-sm">{t('cart.removeCoupon')}</button>
                </div>
              ) : (
                <form className="flex gap-2" onSubmit={e => { e.preventDefault(); handleApplyCoupon(); }}>
                  <input type="text" placeholder={t('cart.promoPh')} value={couponInput} onChange={e => setCouponInput(e.target.value)} aria-label={t('cart.promo')}
                    className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <button type="submit" disabled={couponLoading} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
                    {t('cart.apply')}
                  </button>
                </form>
              )}
              {couponError && <p className="text-red-500 text-xs mt-2" role="alert">{couponError}</p>}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">{t('co.sum.title')}</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><dt>{t('co.sum.subtotal')}</dt><dd>{gel(cart.subtotal)}</dd></div>
                {cart.discountAmount > 0 && <div className="flex justify-between text-teal-700"><dt>{t('co.sum.discount')}</dt><dd>−{gel(cart.discountAmount)}</dd></div>}
                <div className="flex justify-between text-gray-500">
                  <dt>{t('co.sum.delivery')}</dt>
                  <dd>{cart.deliveryIncluded ? t('co.delivery.included') : t('co.sum.deliveryLater')}</dd>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900 text-base"><dt>{t('co.sum.total')}</dt><dd>{gel(cart.total)}</dd></div>
              </dl>
              <Link href="/checkout" className="mt-5 flex w-full items-center justify-center bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition">
                {t('cart.checkout')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
