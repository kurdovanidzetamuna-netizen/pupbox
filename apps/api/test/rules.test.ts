import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { couponDiscount, couponFit, couponGap, lineScope, meetsMinimum, planMonths } from '../src/modules/coupons/coupon-discount';
import { referralDiscount } from '../src/modules/referrals/referral-promo';
import { subscriptionPeriod } from '../src/modules/subscriptions/subscription-period';
import { planCancellation } from '../src/modules/subscriptions/cancellation';
import { cleanReferral, shopSettings, REFERRAL_DEFAULTS } from '../src/modules/settings/settings';
import { CartService } from '../src/modules/cart/cart.service';
import { tidy } from '../src/modules/custom-box/custom-box';
import { checkChoice, parseConfig, sameChoice } from '../src/modules/products/personalisation';
import { normalisePhone } from '../src/modules/auth/verification';

/**
 * The shop's money rules, checked without a database: what a promo code or a
 * friend's code takes off, what delivery costs, when a plan ends, what
 * cancelling gives back. These pin today's behaviour, so a refactor that
 * changes a single tetri fails here first.
 */

// A basket: ₾40 of shop products, a ₾90 three-month plan (box type t1), a ₾50 box someone built.
const shop = { price: 20, quantity: 2, productId: 'p1' };
const plan = { price: 90, quantity: 1, subscriptionPlanId: 'pl1', subscriptionPlan: { durationValue: 3, durationUnit: 'MONTH', tierId: 't1' } };
const built = { price: 50, quantity: 1, customBoxId: 'b1' };
const ALL = ['SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT'] as any[];
const pct = (value: number, scopes = ALL, extra = {}) => ({ discountType: 'PERCENTAGE', discountValue: value, scopes, ...extra });
const fixed = (value: number, scopes = ALL, extra = {}) => ({ discountType: 'FIXED', discountValue: value, scopes, ...extra });

