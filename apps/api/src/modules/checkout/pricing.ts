import { couponDiscount } from '../coupons/coupon-discount';
import { referralDiscount } from '../referrals/referral-promo';
import type { ReferralOffer } from '../settings/settings';

type Line = { price: any; quantity: number; productId?: string | null; subscriptionPlanId?: string | null; customBoxId?: string | null; subscriptionPlan?: any };

/**
 * What an order comes to — the one place the shop works it out, used by the
 * basket's delivery options, the checkout preview and the order itself, so
 * the three can never disagree.
 *
 * A promo code takes its part off the items and, if it covers delivery, off
 * the fee. Otherwise a friend's code (when its offer is given) takes the
 * friend's discount; else the basket's own discount stands. A plan bought as
 * a gift counts as GIFT for both.
 */
export function orderPrice(
  cart: { subtotal: number; items: Line[]; coupon?: any; discountAmount?: number },
  delivery: number,
  o: { gift?: boolean; referral?: ReferralOffer | null } = {},
) {
  let itemsOff: number, deliveryOff = 0;
  if (cart.coupon) {
    const off = couponDiscount(cart.coupon, cart.items, delivery, { gift: o.gift });
    itemsOff = off.items;
    deliveryOff = off.delivery;
  } else if (o.referral) {
    itemsOff = referralDiscount(o.referral, cart.items, { gift: o.gift });
  } else {
    itemsOff = cart.discountAmount ?? 0;
  }
  return {
    itemsOff,
    deliveryOff,
    discount: +(itemsOff + deliveryOff).toFixed(2),
    total: +(Math.max(0, cart.subtotal - itemsOff) + delivery - deliveryOff).toFixed(2),
  };
}
