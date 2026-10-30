import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { address, admin, buy, catalogue, coupon, customer, del, expectStatus, get, money, patch, post, prisma, product, server } from './harness';
import { createDueRenewals, endUnpaidRenewals } from '../src/modules/subscriptions/renewal';
import { EmailService } from '../src/modules/email/email.service';

/**
 * Whole journeys through the real server and a real (test) database: what a
 * customer pays, what the shop holds in stock, what admin can do after.
 */

const standard = 'delivery-standard'; // ₾5.99, free from ₾60
const express = 'delivery-express'; // ₾12.99
const plan = async (slug: string) => prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug } });
const stock = async (productId: string) => prisma.inventory.findUniqueOrThrow({ where: { productId } });
const order = async (token: string, extra: Record<string, unknown> = {}, deliveryMethodId = standard) =>
  post('/checkout/order', { deliveryMethodId, ...address, ...extra }, token);

describe('shop orders', () => {
  test('two products, standard delivery: total, payment, stock, empty basket', async () => {
    const c = await customer();
    const p = await product({ price: 20, stock: 10 });
    const prep = expectStatus(await (async () => { await post('/cart/items', { productId: p.id, quantity: 2 }, c.token); return post('/checkout/prepare', { deliveryMethodId: standard }, c.token); })(), '2xx', 'prepare');
    assert.deepEqual(prep.totals, { subtotal: 40, discount: 0, delivery: 5.99, total: 45.99 });
    const o = expectStatus(await order(c.token), '2xx');
    assert.equal(money(o.total), 45.99);
    assert.equal((await stock(p.id)).reservedQty, 2, 'held while unpaid');
    expectStatus(await post(`/payments/initiate/${o.id}`, {}, c.token), '2xx');
    const paid = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { payments: true, items: true } });
    assert.equal(paid.status, 'PAID');
    assert.equal(paid.payments[0].status, 'PAID');
    assert.equal(money(paid.payments[0].amount), 45.99);
    assert.deepEqual(paid.items.map((i) => [i.quantity, money(i.price), money(i.total)]), [[2, 20, 40]]);
    const inv = await stock(p.id);
    assert.equal(inv.quantity, 8);
    assert.equal(inv.reservedQty, 0);
    const cart = expectStatus(await get('/cart', c.token), 200);
    assert.equal(cart.items.length, 0);
  });

  test('free delivery from ₾60; express always costs', async () => {
    const c = await customer();
    const p = await product({ price: 20 });
    assert.equal(money((await buy(c.token, [{ productId: p.id, quantity: 3 }])).total), 60);
    assert.equal(money((await buy(c.token, [{ productId: p.id, quantity: 3 }], { deliveryMethodId: express })).total), 72.99);
  });

  test('the sale price is what is charged', async () => {
    const c = await customer();
    const p = await product({ price: 30, salePrice: 25 });
    const o = await buy(c.token, [{ productId: p.id }]);
    assert.equal(money(o.subtotal), 25);
    assert.equal(money(o.total), 30.99);
  });

  test('a price changed in admin applies to baskets already holding it', async () => {
    const c = await customer();
    const p = await product({ price: 20 });
    expectStatus(await post('/cart/items', { productId: p.id }, c.token), '2xx');
    await prisma.product.update({ where: { id: p.id }, data: { price: 22 } });
    const cart = expectStatus(await get('/cart', c.token), 200);
    assert.equal(cart.subtotal, 22);
    assert.equal(cart.pricesUpdated, true);
  });

  test('not more than is in stock', async () => {
    const c = await customer();
    const p = await product({ price: 5, stock: 1 });
    assert.equal((await post('/cart/items', { productId: p.id, quantity: 2 }, c.token)).status, 400);
  });

  test('the last one can’t be sold twice', async () => {
    const [a, b] = [await customer(), await customer()];
    const p = await product({ price: 5, stock: 1 });
    expectStatus(await post('/cart/items', { productId: p.id }, a.token), '2xx');
    expectStatus(await post('/cart/items', { productId: p.id }, b.token), '2xx');
    expectStatus(await order(a.token), '2xx');
    const second = await order(b.token);
    assert.equal(second.status, 400);
    assert.match(second.body.message, /sold out|fewer left/);
  });

  test('checkout needs a confirmed email and phone, and something in the basket', async () => {
    const unverified = await customer({ verified: false });
    const p = await product({ price: 5 });
    expectStatus(await post('/cart/items', { productId: p.id }, unverified.token), '2xx');
    const r = await order(unverified.token);
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'VERIFY_REQUIRED');
    const empty = await customer();
    assert.equal((await order(empty.token)).status, 400);
  });

  test('a courier needs every address field', async () => {
    const c = await customer();
    const p = await product({ price: 5 });
    expectStatus(await post('/cart/items', { productId: p.id }, c.token), '2xx');
    assert.equal((await post('/checkout/order', { deliveryMethodId: standard, ...address, city: '  ' }, c.token)).status, 400);
    assert.equal((await post('/checkout/order', { deliveryMethodId: standard, ...address, phone: 'call me' }, c.token)).status, 400);
    assert.equal((await post('/checkout/order', { deliveryMethodId: 'nope', ...address }, c.token)).status, 400);
  });

  test('a customer sees only their own orders', async () => {
    const [a, b] = [await customer(), await customer()];
    const p = await product({ price: 5 });
    const o = await buy(a.token, [{ productId: p.id }]);
    assert.equal((await get(`/orders/my/${o.id}`, a.token)).status, 200);
    assert.equal((await get(`/orders/my/${o.id}`, b.token)).status, 404);
    assert.equal((await post(`/payments/initiate/${o.id}`, {}, b.token)).status, 404);
  });
});