describe('promo codes: what they take off', () => {
  test('a % code on everything it covers', () => {
    assert.deepEqual(couponDiscount(pct(10), [shop, plan, built]), { items: 18, delivery: 0 });
  });
  test('a % code only for shop products leaves the plan alone', () => {
    assert.deepEqual(couponDiscount(pct(10, ['SHOP']), [shop, plan]), { items: 4, delivery: 0 });
  });
  test('a fixed amount never exceeds what it covers', () => {
    assert.deepEqual(couponDiscount(fixed(100, ['SHOP']), [shop, plan]), { items: 40, delivery: 0 });
  });
  test('a fixed amount on shop + delivery: items first, the rest off delivery', () => {
    assert.deepEqual(couponDiscount(fixed(10, ['SHOP', 'DELIVERY']), [shop], 5), { items: 10, delivery: 0 });
    assert.deepEqual(couponDiscount(fixed(43, ['SHOP', 'DELIVERY']), [shop], 5), { items: 40, delivery: 3 });
    assert.deepEqual(couponDiscount(fixed(50, ['SHOP', 'DELIVERY']), [shop], 5), { items: 40, delivery: 5 });
  });
  test('a delivery-only code takes its share of the fee', () => {
    assert.deepEqual(couponDiscount(pct(100, ['DELIVERY']), [shop], 5.99), { items: 0, delivery: 5.99 });
    assert.deepEqual(couponDiscount(pct(50, ['DELIVERY']), [shop], 5.99), { items: 0, delivery: 3 });
  });
  test('a % code stops at its cap, delivery included', () => {
    assert.deepEqual(couponDiscount(pct(50, [...ALL, 'DELIVERY'], { maxDiscount: 15 }), [shop, plan], 5), { items: 15, delivery: 0 });
    assert.deepEqual(couponDiscount(pct(50, [...ALL, 'DELIVERY'], { maxDiscount: 25 }), [shop], 10), { items: 20, delivery: 5 });
  });
  test('under the minimum order: nothing off', () => {
    assert.deepEqual(couponDiscount(pct(10, ALL, { minOrderAmount: 200 }), [shop, plan]), { items: 0, delivery: 0 });
    assert.equal(meetsMinimum({ minOrderAmount: 130 } as any, [shop, plan]), true);
    assert.equal(meetsMinimum({ minOrderAmount: 130.01 } as any, [shop, plan]), false);
  });
  test('a gift-only code works on a plan only when it is sent as a gift', () => {
    assert.deepEqual(couponDiscount(pct(10, ['GIFT']), [plan], 0, { gift: true }), { items: 9, delivery: 0 });
    assert.deepEqual(couponDiscount(pct(10, ['GIFT']), [plan], 0, { gift: false }), { items: 0, delivery: 0 });
    assert.deepEqual(couponDiscount(pct(10, ['BOX']), [plan], 0, { gift: true }), { items: 0, delivery: 0 });
  });
  test('plan length and box type limits', () => {
    assert.deepEqual(couponDiscount(pct(10, ['BOX'], { minPlanMonths: 6 }), [plan]), { items: 0, delivery: 0 });
    assert.deepEqual(couponDiscount(pct(10, ['BOX'], { minPlanMonths: 3 }), [plan]), { items: 9, delivery: 0 });
    assert.deepEqual(couponDiscount(pct(10, ['BOX'], { boxTierIds: ['t2'] }), [plan]), { items: 0, delivery: 0 });
    assert.deepEqual(couponDiscount(pct(10, ['BOX'], { boxTierIds: ['t1', 't2'] }), [plan]), { items: 9, delivery: 0 });
  });
  test('rounds to the tetri', () => {
    assert.deepEqual(couponDiscount(pct(10, ['SHOP']), [{ price: 33.33, quantity: 1, productId: 'x' }]), { items: 3.33, delivery: 0 });
    assert.deepEqual(couponDiscount(pct(15, ['SHOP']), [{ price: 9.99, quantity: 3, productId: 'x' }]), { items: 4.5, delivery: 0 });
  });
  test('what each line counts as', () => {
    assert.equal(lineScope(shop), 'SHOP');
    assert.equal(lineScope(plan), 'BOX');
    assert.equal(lineScope(plan, true), 'GIFT');
    assert.equal(lineScope(built), 'CUSTOM_BOX');
    assert.equal(lineScope(built, true), 'CUSTOM_BOX');
  });
  test('plan lengths in months', () => {
    assert.equal(planMonths({ durationValue: 1, durationUnit: 'YEAR' }), 12);
    assert.equal(planMonths({ durationValue: 6, durationUnit: 'MONTH' }), 6);
    assert.equal(planMonths({ durationValue: 30, durationUnit: 'DAY' }), 1);
    assert.ok(Math.abs(planMonths({ durationValue: 4, durationUnit: 'WEEK' }) - 0.92) < 0.01);
  });
});

describe('promo codes: why a code does not fit', () => {
  test('fit', () => {
    assert.equal(couponFit(pct(10, ['DELIVERY']), [shop]), 'ok');
    assert.equal(couponFit(pct(10, ['BOX']), [shop]), 'scope');
    assert.equal(couponFit(pct(10, ['GIFT']), [plan]), 'ok', 'a gift code fits a plan: gift is chosen at checkout');
    assert.equal(couponFit(pct(10, ['BOX'], { minPlanMonths: 12 }), [plan]), 'months');
    assert.equal(couponFit(pct(10, ['BOX'], { boxTierIds: ['t9'] }), [plan]), 'tier');
  });
  test('gap', () => {
    assert.deepEqual(couponGap(pct(10, ALL, { minOrderAmount: 50 }), [shop]), { reason: 'MIN', short: 10 });
    assert.deepEqual(couponGap(pct(10, ['GIFT']), [plan], { delivery: 0 }), { reason: 'GIFT' });
    assert.deepEqual(couponGap(pct(10, ['SHOP']), [plan], { delivery: 0 }), { reason: 'NONE' });
    assert.equal(couponGap(pct(10, ['DELIVERY']), [shop]), null, 'in the basket a delivery code can still help at checkout');
    assert.deepEqual(couponGap(pct(10, ['DELIVERY']), [shop], { delivery: 0 }), { reason: 'NONE' });
    assert.equal(couponGap(pct(10, ['SHOP']), [shop]), null);
  });
});

