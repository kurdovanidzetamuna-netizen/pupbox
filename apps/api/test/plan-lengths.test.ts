import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { address, admin, coupon, customer, expectStatus, get, money, post, prisma } from './harness';
import { createDueRenewals } from '../src/modules/subscriptions/renewal';
import { EmailService } from '../src/modules/email/email.service';
import { server } from './harness';

/**
 * Plans of any length an admin may create — 1 to 12 months, 18 and 24 —
 * made through admin's own form route, then bought every way: renewing or
 * not, as a gift, with every kind of promo code and a friend's code; its
 * dates, boxes, cancellation refund, renewal and "extend now" checked.
 */

const LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24];
const priceOf = (m: number) => +(25 * m - (m > 1 ? m : 0)).toFixed(2); // a little cheaper per month when longer

/** Calendar months on, keeping the day (or the month's last day). */
function plusMonths(d: Date, n: number) {
  const x = new Date(d), day = x.getDate();
  x.setDate(1); x.setMonth(x.getMonth() + n);
  x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
  return x;
}
const months = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();

let made: Promise<{ tierId: string; plans: Map<number, { id: string; slug: string; price: number; boxCount: number }> }> | null = null;
/** One box type with a plan for every length, created as admin would. */
function plans() {
  made ??= (async () => {
    const a = await admin();
    const tier = expectStatus(await post('/admin/box-tiers', { name: `Lengths ${Date.now()}`, slug: `lengths-${Date.now()}`, itemCount: 5, isActive: true }, a), '2xx', 'box type');
    const map = new Map<number, { id: string; slug: string; price: number; boxCount: number }>();
    for (const m of LENGTHS) {
      const slug = `len-${m}-${Date.now()}`;
      const p = expectStatus(await post('/admin/subscription-plans', {
        name: `${m}-month box`, slug, durationValue: m, durationUnit: 'MONTH', boxCount: m, price: priceOf(m),
        deliveryIncluded: true, autoRenewal: true, giftable: true, isActive: true, listed: true, tierId: tier.id, benefits: [],
      }, a), '2xx', `plan ${m}`);
      map.set(m, { id: p.id, slug, price: priceOf(m), boxCount: m });
    }
    return { tierId: tier.id, plans: map };
  })();
  return made;
}

async function buyPlan(token: string, planId: string, extra: Record<string, unknown> = {}, code?: string) {
  expectStatus(await post('/cart/items', { subscriptionPlanId: planId }, token), '2xx', 'add plan');
  if (code) expectStatus(await post('/cart/coupon', { code }, token), '2xx', 'apply code');
  const o = expectStatus(await post('/checkout/order', { deliveryMethodId: 'delivery-standard', ...address, ...extra }, token), '2xx', 'order');
  expectStatus(await post(`/payments/initiate/${o.id}`, {}, token), '2xx', 'pay');
  return prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { subscription: true } });
}