describe('promo codes at checkout', () => {
  test('10% off shop products: order total, usage counted', async () => {
    const c = await customer();
    const p = await product({ price: 20 });
    const k = await coupon({ discountValue: 10, scopes: ['SHOP'] });
    const o = await buy(c.token, [{ productId: p.id, quantity: 2 }], { couponCode: k.code.toLowerCase() });
    assert.equal(money(o.discountAmount), 4);
    assert.equal(money(o.total), 41.99);
    assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: k.id } })).usedCount, 1);
    assert.equal(await prisma.couponUsage.count({ where: { couponId: k.id, userId: c.id } }), 1);
  });

  test('a delivery code takes the fee off', async () => {
    const c = await customer();
    const p = await product({ price: 20 });
    const k = await coupon({ discountValue: 100, scopes: ['DELIVERY'] });
    const o = await buy(c.token, [{ productId: p.id }], { couponCode: k.code });
    assert.equal(money(o.total), 20);
    assert.equal(money(o.discountAmount), 5.99);
  });

  test('used up, once per customer, expired, not yet, minimum, first order only', async () => {
    const p = await product({ price: 20 });
    const apply = async (token: string, code: string) => { await post('/cart/items', { productId: p.id }, token); return post('/cart/coupon', { code }, token); };

    const once = await coupon({ usageLimit: 1 });
    await buy((await customer()).token, [{ productId: p.id }], { couponCode: once.code });
    assert.match((await apply((await customer()).token, once.code)).body.message, /run out/);

    const perUser = await coupon({ perUserLimit: 1 });
    const c = await customer();
    await buy(c.token, [{ productId: p.id }], { couponCode: perUser.code });
    assert.match((await apply(c.token, perUser.code)).body.message, /already used/);

    const fresh = await customer();
    assert.equal((await apply(fresh.token, (await coupon({ expiresAt: new Date(Date.now() - 1000) })).code)).status, 400);
    assert.equal((await apply(fresh.token, (await coupon({ startsAt: new Date(Date.now() + 86400_000) })).code)).status, 400);
    assert.match((await apply(fresh.token, (await coupon({ minOrderAmount: 500 })).code)).body.message, /at least ₾500/);
    assert.match((await apply(c.token, (await coupon({ firstOrderOnly: true })).code)).body.message, /first order/);
    assert.equal((await apply(fresh.token, 'NO-SUCH-CODE')).status, 400);
  });

  test('a code switched off after it was applied is taken out at checkout', async () => {
    const c = await customer();
    const p = await product({ price: 20 });
    const k = await coupon({});
    await post('/cart/items', { productId: p.id }, c.token);
    expectStatus(await post('/cart/coupon', { code: k.code }, c.token), '2xx');
    await prisma.coupon.update({ where: { id: k.id }, data: { isActive: false } });
    const r = await order(c.token);
    assert.equal(r.status, 400);
    assert.match(r.body.message, /no longer active/);
    assert.equal((await prisma.cart.findFirstOrThrow({ where: { userId: c.id } })).couponId, null);
  });

  test('an unpaid order cancelled: its stock and its code come back', async () => {
    const c = await customer();
    const p = await product({ price: 20, stock: 5 });
    const k = await coupon({ usageLimit: 1 });
    await post('/cart/items', { productId: p.id, quantity: 2 }, c.token);
    await post('/cart/coupon', { code: k.code }, c.token);
    const o = expectStatus(await order(c.token), '2xx');
    expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: 'CANCELLED' }, await admin()), 200);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status, 'CANCELLED');
    assert.equal((await stock(p.id)).reservedQty, 0);
    assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: k.id } })).usedCount, 0);
  });
});