describe('friend codes', () => {
  const offer = { ...REFERRAL_DEFAULTS };
  test('the default 10% on everything', () => {
    assert.equal(referralDiscount(offer, [shop, plan]), 13);
  });
  test('a fixed amount, capped at what it covers', () => {
    assert.equal(referralDiscount({ ...offer, friendType: 'FIXED', friendValue: 10 }, [shop]), 10);
    assert.equal(referralDiscount({ ...offer, friendType: 'FIXED', friendValue: 100 }, [shop]), 40);
  });
  test('minimum order and scopes', () => {
    assert.equal(referralDiscount({ ...offer, minOrder: 200 }, [shop, plan]), 0);
    assert.equal(referralDiscount({ ...offer, appliesTo: ['SHOP'] }, [shop, plan]), 4);
    assert.equal(referralDiscount({ ...offer, appliesTo: ['BOX'] }, [plan], { gift: true }), 0);
    assert.equal(referralDiscount({ ...offer, appliesTo: ['GIFT'] }, [plan], { gift: true }), 9);
  });
  test('admin values are kept in range', () => {
    assert.equal(cleanReferral({ friendValue: 95 }).friendValue, 10, 'over 90% falls back');
    assert.equal(cleanReferral({ friendType: 'FIXED', friendValue: 500 }).friendValue, 500);
    assert.deepEqual(cleanReferral({ appliesTo: ['SHOP', 'NOPE'] }).appliesTo, ['SHOP']);
    assert.equal(cleanReferral({ minOrder: -5 }).minOrder, 0);
    assert.equal(cleanReferral({ enabled: false }).enabled, false);
    assert.deepEqual(cleanReferral(null), REFERRAL_DEFAULTS);
  });
});

describe('delivery cost', () => {
  const cart = new CartService(null as any);
  const standard = { price: 5.99, freeThreshold: 60 }, express = { price: 12.99, freeThreshold: null };
  test('free over the amount, else the price', () => {
    assert.equal(cart.deliveryCostFor(standard, { subtotal: 60 }, 5.99), 0);
    assert.equal(cart.deliveryCostFor(standard, { subtotal: 59.99 }, 5.99), 5.99);
    assert.equal(cart.deliveryCostFor(express, { subtotal: 500 }, 5.99), 12.99);
  });
  test('a plan with delivery included covers the cheapest option; faster costs the difference', () => {
    assert.equal(cart.deliveryCostFor(standard, { subtotal: 10, deliveryIncluded: true }, 5.99), 0);
    assert.equal(cart.deliveryCostFor(express, { subtotal: 10, deliveryIncluded: true }, 5.99), 7);
  });
});

describe('plan dates', () => {
  const start = new Date('2026-03-10T09:00:00Z');
  test('end and renewal dates per unit', () => {
    assert.equal(subscriptionPeriod(start, { durationValue: 3, durationUnit: 'MONTH' }, true).endDate.toISOString(), '2026-06-10T09:00:00.000Z');
    assert.equal(subscriptionPeriod(start, { durationValue: 1, durationUnit: 'YEAR' }, true).endDate.toISOString(), '2027-03-10T09:00:00.000Z');
    assert.equal(subscriptionPeriod(start, { durationValue: 2, durationUnit: 'WEEK' }, true).endDate.toISOString(), '2026-03-24T09:00:00.000Z');
    assert.equal(subscriptionPeriod(start, { durationValue: 10, durationUnit: 'DAY' }, true).endDate.toISOString(), '2026-03-20T09:00:00.000Z');
  });
  test('a month from the 31st ends on the month’s last day', () => {
    const end = (d: string, months = 1, unit = 'MONTH') => subscriptionPeriod(new Date(d), { durationValue: months, durationUnit: unit as any }, true).endDate.toISOString().slice(0, 10);
    assert.equal(end('2026-01-31T09:00:00Z'), '2026-02-28');
    assert.equal(end('2028-01-31T09:00:00Z'), '2028-02-29', 'leap year');
    assert.equal(end('2026-03-31T09:00:00Z'), '2026-04-30');
    assert.equal(end('2026-08-31T09:00:00Z', 6), '2027-02-28');
    assert.equal(end('2028-02-29T09:00:00Z', 1, 'YEAR'), '2029-02-28');
    assert.equal(end('2026-01-15T09:00:00Z'), '2026-02-15');
  });
  test('renews only on a yes', () => {
    const p = subscriptionPeriod(start, { durationValue: 1, durationUnit: 'MONTH' }, true);
    assert.equal(p.nextRenewalAt?.getTime(), p.endDate.getTime());
    assert.equal(subscriptionPeriod(start, { durationValue: 1, durationUnit: 'MONTH' }, false).nextRenewalAt, null);
  });
});

