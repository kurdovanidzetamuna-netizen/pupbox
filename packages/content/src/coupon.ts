/**
 * What a promo code takes off, for previews in the site and admin. The same
 * rule as the API's (apps/api/src/modules/coupons/coupon-discount.ts); the
 * API's tests (pricing parity in rules.test.ts) fail if the two ever differ.
 */

export type CouponScope = 'SHOP' | 'BOX' | 'CUSTOM_BOX' | 'GIFT' | 'DELIVERY';
type Plan = { durationValue: number; durationUnit: string; tierId?: string | null } | null | undefined;
export type CouponLine = { price: unknown; quantity: number; productId?: string | null; subscriptionPlanId?: string | null; customBoxId?: string | null; subscriptionPlan?: Plan };
export type CouponRule = {
  discountType: string; discountValue: unknown; scopes: string[]; minOrderAmount?: unknown;
  maxDiscount?: unknown; minPlanMonths?: number | null; boxTierIds?: string[];
};

/** What a line is for promo codes. A plan given as a gift counts as GIFT, not BOX. */
export const lineScope = (l: CouponLine, gift = false): CouponScope =>
  l.customBoxId ? 'CUSTOM_BOX' : l.subscriptionPlanId ? (gift ? 'GIFT' : 'BOX') : 'SHOP';

const value = (l: CouponLine) => Number(l.price) * l.quantity;

/** A plan's length in months (a year is 12; weeks and days roughly). */
export const planMonths = (p: NonNullable<Plan>) =>
  p.durationUnit === 'YEAR' ? p.durationValue * 12 : p.durationUnit === 'WEEK' ? p.durationValue / 4.345 : p.durationUnit === 'DAY' ? p.durationValue / 30 : p.durationValue;

function planMiss(c: CouponRule, l: CouponLine): boolean {
  if (!l.subscriptionPlanId || l.customBoxId || !l.subscriptionPlan) return false;
  if (c.minPlanMonths && planMonths(l.subscriptionPlan) < c.minPlanMonths) return true;
  return !!c.boxTierIds?.length && !c.boxTierIds.includes(l.subscriptionPlan.tierId ?? '');
}

export const meetsMinimum = (c: CouponRule, lines: CouponLine[]) =>
  !c.minOrderAmount || lines.reduce((n, l) => n + value(l), 0) >= Number(c.minOrderAmount);

/** Off the lines it covers and, if it covers delivery, off the fee; a fixed amount is shared, items first; a % stops at its cap. */
export function couponDiscount(c: CouponRule, lines: CouponLine[], delivery = 0, o: { gift?: boolean } = {}) {
  if (!meetsMinimum(c, lines)) return { items: 0, delivery: 0 };
  const eligible = lines.filter((l) => c.scopes.includes(lineScope(l, o.gift)) && !planMiss(c, l)).reduce((n, l) => n + value(l), 0);
  const fee = c.scopes.includes('DELIVERY') ? Math.max(0, delivery) : 0;
  let items: number, off: number;
  if (c.discountType === 'PERCENTAGE') {
    const pct = Number(c.discountValue) / 100;
    const cap = c.maxDiscount ? Number(c.maxDiscount) : Infinity;
    items = Math.min(eligible * pct, cap);
    off = Math.min(fee * pct, cap - items);
  } else {
    items = Math.min(Number(c.discountValue), eligible);
    off = Math.min(Number(c.discountValue) - items, fee);
  }
  return { items: +items.toFixed(2), delivery: +off.toFixed(2) };
}