describe('friend codes', () => {
  test('10% off a first order; not on your own code; not on a second order', async () => {
    const inviter = await customer({ signup: true }); // the short code (NINO-4K7P) is given at sign-up
    const code = (await prisma.user.findUniqueOrThrow({ where: { id: inviter.id } })).referralCode!;
    const p = await product({ price: 50 });
    const friend = await customer();
    const o = await buy(friend.token, [{ productId: p.id }], { couponCode: code });
    assert.equal(money(o.discountAmount), 5);
    assert.equal(money(o.total), 50.99);
    assert.equal(o.referralCode, code);
    assert.ok(await prisma.referral.findFirst({ where: { inviterId: inviter.id, invitedId: friend.id } }));

    await post('/cart/items', { productId: p.id }, inviter.token);
    assert.match((await post('/cart/coupon', { code }, inviter.token)).body.message, /your own code/);
    await post('/cart/items', { productId: p.id }, friend.token);
    assert.match((await post('/cart/coupon', { code }, friend.token)).body.message, /first order/);
  });
});

describe('plans and gifts', () => {
  test('a 3-month plan renewing: delivery included, active, end and renewal dates', async () => {
    const c = await customer();
    const three = await plan('3-months');
    const o = await buy(c.token, [{ subscriptionPlanId: three.id }], { extra: { autoRenewal: true } });
    assert.equal(o.type, 'SUBSCRIPTION');
    assert.equal(money(o.deliveryCost), 0, 'standard delivery comes with the plan');
    assert.equal(money(o.total), 134.99);
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: o.subscriptionId! } });
    assert.equal(s.status, 'ACTIVE');
    assert.equal(s.boxesTotal, 3);
    assert.equal(s.autoRenewal, true);
    const months = (s.endDate!.getFullYear() - s.startDate!.getFullYear()) * 12 + s.endDate!.getMonth() - s.startDate!.getMonth();
    assert.equal(months, 3);
    assert.equal(s.nextRenewalAt?.getTime(), s.endDate?.getTime());
  });

  test('express with a plan costs only the difference', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ subscriptionPlanId: (await plan('1-month')).id }], { deliveryMethodId: express });
    assert.equal(money(o.deliveryCost), 7);
  });

  test('no renewal unless the customer says yes', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ subscriptionPlanId: (await plan('1-month')).id }]);
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: o.subscriptionId! } });
    assert.equal(s.autoRenewal, false);
    assert.equal(s.nextRenewalAt, null);
  });

  test('a plan and products together are one MIXED order', async () => {
    const c = await customer();
    const p = await product({ price: 10 });
    const o = await buy(c.token, [{ subscriptionPlanId: (await plan('1-month')).id }, { productId: p.id }]);
    assert.equal(o.type, 'MIXED');
    assert.equal(money(o.total), 59.99);
  });

  test('a gift: the friend’s dog and address, never renews, not in the buyer’s dogs', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ subscriptionPlanId: (await plan('1-month')).id }], {
      extra: { autoRenewal: true, gift: { recipientName: 'Nino', recipientEmail: 'nino@pupbox.test', message: 'Happy birthday', dog: { name: 'Bela', size: 'SMALL', allergies: ['chicken'] } } },
    });
    assert.equal(o.isGift, true);
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: o.subscriptionId! }, include: { dog: true, address: true } });
    assert.equal(s.isGift, true);
    assert.equal(s.autoRenewal, false);
    assert.equal(s.nextRenewalAt, null);
    assert.equal(s.dog?.forGift, true);
    assert.deepEqual(s.dog?.allergies, ['chicken']);
    assert.equal(s.address?.isGift, true);
    const dogs = expectStatus(await get('/me/dogs', c.token), 200);
    assert.ok(!(Array.isArray(dogs) ? dogs : dogs.items ?? []).some((d: any) => d.name === 'Bela'));
  });

  test('only plans can be gifted, and only on a valid start day', async () => {
    const c = await customer();
    const p = await product({ price: 10 });
    await post('/cart/items', { productId: p.id }, c.token);
    const gift = { recipientName: 'Nino', dog: { name: 'Bela', size: 'SMALL' } };
    assert.match((await order(c.token, { gift })).body.message, /Only subscriptions/);
    await del(`/cart/items/${(await prisma.cartItem.findFirstOrThrow({ where: { cart: { userId: c.id } } })).id}`, c.token);
    await post('/cart/items', { subscriptionPlanId: (await plan('1-month')).id }, c.token);
    assert.match((await order(c.token, { gift: { ...gift, deliverOn: '2020-01-01' } })).body.message, /past/);
  });

  test('cancelling within the free hours: everything back; after: this month kept', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ subscriptionPlanId: (await plan('3-months')).id }]);
    const preview = expectStatus(await get(`/me/subscriptions/${o.subscriptionId}/cancel-preview`, c.token), 200);
    assert.equal(preview.kind, 'free');
    assert.equal(preview.refund, 134.99);
    await prisma.payment.updateMany({ where: { orderId: o.id }, data: { paidAt: new Date(Date.now() - 48 * 3600_000) } });
    const later = expectStatus(await get(`/me/subscriptions/${o.subscriptionId}/cancel-preview`, c.token), 200);
    assert.equal(later.kind, 'keep');
    assert.equal(later.refund, 89.99, '2 of 3 boxes at ₾134.99 ÷ 3');
  });
});