describe('cancelling a plan', () => {
  const now = new Date();
  const fake = (sub: any, settings: any = {}) => ({
    customerSubscription: { findUnique: async () => sub },
    cMSPage: { findUnique: async () => ({ content: settings }) },
  }) as any;
  const paidSub = (o: { hoursAgo: number; shipments?: any[]; boxesTotal?: number; boxesDelivered?: number; boxCount?: number; paid?: number; status?: string }) => ({
    id: 's', status: o.status ?? 'ACTIVE', boxesTotal: o.boxesTotal ?? 3, boxesDelivered: o.boxesDelivered ?? 0, startDate: null,
    plan: { boxCount: o.boxCount ?? 3 }, shipments: o.shipments ?? [],
    orders: [{ id: 'o1', items: [{ total: o.paid ?? 90 }], payments: [{ paidAt: new Date(now.getTime() - o.hoursAgo * 3600_000) }] }],
  });
  const thisMonth = (status: string) => ({ year: now.getFullYear(), month: now.getMonth() + 1, status });

  test('within the free hours, nothing sent: everything back', async () => {
    const { plan } = await planCancellation(fake(paidSub({ hoursAgo: 1 })), 's', now);
    assert.equal(plan.kind, 'free');
    assert.equal(plan.refund, 90);
    assert.equal(plan.keptBoxes, 0);
  });
  test('the free hours come from Settings', async () => {
    const { plan } = await planCancellation(fake(paidSub({ hoursAgo: 20 }), { cancellation: { freeHours: 24 } }), 's', now);
    assert.equal(plan.kind, 'free');
  });
  test('after the free hours: this month’s box ships, later months come back', async () => {
    const { plan } = await planCancellation(fake(paidSub({ hoursAgo: 24 })), 's', now);
    assert.equal(plan.kind, 'keep');
    assert.equal(plan.keptBoxes, 1);
    assert.equal(plan.refund, 60);
  });
  test('this month’s box already shipped: it counts as kept, not coming', async () => {
    const { plan } = await planCancellation(fake(paidSub({ hoursAgo: 48, shipments: [thisMonth('SHIPPED')] })), 's', now);
    assert.equal(plan.thisMonthBoxComing, false);
    assert.equal(plan.keptBoxes, 1);
    assert.equal(plan.refund, 60);
  });
  test('a box sent: never free, even within the hours', async () => {
    const { plan } = await planCancellation(fake(paidSub({ hoursAgo: 1, boxesDelivered: 1 })), 's', now);
    assert.equal(plan.kind, 'keep');
  });
  test('after a renewal: refund never more than the last payment', async () => {
    const { plan } = await planCancellation(fake(paidSub({ hoursAgo: 100, boxesTotal: 6, boxesDelivered: 3 })), 's', now);
    assert.equal(plan.keptBoxes, 4);
    assert.equal(plan.refund, 60);
    const all = await planCancellation(fake(paidSub({ hoursAgo: 100, boxesTotal: 9, boxesDelivered: 1, status: 'PAUSED' })), 's', now);
    assert.equal(all.plan.refund, 90, 'capped at what was paid');
  });
});

describe('shop settings from admin', () => {
  const settings = (content: any) => shopSettings({ cMSPage: { findUnique: async () => ({ content }) } } as any);
  test('defaults', async () => {
    const s = await settings({});
    assert.equal(s.freeCancelHours, 12);
    assert.equal(s.unpaidHours, 2);
    assert.equal(s.extraPaymentDays, 7);
    assert.equal(s.renewalNoticeDays, 7);
    assert.equal(s.renewalGraceDays, 3);
    assert.deepEqual(s.customBox, { minItems: 3, packingFee: 5, monthlyDiscount: 10, mystery: { enabled: true, price: 15, max: 2 } });
  });
  test('out-of-range values fall back or are clamped', async () => {
    const s = await settings({ orders: { unpaidHours: 500, extraPaymentDays: 0 }, cancellation: { freeHours: 'x' }, customBox: { minItems: 0 } });
    assert.equal(s.unpaidHours, 2);
    assert.equal(s.extraPaymentDays, 1);
    assert.equal(s.freeCancelHours, 12);
    assert.equal(s.customBox.minItems, 1);
  });
});

