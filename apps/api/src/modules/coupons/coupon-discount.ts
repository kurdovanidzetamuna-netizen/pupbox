import type { CouponScope } from '@prisma/client';

export const COUPON_SCOPES: CouponScope[] = ['SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT', 'DELIVERY'];

type Plan = { durationValue: number; durationUnit: string; tierId?: string | null } | null;
type Line = { price: any; quantity: number; productId?: string | null; subscriptionPlanId?: string | null; customBoxId?: string | null; subscriptionPlan?: Plan };
type Coupon = {
  discountType: string; discountValue: any; scopes: CouponScope[]; minOrderAmount?: any;
  maxDiscount?: any; minPlanMonths?: number | null; boxTierIds?: string[];
};

/** What a line is, for promo codes and friend codes. A plan given as a gift counts as GIFT, not BOX. */
export const lineScope = (l: Line, gift = false): CouponScope =>
  l.customBoxId ? 'CUSTOM_BOX' : l.subscriptionPlanId ? (gift ? 'GIFT' : 'BOX') : 'SHOP';

const value = (l: Line) => Number(l.price) * l.quantity;

/** A plan's length in months (a year is 12; weeks and days roughly). */
export const planMonths = (p: NonNullable<Plan>) =>
  p.durationUnit === 'YEAR' ? p.durationValue * 12 : p.durationUnit === 'WEEK' ? p.durationValue / 4.345 : p.durationUnit === 'DAY' ? p.durationValue / 30 : p.durationValue;

/**
 * Why a box plan doesn't qualify (too short, other box type), or null.
 * Only plan lines are checked; a plan we know nothing about passes.
 */
function planMiss(c: Coupon, l: Line): 'months' | 'tier' | null {
  if (!l.subscriptionPlanId || l.customBoxId || !l.subscriptionPlan) return null;
  if (c.minPlanMonths && planMonths(l.subscriptionPlan) < c.minPlanMonths) return 'months';
  if (c.boxTierIds?.length && !c.boxTierIds.includes(l.subscriptionPlan.tierId ?? '')) return 'tier';
  return null;
}

const covers = (c: Coupon, l: Line, gift?: boolean) => c.scopes.includes(lineScope(l, gift)) && !planMiss(c, l);

/** The order's items come to the code's minimum (if it has one). */
export const meetsMinimum = (c: Coupon, lines: Line[]) =>
  !c.minOrderAmount || lines.reduce((n, l) => n + value(l), 0) >= Number(c.minOrderAmount);

/**
 * A promo code's discount on an order: off the lines it covers, and off the
 * delivery fee when it covers delivery. A fixed amount is shared — items
 * first, then delivery — so ₾10 off "shop + delivery" never takes more than
 * ₾10. A % code stops at its cap, if it has one.
 */
export function couponDiscount(c: Coupon, lines: Line[], delivery = 0, o: { gift?: boolean } = {}) {
  if (!meetsMinimum(c, lines)) return { items: 0, delivery: 0 };
  const eligible = lines.filter((l) => covers(c, l, o.gift)).reduce((n, l) => n + value(l), 0);
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

/**
 * Whether this basket has anything the code could take money off, and if
 * not, why: wrong kind of thing, a plan too short, or another box type.
 */
export function couponFit(c: Coupon, lines: Line[]): 'ok' | 'scope' | 'months' | 'tier' {
  if (c.scopes.includes('DELIVERY')) return 'ok';
  // In the basket a plan isn't a gift yet: that's chosen at checkout.
  const kind = lines.filter((l) => c.scopes.includes(lineScope(l)) || (lineScope(l) === 'BOX' && c.scopes.includes('GIFT')));
  if (!kind.length) return 'scope';
  if (kind.some((l) => !planMiss(c, l))) return 'ok';
  return planMiss(c, kind[0])!;
}

/**
 * Why a code on this order takes nothing off, or null when it takes money
 * off. MIN: the order is under its minimum (by `short`). GIFT: it's for gift
 * boxes and this plan isn't a gift. NONE: nothing it covers is in the order.
 * In the basket (no `delivery` yet) a delivery code can still help at
 * checkout, so it only counts the minimum there.
 */
export function couponGap(c: Coupon, lines: Line[], o: { delivery?: number; gift?: boolean } = {}): null | { reason: 'MIN'; short: number } | { reason: 'GIFT' | 'NONE' } {
  if (!meetsMinimum(c, lines)) {
    const subtotal = lines.reduce((n, l) => n + value(l), 0);
    return { reason: 'MIN', short: +(Number(c.minOrderAmount) - subtotal).toFixed(2) };
  }
  const off = couponDiscount(c, lines, o.delivery ?? 0, { gift: o.gift });
  if (off.items + off.delivery > 0) return null;
  if (o.delivery === undefined && c.scopes.includes('DELIVERY')) return null;
  const giftOnly = !o.gift && c.scopes.includes('GIFT') && lines.some((l) => lineScope(l) === 'BOX' && !planMiss(c, l));
  return { reason: giftOnly ? 'GIFT' : 'NONE' };
}

/** Has this customer paid for an order before? (For "new customers only" codes.) */
export const hasPaidBefore = async (prisma: { payment: { count: (a: any) => Promise<number> } }, userId: string) =>
  (await prisma.payment.count({ where: { userId, status: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] } } })) > 0;