describe('the bank’s answers (Flitt callbacks)', () => {
  const sign = (body: Record<string, unknown>) => {
    const values = Object.keys(body).sort().map((k) => body[k]);
    return createHash('sha1').update([process.env.FLITT_SECRET_KEY, ...values].join('|')).digest('hex');
  };
  async function pending() {
    const c = await customer();
    const p = await product({ price: 20, stock: 10 });
    await post('/cart/items', { productId: p.id }, c.token);
    const o = expectStatus(await order(c.token), '2xx');
    await prisma.payment.create({ data: { orderId: o.id, userId: c.id, provider: 'FLITT', providerPaymentId: `fl-${o.id}`, amount: o.total, currency: 'GEL', status: 'PENDING' } });
    return { o, p };
  }
  const callback = (fields: Record<string, unknown>) => post('/payments/webhook/flitt', { ...fields, signature: sign(fields) });

  test('a forged signature is refused', async () => {
    const { o } = await pending();
    const r = await post('/payments/webhook/flitt', { order_id: o.id, payment_id: `fl-${o.id}`, order_status: 'approved', amount: 2599, currency: 'GEL', signature: 'f'.repeat(40) });
    assert.equal(r.status, 400);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status, 'PENDING');
  });

  test('the wrong amount is not a payment', async () => {
    const { o } = await pending();
    const r = expectStatus(await callback({ order_id: o.id, payment_id: `fl-${o.id}`, order_status: 'approved', amount: 100, currency: 'GEL' }), '2xx');
    assert.equal(r.status, 'amount-mismatch');
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(after.status, 'PENDING');
    assert.match(after.internalNotes ?? '', /mismatch/);
  });

  test('approved: paid once, even when the bank repeats itself', async () => {
    const { o, p } = await pending();
    const fields = { order_id: o.id, payment_id: `fl-${o.id}`, order_status: 'approved', amount: 2599, currency: 'GEL', masked_card: '444455XXXXXX1111', card_type: 'VISA' };
    expectStatus(await callback(fields), '2xx');
    expectStatus(await callback(fields), '2xx');
    const paid = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { payments: true } });
    assert.equal(paid.status, 'PAID');
    assert.equal(paid.payments[0].cardBrand, 'VISA');
    const inv = await stock(p.id);
    assert.equal(inv.quantity, 9, 'stock taken once');
    assert.equal(inv.reservedQty, 0);
  });

  test('declined: the order waits for another try, stock still held', async () => {
    const { o, p } = await pending();
    expectStatus(await callback({ order_id: o.id, payment_id: `fl-${o.id}`, order_status: 'declined', amount: 2599, currency: 'GEL' }), '2xx');
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { payments: true } });
    assert.equal(after.status, 'PENDING');
    assert.equal(after.payments[0].status, 'FAILED');
    assert.equal((await stock(p.id)).reservedQty, 1);
  });

  test('paid after it expired unpaid: reinstated', async () => {
    const { o, p } = await pending();
    expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: 'CANCELLED' }, await admin()), 200);
    expectStatus(await callback({ order_id: o.id, payment_id: `fl-${o.id}`, order_status: 'approved', amount: 2599, currency: 'GEL' }), '2xx');
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status, 'PAID');
    const inv = await stock(p.id);
    assert.equal(inv.quantity, 9);
    assert.equal(inv.reservedQty, 0);
  });
});