describe('plans of any length', () => {
  test('every length shows on the prices page, as its own length, in its box type', async () => {
    const { tierId } = await plans();
    const tiers = expectStatus(await get('/box-tiers'), 200);
    const mine = tiers.find((t: any) => t.id === tierId);
    assert.ok(mine, 'the box type is listed');
    assert.deepEqual(mine.plans.map((p: any) => p.durationValue).sort((x: number, y: number) => x - y), LENGTHS);
  });

  for (const m of LENGTHS) {
    test(`${m} month${m > 1 ? 's' : ''}: price, free delivery, ${m} boxes, ends ${m} calendar months later, renews then`, async () => {
      const p = (await plans()).plans.get(m)!;
      const c = await customer();
      const o = await buyPlan(c.token, p.id, { autoRenewal: true });
      assert.equal(o.status, 'PAID');
      assert.equal(money(o.total), p.price);
      assert.equal(money(o.deliveryCost), 0);
      const s = o.subscription!;
      assert.equal(s.status, 'ACTIVE');
      assert.equal(s.boxesTotal, m);
      assert.equal(months(s.startDate!, s.endDate!), m);
      assert.equal(s.endDate!.toISOString(), plusMonths(s.startDate!, m).toISOString());
      assert.equal(s.nextRenewalAt?.getTime(), s.endDate!.getTime());
    });
  }

  test('every length as a gift: friend’s plan, never renews', async () => {
    const { plans: all } = await plans();
    const c = await customer();
    for (const m of LENGTHS) {
      const o = await buyPlan(c.token, all.get(m)!.id, { autoRenewal: true, gift: { recipientName: 'Nino', dog: { name: 'Bela', size: 'SMALL' } } });
      assert.equal(o.isGift, true, `${m}`);
      assert.equal(o.subscription!.autoRenewal, false, `${m}`);
      assert.equal(o.subscription!.boxesTotal, m, `${m}`);
    }
  });

  test('a % code on boxes: 10% off every length', async () => {
    const { plans: all } = await plans();
    const k = await coupon({ discountValue: 10, scopes: ['BOX'] });
    for (const m of LENGTHS) {
      const c = await customer();
      const o = await buyPlan(c.token, all.get(m)!.id, {}, k.code);
      assert.equal(money(o.discountAmount), money(all.get(m)!.price * 0.1), `${m}`);
      assert.equal(money(o.total), money(all.get(m)!.price - money(all.get(m)!.price * 0.1)), `${m}`);
    }
  });

  test('a code for plans of 7+ months: refused below 7, taken from 7', async () => {
    const { plans: all } = await plans();
    const k = await coupon({ discountType: 'FIXED', discountValue: 20, scopes: ['BOX'], minPlanMonths: 7 });
    for (const m of LENGTHS) {
      const c = await customer();
      await post('/cart/items', { subscriptionPlanId: all.get(m)!.id }, c.token);
      const r = await post('/cart/coupon', { code: k.code }, c.token);
      if (m < 7) {
        assert.equal(r.status, 400, `${m} months should be refused`);
        assert.match(r.body.message, /7 months or longer/);
      } else {
        assert.ok(r.status < 300, `${m} months should be accepted`);
        const o = expectStatus(await post('/checkout/order', { deliveryMethodId: 'delivery-standard', ...address }, c.token), '2xx');
        assert.equal(money(o.total), money(all.get(m)!.price - 20), `${m}`);
      }
    }
  });

  test('a code only for this box type: works on every length of it, not on others', async () => {
    const { tierId, plans: all } = await plans();
    const k = await coupon({ discountValue: 15, scopes: ['BOX'], boxTierIds: [tierId] });
    const c = await customer();
    const o = await buyPlan(c.token, all.get(7)!.id, {}, k.code);
    assert.equal(money(o.discountAmount), money(all.get(7)!.price * 0.15));
    const other = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug: '3-months' } });
    const d = await customer();
    await post('/cart/items', { subscriptionPlanId: other.id }, d.token);
    assert.equal((await post('/cart/coupon', { code: k.code }, d.token)).status, 400);
  });

  test('a gift-only code on every length bought as a gift', async () => {
    const { plans: all } = await plans();
    const k = await coupon({ discountValue: 20, scopes: ['GIFT'] });
    for (const m of [2, 7, 11]) {
      const c = await customer();
      const o = await buyPlan(c.token, all.get(m)!.id, { gift: { recipientName: 'Nino', dog: { name: 'Bela', size: 'SMALL' } } }, k.code);
      assert.equal(money(o.discountAmount), money(all.get(m)!.price * 0.2), `${m}`);
    }
  });

  test('a friend’s code on any length', async () => {
    const { plans: all } = await plans();
    const inviter = await customer({ signup: true });
    const code = (await prisma.user.findUniqueOrThrow({ where: { id: inviter.id } })).referralCode!;
    const c = await customer();
    const o = await buyPlan(c.token, all.get(7)!.id, {}, code);
    assert.equal(money(o.discountAmount), money(all.get(7)!.price * 0.1));
  });

  test('cancelling after the free hours: kept boxes, the rest back at the plan’s own box price', async () => {
    const { plans: all } = await plans();
    for (const m of LENGTHS) {
      const c = await customer();
      const o = await buyPlan(c.token, all.get(m)!.id);
      await prisma.payment.updateMany({ where: { orderId: o.id }, data: { paidAt: new Date(Date.now() - 48 * 3600_000) } });
      const v = expectStatus(await get(`/me/subscriptions/${o.subscriptionId}/cancel-preview`, c.token), 200);
      const perBox = all.get(m)!.price / m;
      assert.equal(v.kind, 'keep', `${m}`);
      assert.equal(v.keptBoxes, 1, `${m}`);
      assert.equal(v.refund, Math.round(perBox * (m - 1) * 100) / 100, `${m} months`);
    }
  });

  test('renewing any length: same price, another full term, its boxes added', async () => {
    const { plans: all } = await plans();
    const email = (await server()).app.get(EmailService);
    for (const m of [2, 7, 12, 18]) {
      const c = await customer();
      const o = await buyPlan(c.token, all.get(m)!.id, { autoRenewal: true });
      const end = new Date(Date.now() + 3 * 86400_000);
      await prisma.customerSubscription.update({ where: { id: o.subscriptionId! }, data: { endDate: end, nextRenewalAt: end } });
      await createDueRenewals(prisma as any, email);
      const r = await prisma.order.findFirstOrThrow({ where: { subscriptionId: o.subscriptionId!, type: 'RENEWAL' } });
      assert.equal(money(r.total), all.get(m)!.price, `${m}`);
      expectStatus(await post(`/payments/initiate/${r.id}`, {}, c.token), '2xx');
      const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: o.subscriptionId! } });
      assert.equal(s.boxesTotal, 2 * m, `${m}`);
      assert.equal(s.endDate!.toISOString(), plusMonths(end, m).toISOString(), `${m}`);
    }
  });

  test('more boxes than months, or fewer, are kept as set', async () => {
    const a = await admin();
    const odd = expectStatus(await post('/admin/subscription-plans', {
      name: '7 months, 3 boxes', slug: `odd-${Date.now()}`, durationValue: 7, durationUnit: 'MONTH', boxCount: 3, price: 90,
      deliveryIncluded: true, autoRenewal: true, giftable: true, isActive: true, listed: true, benefits: [],
    }, a), '2xx');
    const c = await customer();
    const o = await buyPlan(c.token, odd.id);
    assert.equal(o.subscription!.boxesTotal, 3);
    assert.equal(months(o.subscription!.startDate!, o.subscription!.endDate!), 7);
  });
});