describe('build-a-box lines', () => {
  test('one row per product, whole numbers up to 20', () => {
    assert.deepEqual(tidy([{ productId: 'a', quantity: 2 }, { productId: 'a', quantity: 3 }, { productId: 'b', quantity: 2.7 }, { productId: 'c', quantity: 0 }, { productId: '', quantity: 1 }, { productId: 'd', quantity: 50 }]),
      [{ productId: 'a', quantity: 5 }, { productId: 'b', quantity: 2 }, { productId: 'd', quantity: 20 }]);
  });
});

describe('personalisation', () => {
  const cfg = { engraving: { maxLength: 10 }, sizes: ['S', 'M'] };
  test('admin config is cleaned', () => {
    assert.equal(parseConfig(null), null);
    assert.equal(parseConfig({ engraving: { maxLength: 0 } }), null);
    assert.deepEqual(parseConfig({ engraving: { maxLength: 99 }, sizes: [' S ', 'S', ''] }), { engraving: { maxLength: 40 }, sizes: ['S'] });
  });
  test('choices are checked', () => {
    assert.deepEqual(checkChoice(cfg, { engraving: '  Rex\n  ', size: 'M' }), { engraving: 'Rex', size: 'M' });
    assert.throws(() => checkChoice(cfg, { size: 'M' }), /Enter the name/);
    assert.throws(() => checkChoice(cfg, { engraving: 'A very long name', size: 'M' }), /up to 10/);
    assert.throws(() => checkChoice(cfg, { engraving: 'Rex', size: 'XL' }), /Choose a size/);
    assert.equal(checkChoice(null, { engraving: 'ignored' }), null);
  });
  test('same choice, any key order', () => {
    assert.equal(sameChoice({ size: 'M', engraving: 'Rex' }, { engraving: 'Rex', size: 'M' }), true);
    assert.equal(sameChoice({ engraving: 'Rex' }, { engraving: 'Luna' }), false);
    assert.equal(sameChoice(null, {}), true);
  });
});

describe('phone numbers', () => {
  test('Georgian numbers in any form', () => {
    assert.equal(normalisePhone('599 12 34 56'), '+995599123456');
    assert.equal(normalisePhone('+995 599-12-34-56'), '+995599123456');
    assert.equal(normalisePhone('00995599123456'), '+995599123456');
    assert.equal(normalisePhone('12'), null);
    assert.equal(normalisePhone(''), null);
  });
});

describe('the site’s and admin’s copy of the promo-code rule', () => {
  test('gives the same answer as the server for 5,000 random baskets and codes', async () => {
    const shared = await import('../../../packages/content/src/coupon');
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
    const SCOPES = ['SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT', 'DELIVERY'] as any[];
    for (let n = 0; n < 5000; n++) {
      const lines = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => {
        const kind = pick(['shop', 'plan', 'box']);
        const price = +(rnd() * 200).toFixed(2), quantity = 1 + Math.floor(rnd() * 3);
        return kind === 'shop' ? { price, quantity, productId: 'p' }
          : kind === 'box' ? { price, quantity: 1, customBoxId: 'b' }
          : { price, quantity: 1, subscriptionPlanId: 'pl', subscriptionPlan: { durationValue: pick([1, 3, 6, 12]), durationUnit: pick(['MONTH', 'YEAR', 'WEEK']), tierId: pick(['t1', 't2', null]) } };
      });
      const c = {
        discountType: pick(['PERCENTAGE', 'FIXED']), discountValue: +(rnd() * (rnd() < 0.5 ? 100 : 300)).toFixed(2),
        scopes: SCOPES.filter(() => rnd() < 0.5), minOrderAmount: rnd() < 0.3 ? +(rnd() * 300).toFixed(2) : null,
        maxDiscount: rnd() < 0.3 ? +(rnd() * 50).toFixed(2) : null, minPlanMonths: rnd() < 0.3 ? pick([3, 6, 12]) : null,
        boxTierIds: rnd() < 0.3 ? [pick(['t1', 't2'])] : [],
      };
      const delivery = pick([0, 5.99, 12.99]), gift = rnd() < 0.3;
      assert.deepEqual(shared.couponDiscount(c, lines, delivery, { gift }), couponDiscount(c as any, lines as any, delivery, { gift }), JSON.stringify({ c, lines, delivery, gift }));
    }
  });
});