describe('admin: moving an order along', () => {
  test('the steps, and no skipping back to unpaid', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ productId: (await product({ price: 10 })).id }]);
    const a = await admin();
    for (const s of ['PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED']) {
      const r = expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: s }, a), 200, s);
      assert.equal(r.status, s);
    }
    assert.equal((await patch(`/orders/admin/${o.id}/status`, { status: 'PENDING' }, a)).status, 400);
    const done = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.ok(done.shippedAt && done.deliveredAt);
  });

  test('cancelling a paid order puts the stock back and owes a refund', async () => {
    const c = await customer();
    const p = await product({ price: 10, stock: 5 });
    const o = await buy(c.token, [{ productId: p.id, quantity: 2 }]);
    assert.equal((await stock(p.id)).quantity, 3);
    const r = expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: 'CANCELLED', reason: 'customer asked' }, await admin()), 200);
    assert.equal(r.status, 'CANCELLED');
    assert.equal((await stock(p.id)).quantity, 5);
    assert.ok(r.allowedNext.includes('REFUNDED'));
  });

  test('a shipped order can’t be cancelled', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ productId: (await product({ price: 10 })).id }]);
    const a = await admin();
    expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: 'SHIPPED' }, a), 200);
    assert.equal((await patch(`/orders/admin/${o.id}/status`, { status: 'CANCELLED' }, a)).status, 400);
  });

  test('a customer’s token can’t reach admin', async () => {
    const c = await customer();
    assert.equal((await get('/orders/admin', c.token)).status, 401);
    assert.equal((await get('/orders/admin')).status, 401);
  });
});

