'use client';
import ProductThumb from '@/components/shop/ProductThumb';
import { useState } from 'react';
import Link from '@/components/LangLink';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { fill } from '@/context/strings/purchase';
import { gel } from '@/lib/format';
import { itemName, boxSummary } from '@/lib/localize';
import ChoiceNote from '@/components/ChoiceNote';
import { FieldError } from '@/components/ui/FormError';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/icons';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import IconButton from '@/components/ui/IconButton';

/**
 * The cart, mobile first: item cards with a pill quantity stepper, a promo
 * code "ticket" that opens into a field, the total with the one main button,
 * and on phones a dock at the bottom with the total and Checkout always in
 * reach (the tab bar steps aside here, so the two never fight).
 */
export default function CartPage() {
  const { t, lang } = useLanguage();
  const { cart, ready, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  // A code on the basket that takes nothing off yet (under its minimum, gift-only…), and why.
  const issue = cart?.coupon && !cart?.referral ? cart.couponIssue ?? null : null;
  const coupon = cart?.coupon ?? null;
  // Which line a quantity change failed on, and why.
  const [qtyError, setQtyError] = useState<{ id: string; message: string } | null>(null);

  async function changeQty(itemId: string, quantity: number) {
    setQtyError(null);
    try { await updateItem(itemId, quantity); }
    catch { setQtyError({ id: itemId, message: t('cart.e.qty') }); }
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true); setCouponError('');
    try { await applyCoupon(couponInput.trim()); setCouponInput(''); setPromoOpen(false); }
    catch (e: any) { setCouponError(e.message); }
    finally { setCouponLoading(false); }
  }

  if (!ready) {
    return <main className="min-h-screen bg-pastel-grey" aria-busy="true" />;
  }

  if (!cart || !(cart.itemCount > 0)) {
    return (
      <main className="min-h-[70vh] bg-white flex items-center justify-center px-4">
        <EmptyState art="bone" tint="bg-pastel-sun" title={t('co.empty.title')} text={t('co.empty.sub')}
          action={{ href: '/prices', label: t('co.empty.plans'), icon: 'box' }} second={{ href: '/shop', label: t('cart.browse'), icon: 'bag' }} />
      </main>
    );
  }

  const checkoutLabel = t('cart.checkout').replace(/\s*→\s*$/, '');

  return (
    <main className="min-h-screen bg-pastel-grey">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-28 md:pb-14">
        <div className="flex items-end justify-between gap-3">
          <Heading title={<>{t('cart.title')} <span className="align-middle inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-teal-600 text-white text-[14px] font-bold">{cart.itemCount}</span></>} className="!mb-5 sm:!mb-7" />
          <Link href="/shop" className="hidden sm:inline-flex mb-7 items-center gap-1.5 text-[13px] font-semibold text-teal-700 hover:text-teal-800">
            <Icon name="arrow" className="w-4 h-4 rotate-180" />{t('cart.continue')}
          </Link>
        </div>
        {cart.pricesUpdated && <p className="mb-5 text-[13px] text-amber-800 bg-amber-50 rounded-[16px] px-4 py-3" role="status">{t('cart.updated')}</p>}

        <div className="grid md:grid-cols-[minmax(0,1fr)_340px] gap-4 md:gap-6 items-start">
          {/* ── Items ── */}
          <ul className="space-y-2.5 sm:space-y-3">
            {cart.items.map((item) => {
              const fixed = item.subscriptionPlan || item.customBox;
              // Free stock left for this line, after other lines of the same product.
              const inv = item.product?.inventory;
              const others = cart.items.filter((i) => i.id !== item.id && i.productId === item.productId).reduce((n, i) => n + i.quantity, 0);
              const max = inv ? Math.max(0, inv.quantity - (inv.reservedQty || 0) - others) : Infinity;
              const atMax = item.quantity >= max;
              return (
                <li key={item.id} className="bg-white rounded-[22px] ring-1 ring-gray-100 p-3 sm:p-4 flex gap-3 sm:gap-4">
                  <ProductThumb item={item} className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-[16px] text-3xl shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[14px] sm:text-[15px] text-gray-900 leading-snug">{itemName(item, lang)}</p>
                        <ChoiceNote choice={item.personalisation} className="text-[12.5px] text-gray-500 mt-0.5" />
                        {(item.subscriptionPlan || item.customBox?.monthly) && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11.5px] font-bold text-teal-700"><Icon name="repeat" className="w-3 h-3" />{t('cart.subscription')}</span>
                        )}
                        {item.customBox && <>
                          <p className="text-[12.5px] text-gray-500 mt-1 leading-snug line-clamp-2">{boxSummary(item, lang)}</p>
                          <Link href={`/build-box?edit=${item.id}`} className="inline-flex items-center gap-1 mt-1 text-[12.5px] font-semibold text-teal-700 hover:underline">
                            <Icon name="edit" className="w-3.5 h-3.5" />{t('cb.edit')}
                          </Link>
                        </>}
                      </div>
                      <span className="-mt-1 -mr-1 shrink-0">
                        <IconButton icon="trash" tone="danger" size="sm" label={`${t('cart.remove')}: ${itemName(item, lang)}`} onClick={() => removeItem(item.id)} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                      {fixed ? (
                        <span className="text-[12.5px] text-gray-400">{fill(t('cart.qty'), { n: 1 })}</span>
                      ) : (
                        <div className="inline-flex items-center h-9 rounded-full bg-gray-100 p-0.5">
                          <button onClick={() => changeQty(item.id, item.quantity - 1)} aria-label={t('cart.decrease')}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-white hover:text-teal-700 transition"><Icon name="minus" className="w-4 h-4" strokeWidth={2.4} /></button>
                          <span className="w-7 text-center text-[13.5px] font-bold text-gray-900" aria-live="polite">{item.quantity}</span>
                          <button onClick={() => changeQty(item.id, item.quantity + 1)} aria-label={t('cart.increase')} disabled={atMax}
                            title={atMax ? fill(t('shop.onlyLeft'), { n: max }) : undefined}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-white hover:text-teal-700 transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-600"><Icon name="plus" className="w-4 h-4" strokeWidth={2.4} /></button>
                        </div>
                      )}
                      <span className="text-[16px] font-extrabold text-gray-900">{gel((Number(item.price) * item.quantity).toFixed(2))}</span>
                    </div>
                    {!fixed && atMax && max > 0 && <p className="mt-1 text-[11.5px] font-medium text-amber-700">{fill(t('shop.onlyLeft'), { n: max })}</p>}
                    <FieldError message={qtyError?.id === item.id ? qtyError?.message : null} />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ── Promo + total ── */}
          <div className="space-y-3 md:sticky md:top-24">
            {/* Promo code as a ticket: notched edges, opens into a field */}
            <div className="relative">
              <span aria-hidden="true" className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-pastel-grey z-10" />
              <span aria-hidden="true" className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-pastel-grey z-10" />
              {cart.coupon || cart.referral ? (
                <div className={`rounded-[20px] ring-1 ring-inset px-4 py-3.5 flex items-center gap-3 ${issue ? 'bg-pastel-sun ring-amber-200' : 'bg-teal-50 ring-teal-300'}`}>
                  <span className={`w-10 h-10 shrink-0 rounded-[12px] bg-white flex items-center justify-center ${issue ? 'text-[#D98A00]' : 'text-teal-600'}`}><Icon name={cart.referral ? 'heart' : issue ? 'info' : 'check'} className="w-5 h-5" strokeWidth={2.6} /></span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold ${issue ? 'text-[#A86A00]' : 'text-teal-700'}`}>{cart.referral ? fill(t('cart.friendOn'), { name: cart.referral.inviterName || t('ref.friend') }) : issue ? t('cart.promoWaiting') : t('cart.promoOn')}</p>
                    <p className="text-[15px] font-extrabold tracking-wider text-gray-900 font-mono truncate">{cart.referral?.code ?? coupon?.code}</p>
                    <p className="text-[12px] text-teal-700">
                      {cart.referral
                        ? cart.referral.discount > 0
                          ? `${cart.referral.offer.type === 'PERCENTAGE' ? fill(t('cart.percentOff'), { v: cart.referral.offer.value }) : fill(t('cart.amountOff'), { v: gel(cart.referral.offer.value) })} · ${t('cart.firstOrder')}`
                          : cart.referral.offer.minOrder > cart.subtotal ? fill(t('cart.friendMin'), { v: gel(cart.referral.offer.minOrder) }) : t('cart.friendNotHere')
                        : coupon && <>
                          {coupon.discountType === 'PERCENTAGE'
                            ? fill(t('cart.percentOff'), { v: Number(coupon.discountValue) })
                            : fill(t('cart.amountOff'), { v: gel(coupon.discountValue) })}
                          {/* Only for some things: say which */}
                          {coupon.scopes && !['SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT'].every((k) => coupon.scopes.includes(k)) && ` · ${coupon.scopes.map((x: string) => t(`cpn.${x}`)).join(', ')}`}
                          {/* Its other rules, so the discount shown isn't a surprise */}
                          {[
                            coupon.discountType === 'PERCENTAGE' && Number(coupon.maxDiscount) > 0 && fill(t('cpn.upTo'), { v: gel(coupon.maxDiscount) }),
                            Number(coupon.minOrderAmount) > 0 && fill(t('cpn.min'), { v: gel(coupon.minOrderAmount) }),
                            (coupon.minPlanMonths ?? 0) > 1 && fill(t('cpn.months'), { n: coupon.minPlanMonths ?? 0 }),
                            coupon.firstOrderOnly && t('cpn.first'),
                          ].filter(Boolean).map((x) => ` · ${x}`).join('')}
                        </>}
                    </p>
                    {/* Takes nothing off yet: say what would make it work */}
                    {issue && <p className="mt-0.5 text-[12px] font-bold text-[#A86A00]">{issue.reason === 'MIN' ? fill(t('cart.cpnShort'), { v: gel(issue.short) }) : issue.reason === 'GIFT' ? t('cart.cpnGift') : t('cart.cpnNone')}</p>}
                    {cart.coupon?.scopes?.includes('DELIVERY') && !cart.referral && !issue && <p className="text-[11.5px] text-teal-700/80">{t('cart.couponDelivery')}</p>}
                  </div>
                  <IconButton icon="close" tone="danger" size="sm" label={t('cart.removeCoupon')} onClick={removeCoupon} />
                </div>
              ) : (
                <div className="rounded-[20px] bg-pastel-sun px-4 py-3.5">
                  <button type="button" onClick={() => setPromoOpen(o => !o)} aria-expanded={promoOpen} className="w-full flex items-center gap-3 text-left">
                    <span className="w-10 h-10 shrink-0 rounded-[12px] bg-white text-[#D98A00] flex items-center justify-center"><Icon name="gift" className="w-5 h-5" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-extrabold text-gray-900">{t('cart.promoAsk')}</span>
                      <span className="block text-[12px] text-gray-600">{t('cart.promoAskSub')}</span>
                    </span>
                    <Icon name={promoOpen ? 'minus' : 'plus'} className="w-5 h-5 text-gray-500 shrink-0" strokeWidth={2.2} />
                  </button>
                  {promoOpen && (
                    <form noValidate className="mt-3 flex gap-2 animate-[fadeUp_0.2s_ease-out]" onSubmit={e => { e.preventDefault(); handleApplyCoupon(); }}>
                      <input type="text" autoFocus placeholder={t('cart.promoPh')} value={couponInput} onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }} aria-label={t('cart.promo')} aria-invalid={!!couponError}
                        className={`flex-1 min-w-0 h-11 rounded-[14px] px-3.5 text-[14px] font-bold tracking-wider uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-gray-400 outline-none ${couponError ? 'bg-red-50 ring-2 ring-red-300' : 'bg-white focus:ring-2 focus:ring-teal-300'}`} />
                      <Button type="submit" disabled={couponLoading || !couponInput.trim()} label={t('cart.apply')} className="!h-11" />
                    </form>
                  )}
                  <FieldError message={couponError} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-[22px] ring-1 ring-gray-100 p-5">
              <h2 className="text-[15px] font-extrabold text-gray-900 mb-3">{t('co.sum.title')}</h2>
              <dl className="space-y-2 text-[13.5px]">
                <div className="flex justify-between text-gray-600"><dt>{t('co.sum.subtotal')}</dt><dd>{gel(cart.subtotal)}</dd></div>
                {cart.discountAmount > 0 && <div className="flex justify-between text-teal-700 font-semibold"><dt>{cart.referral ? t('co.sum.friend') : t('co.sum.discount')}</dt><dd>−{gel(cart.discountAmount)}</dd></div>}
                <div className="flex justify-between text-gray-500">
                  <dt>{t('co.sum.delivery')}</dt>
                  <dd>{cart.deliveryIncluded ? t('co.delivery.included') : t('co.sum.deliveryLater')}</dd>
                </div>
                <div className="border-t border-gray-100 pt-2.5 flex justify-between font-extrabold text-gray-900 text-[18px]"><dt>{t('co.sum.total')}</dt><dd>{gel(cart.total)}</dd></div>
              </dl>
              <div className="hidden md:block mt-5"><Button href="/checkout" size="lg" icon="lock" label={checkoutLabel} /></div>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-[11.5px] text-gray-500">
                <li className="flex items-center gap-1.5"><Icon name="lock" className="w-3.5 h-3.5 text-teal-600" />{t('cart.trustPay')}</li>
                <li className="flex items-center gap-1.5"><Icon name="repeat" className="w-3.5 h-3.5 text-teal-600" />{t('cart.trustCancel')}</li>
              </ul>
            </div>
            <Link href="/shop" className="sm:hidden flex items-center justify-center gap-1.5 h-10 text-[13px] font-semibold text-teal-700">
              <Icon name="arrow" className="w-4 h-4 rotate-180" />{t('cart.continue')}
            </Link>
          </div>
        </div>
      </div>

      {/* Phones: a dock at the bottom (the tab bar steps aside on this page) —
          what's in the basket as little stacked pictures, the total, and Checkout. */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] hdr-tabbar">
        <div className="flex items-center gap-3">
          <span className="flex -space-x-3 shrink-0" aria-hidden="true">
            {cart.items.slice(0, 3).map((item, i) => (
              <ProductThumb key={item.id} item={item} className="w-10 h-10 rounded-[14px] text-lg ring-[3px] ring-white" />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] font-semibold text-gray-500 truncate">{fill(t('cart.dockItems'), { n: cart.itemCount })}</span>
            <span key={String(cart.total)} className="block text-[18px] font-extrabold text-gray-900 leading-tight tabular-nums motion-safe:animate-[fadeUp_0.25s_ease-out]">{gel(cart.total)}</span>
          </span>
          <Button href="/checkout" size="lg" icon="lock" label={checkoutLabel} className="!w-auto shrink-0 !h-12 !px-5" />
        </div>
      </div>
    </main>
  );
}
