'use client';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';

type Personalisation = { engraving?: { maxLength: number }; sizes?: string[] } | null;

export default function AddToCartButton({ productId, inStock, maxQty, personalisation }: { productId: string; inStock: boolean; maxQty?: number; personalisation?: Personalisation }) {
  const { addProduct } = useCart();
  const { t } = useLanguage();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const max = maxQty && maxQty > 0 ? maxQty : Infinity;
  const [engraving, setEngraving] = useState('');
  const [size, setSize] = useState('');
  const engr = personalisation?.engraving;
  const sizes = personalisation?.sizes ?? [];

  async function handle() {
    if (!inStock) return;
    // Say what's missing here rather than after a round trip.
    if (engr && !engraving.trim()) { setError(t('pdp.p.needName')); return; }
    if (sizes.length && !size) { setError(t('pdp.p.needSize')); return; }
    setLoading(true);
    setError('');
    try {
      await addProduct(productId, qty, personalisation ? { ...(engr ? { engraving: engraving.trim() } : {}), ...(sizes.length ? { size } : {}) } : undefined);
      // Ready for the next bowl with a different name.
      setEngraving('');
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e: any) {
      // e.g. "Insufficient stock" — failing silently left people tapping a button that did nothing.
      setError(e?.message || t('pdp.addError'));
    } finally { setLoading(false); }
  }

  return (
    <div className="mb-8">
    {sizes.length > 0 && (
      <fieldset className="mb-4">
        <legend className="text-sm font-semibold text-gray-900 mb-2">{t('pdp.p.size')}</legend>
        <div className="flex gap-2">
          {sizes.map(s => (
            <button key={s} type="button" onClick={() => { setSize(s); setError(''); }} aria-pressed={size === s}
              className={`min-w-[48px] px-4 py-2 rounded-lg border text-sm font-bold transition ${size === s ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:border-teal-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </fieldset>
    )}
    {engr && (
      <div className="mb-4">
        <label htmlFor="engraving" className="block text-sm font-semibold text-gray-900 mb-2">{t('pdp.p.name')}</label>
        <input id="engraving" value={engraving} maxLength={engr.maxLength} onChange={e => { setEngraving(e.target.value); setError(''); }}
          placeholder={t('pdp.p.placeholder')} autoComplete="off"
          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-teal-500" />
        <p className="text-xs text-gray-400 mt-1">{fill(t('pdp.p.hint'), { n: engr.maxLength - [...engraving].length })}</p>
      </div>
    )}
    <div className="flex gap-3">
      <div className="flex items-center border border-gray-200 rounded-lg">
        <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label={t('cart.decrease')} className="px-4 py-3 text-gray-600 hover:text-teal-600 font-bold">−</button>
        <span className="px-4 py-3 font-medium">{qty}</span>
        <button onClick={() => setQty(q => Math.min(max, q + 1))} disabled={qty >= max} aria-label={t('cart.increase')} className="px-4 py-3 text-gray-600 hover:text-teal-600 font-bold disabled:opacity-30">+</button>
      </div>
      <button
        onClick={handle}
        disabled={!inStock || loading}
        className={`flex-1 font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${added ? 'bg-green-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
      >
        {loading ? t('pdp.adding') : added ? t('pdp.added') : inStock ? t('pdp.add') : t('shop.outOfStock')}
      </button>
      {added && (
        <button onClick={() => router.push('/cart')} className="border border-teal-600 text-teal-600 px-4 py-3 rounded-lg text-sm font-medium hover:bg-teal-50">
          {t('pdp.viewCart')}
        </button>
      )}
    </div>
    {error && <p role="alert" className="text-red-500 text-sm mt-2">{error}</p>}
    {qty >= max && max !== Infinity && <p className="text-xs text-gray-400 mt-2">{fill(t('pdp.onlyLeft'), { n: max })}</p>}
    </div>
  );
}