describe('refunds', () => {
  const refund = async (id: string, body: Record<string, unknown>) => post(`/orders/admin/${id}/refunds`, body, await admin());

  test('one item back from an unshipped order: priced as paid, off the order, on the shelf', async () => {
    const c = await customer();
    const p = await product({ price: 20, stock: 10 });
    const k = await coupon({ discountValue: 10, scopes: ['SHOP'] });
    const o = await buy(c.token, [{ productId: p.id, quantity: 2 }], { couponCode: k.code });
    assert.equal(money(o.total), 41.99);
    const r = expectStatus(await refund(o.id, { mode: 'ITEMS', items: [{ itemId: o.items[0].id, quantity: 1 }], restock: true }), '2xx');
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { items: true, payments: { include: { refunds: true } } } });
    assert.equal(money(after.payments[0].refunds[0].amount), 18, '₾20 less the 10% share');
    assert.equal(after.payments[0].status, 'PARTIALLY_REFUNDED');
    assert.equal(after.items[0].quantity, 1);
    assert.equal(money(after.subtotal), 20);
    assert.equal(money(after.total), 21.99);
    assert.equal((await stock(p.id)).quantity, 9);
    assert.equal(r.status, 'PAID');
  });

  test('everything back before shipping: cancelled, closed as refunded, stock back, plan stopped', async () => {
    const c = await customer();
    const p = await product({ price: 10, stock: 10 });
    const o = await buy(c.token, [{ subscriptionPlanId: (await plan('1-month')).id }, { productId: p.id, quantity: 3 }]);
    expectStatus(await refund(o.id, { mode: 'FULL', reason: 'changed mind' }), '2xx');
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { payments: { include: { refunds: true } }, subscription: true } });
    assert.equal(after.status, 'REFUNDED');
    assert.equal(after.payments[0].status, 'REFUNDED');
    assert.equal(money(after.payments[0].refunds[0].amount), money(o.total));
    assert.equal(after.subscription?.status, 'CANCELLED');
    assert.equal((await stock(p.id)).quantity, 10);
    assert.match((await refund(o.id, { mode: 'FULL' })).body.message, /no payment|already refunded/);
  });

  test('an amount: never more than is left', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ productId: (await product({ price: 10 })).id }]);
    expectStatus(await refund(o.id, { mode: 'AMOUNT', amount: 5 }), '2xx');
    assert.equal((await refund(o.id, { mode: 'AMOUNT', amount: 11 })).status, 400);
    expectStatus(await refund(o.id, { mode: 'AMOUNT', amount: 10.99 }), '2xx');
    assert.equal((await prisma.payment.findFirstOrThrow({ where: { orderId: o.id } })).status, 'REFUNDED');
  });

  test('after delivery, a refund ends the order as refunded', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ productId: (await product({ price: 10 })).id }]);
    const a = await admin();
    for (const s of ['SHIPPED', 'DELIVERED']) expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: s }, a), 200);
    expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: 'REFUNDED' }, a), 200);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status, 'REFUNDED');
  });
});

describe('renewals', () => {
  async function renewing(daysToEnd: number) {
    const c = await customer();
    const o = await buy(c.token, [{ subscriptionPlanId: (await plan('1-month')).id }], { extra: { autoRenewal: true } });
    const end = new Date(Date.now() + daysToEnd * 86400_000);
    await prisma.customerSubscription.update({ where: { id: o.subscriptionId! }, data: { endDate: end, nextRenewalAt: end } });
    return { c, subId: o.subscriptionId!, end };
  }
  const email = async () => (await server()).app.get(EmailService);

  test('a renewal order a few days before the end; paying it adds a term', async () => {
    const { c, subId, end } = await renewing(3);
    await createDueRenewals(prisma as any, await email());
    const r = await prisma.order.findFirstOrThrow({ where: { subscriptionId: subId, type: 'RENEWAL' } });
    assert.equal(money(r.total), 49.99);
    assert.equal(r.status, 'PENDING');
    await createDueRenewals(prisma as any, await email());
    assert.equal(await prisma.order.count({ where: { subscriptionId: subId, type: 'RENEWAL' } }), 1, 'one per term');

    expectStatus(await post(`/payments/initiate/${r.id}`, {}, c.token), '2xx');
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: subId } });
    assert.equal(s.boxesTotal, 2);
    assert.equal(s.status, 'ACTIVE');
    const expected = new Date(end); expected.setMonth(expected.getMonth() + 1);
    assert.equal(s.endDate?.toISOString().slice(0, 10), expected.toISOString().slice(0, 10));
    assert.equal(s.nextRenewalAt?.getTime(), s.endDate?.getTime());
  });

  test('not paid within the grace days: the plan ends, the renewal is cancelled', async () => {
    const { subId } = await renewing(1);
    await createDueRenewals(prisma as any, await email());
    await endUnpaidRenewals(prisma as any, new Date(Date.now() + 10 * 86400_000));
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: subId } });
    assert.equal(s.status, 'EXPIRED');
    assert.equal(s.autoRenewal, false);
    assert.equal((await prisma.order.findFirstOrThrow({ where: { subscriptionId: subId, type: 'RENEWAL' } })).status, 'CANCELLED');
  });

  test('a plan no longer sold does not renew', async () => {
    const { subId } = await renewing(2);
    const one = await plan('1-month');
    await prisma.subscriptionPlan.update({ where: { id: one.id }, data: { isActive: false } });
    try {
      await createDueRenewals(prisma as any, await email());
      assert.equal(await prisma.order.count({ where: { subscriptionId: subId, type: 'RENEWAL' } }), 0);
      assert.equal((await prisma.customerSubscription.findUniqueOrThrow({ where: { id: subId } })).autoRenewal, false);
    } finally {
      await prisma.subscriptionPlan.update({ where: { id: one.id }, data: { isActive: true } });
    }
  });

  test('“extend now” makes the same renewal order', async () => {
    const { c, subId } = await renewing(20);
    const r = expectStatus(await post(`/me/subscriptions/${subId}/extend`, {}, c.token), '2xx');
    assert.equal(r.total, 49.99);
    const again = expectStatus(await post(`/me/subscriptions/${subId}/extend`, {}, c.token), '2xx');
    assert.equal(again.orderId, r.orderId, 'an open one is reused');
  });
});

describe('addresses at checkout', () => {
  test('the same address typed again is reused; the first becomes the main one; a gift address is kept apart', async () => {
    const c = await customer();
    const p = await product({ price: 10 });
    await buy(c.token, [{ productId: p.id }]);
    await buy(c.token, [{ productId: p.id }]);
    const mine = await prisma.address.findMany({ where: { userId: c.id } });
    assert.equal(mine.length, 1);
    assert.equal(mine[0].isDefault, true);
    await buy(c.token, [{ productId: p.id }], { extra: { addressLine1: '9 Other street', addressLabel: 'Work', makeMainAddress: true } });
    const after = await prisma.address.findMany({ where: { userId: c.id }, orderBy: { createdAt: 'asc' } });
    assert.equal(after.length, 2);
    assert.deepEqual(after.map((a) => [a.isDefault, a.label]), [[false, null], [true, 'Work']]);
    await buy(c.token, [{ subscriptionPlanId: (await plan('1-month')).id }], { extra: { gift: { recipientName: 'Nino', dog: { name: 'Bela', size: 'SMALL' } } } });
    const gifts = await prisma.address.findMany({ where: { userId: c.id, isGift: true } });
    assert.equal(gifts.length, 1);
    assert.equal(gifts[0].label, 'Gift · Nino');
    assert.equal(gifts[0].isDefault, false);
  });

  test('a saved address of someone else can’t be used', async () => {
    const [a, b] = [await customer(), await customer()];
    const p = await product({ price: 10 });
    const o = await buy(a.token, [{ productId: p.id }]);
    const theirs = o.addressId!;
    const mine = await buy(b.token, [{ productId: p.id }], { extra: { addressId: theirs } });
    assert.notEqual(mine.addressId, theirs);
  });
});
