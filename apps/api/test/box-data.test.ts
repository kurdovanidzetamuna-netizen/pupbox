import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { address, admin, customer, del, expectStatus, get, money, patch, post, prisma, put, server } from './harness';
import { createDueRenewals } from '../src/modules/subscriptions/renewal';
import { EmailService } from '../src/modules/email/email.service';
import { shopSettings } from '../src/modules/settings/settings';

/**
 * What the database holds after each thing admin and customers do with
 * boxes: adding, changing and removing box types, plans and box products;
 * building a box; and carrying a plan on (renewing, extending, switching
 * renewal off, cancelling) — row by row, nothing left dangling.
 */

const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const email = async () => (await server()).app.get(EmailService);
const DAY = 86400_000;

async function boxType(o: Record<string, unknown> = {}) {
  const s = stamp();
  return expectStatus(await post('/admin/box-tiers', { name: `Data ${s}`, slug: `data-${s}`, itemCount: 5, isActive: true, ...o }, await admin()), '2xx', 'box type');
}
async function plan(tierId: string | null, o: Record<string, unknown> = {}) {
  const s = stamp();
  return expectStatus(await post('/admin/subscription-plans', {
    name: `Data plan ${s}`, slug: `data-plan-${s}`, durationValue: 1, durationUnit: 'MONTH', boxCount: 1, price: 40,
    deliveryIncluded: true, autoRenewal: true, giftable: true, isActive: true, listed: true, tierId, benefits: ['Free delivery'], ...o,
  }, await admin()), '2xx', 'plan');
}
const checkout = (token: string, extra: Record<string, unknown> = {}) => post('/checkout/order', { deliveryMethodId: 'delivery-standard', ...address, autoRenewal: true, ...extra }, token);
async function pay(token: string, orderId: string) {
  expectStatus(await post(`/payments/initiate/${orderId}`, {}, token), '2xx', 'pay');
  return prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, payments: true, subscription: true } });
}
async function buyPlan(token: string, planId: string) {
  expectStatus(await post('/cart/items', { subscriptionPlanId: planId }, token), '2xx', 'add plan');
  return pay(token, expectStatus(await checkout(token), '2xx', 'order').id);
}
/** Puts a subscription a few days from its end, so the renewal is due. */
const dueSoon = (id: string, days = 3) => {
  const end = new Date(Date.now() + days * DAY);
  return prisma.customerSubscription.update({ where: { id }, data: { endDate: end, nextRenewalAt: end } });
};
const boxProduct = (o: { price?: number; stock?: number; custom?: boolean } = {}) => prisma.product.create({
  data: {
    name: `Box item ${stamp()}`, slug: `bi-${stamp()}`, sku: `BI-${stamp()}`, price: o.price ?? 10, status: 'ACTIVE', standaloneSale: false,
    includedInBox: !o.custom, inCustomBox: !!o.custom, inventory: { create: { quantity: o.stock ?? 50 } },
  },
});

describe('box types in the database', () => {
  test('every field saved as sent; an edit changes only what was sent', async () => {
    const t = await boxType({ tagline: 'Tag', description: 'Desc', highlights: ['A', 'B'], itemCount: 6, budgetMin: 20, budgetMax: 30, emoji: '🎁', featured: true, sortOrder: 7, translations: { ka: { name: 'ყუთი', highlights: ['ა'] } } });
    const row = await prisma.boxTier.findUniqueOrThrow({ where: { id: t.id } });
    assert.deepEqual([row.tagline, row.description, row.highlights, row.itemCount, Number(row.budgetMin), Number(row.budgetMax), row.emoji, row.featured, row.sortOrder, (row.translations as any).ka.name],
      ['Tag', 'Desc', ['A', 'B'], 6, 20, 30, '🎁', true, 7, 'ყუთი']);
    expectStatus(await put(`/admin/box-tiers/${t.id}`, { tagline: 'New' }, await admin()), '2xx');
    const after = await prisma.boxTier.findUniqueOrThrow({ where: { id: t.id } });
    assert.deepEqual({ ...after, updatedAt: null }, { ...row, tagline: 'New', updatedAt: null });
    // Budget cleared with null; left out keeps it.
    expectStatus(await put(`/admin/box-tiers/${t.id}`, { budgetMin: null, budgetMax: null }, await admin()), '2xx');
    assert.equal((await prisma.boxTier.findUniqueOrThrow({ where: { id: t.id } })).budgetMin, null);
  });

  test('deleting: refused while a plan of it was ever bought (even a deleted plan); otherwise its deleted plans let go of it', async () => {
    const a = await admin();
    const used = await boxType(), p = await plan(used.id);
    const c = await customer();
    await buyPlan(c.token, p.id);
    await prisma.subscriptionPlan.update({ where: { id: p.id }, data: { deletedAt: new Date(), isActive: false } });
    assert.equal((await del(`/admin/box-tiers/${used.id}`, a)).status, 400, 'its orders keep their box type in Reports');
    assert.equal((await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: p.id } })).tierId, used.id);

    const unused = await boxType(), q = await plan(unused.id);
    expectStatus(await del(`/admin/subscription-plans/${q.id}`, a), '2xx');
    expectStatus(await del(`/admin/box-tiers/${unused.id}`, a), '2xx');
    assert.equal(await prisma.boxTier.count({ where: { id: unused.id } }), 0);
    assert.equal((await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: q.id } })).tierId, null);
  });
});

describe('plans in the database', () => {
  test('every field saved; switches change only themselves', async () => {
    const t = await boxType();
    const p = await plan(t.id, { price: 99.5, discountPercent: 10, monthlyEquivPrice: 33.17, durationValue: 3, boxCount: 3, badge: 'New', description: 'D', translations: { ka: { name: 'გეგმა' }, config: { deliveryCost: 2 } } });
    const row = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: p.id } });
    assert.deepEqual([Number(row.price), Number(row.discountPercent), Number(row.monthlyEquivPrice), row.durationValue, row.boxCount, row.badge, row.description, row.tierId, (row.translations as any).ka.name, (row.translations as any).config.deliveryCost],
      [99.5, 10, 33.17, 3, 3, 'New', 'D', t.id, 'გეგმა', 2]);
    for (const change of [{ listed: false }, { isActive: false }, { deliveryIncluded: false }, { giftable: false }]) {
      const before = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: p.id } });
      expectStatus(await put(`/admin/subscription-plans/${p.id}`, change, await admin()), '2xx');
      const after = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: p.id } });
      assert.deepEqual({ ...after, updatedAt: null }, { ...before, ...change, updatedAt: null }, JSON.stringify(change));
    }
  });

  test('deleting: refused once bought (turn it off instead); an unused one is kept as deleted and leaves the site, admin and baskets', async () => {
    const a = await admin(), t = await boxType();
    const bought = await plan(t.id);
    await buyPlan((await customer()).token, bought.id);
    const r = await del(`/admin/subscription-plans/${bought.id}`, a);
    assert.equal(r.status, 400);
    assert.match(r.body.message, /turn it off/i);
    assert.equal((await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: bought.id } })).deletedAt, null);

    const p = await plan(t.id);
    const c = await customer();
    expectStatus(await post('/cart/items', { subscriptionPlanId: p.id }, c.token), '2xx');
    expectStatus(await del(`/admin/subscription-plans/${p.id}`, a), '2xx');
    const row = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: p.id } });
    assert.ok(row.deletedAt && !row.isActive, 'kept, marked deleted');
    assert.ok(!(expectStatus(await get('/admin/subscription-plans', a), 200) as any[]).some((x) => x.id === p.id));
    assert.ok(!(expectStatus(await get('/box-tiers'), 200) as any[]).some((x) => x.plans.some((y: any) => y.id === p.id)));
    const cart = expectStatus(await get('/cart', c.token), 200);
    assert.equal(cart.items.length, 0, 'gone from the basket');
    assert.equal(await prisma.cartItem.count({ where: { subscriptionPlanId: p.id } }), 0);
  });
});

describe('box products in the database', () => {
  test('a product in a month still to come can’t be removed; once that month is over it can', async () => {
    const a = await admin();
    const prod = await boxProduct();
    const now = new Date(Date.now() + 4 * 3600_000); // Tbilisi
    const [y, m] = [now.getUTCFullYear() + 1, 1];
    const camp = expectStatus(await post('/box-campaigns', { name: `Future ${stamp()}`, month: m, year: y }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${camp.id}/products`, { items: [{ productId: prod.id, quantity: 1 }] }, a), '2xx');
    const r = await del(`/admin/products/${prod.id}`, a);
    assert.equal(r.status, 400);
    assert.match(r.body.message, /Box contents/);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: prod.id } })).deletedAt, null);

    const old = await boxProduct();
    const past = expectStatus(await post('/box-campaigns', { name: `Past ${stamp()}`, month: 1, year: 2025 }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${past.id}/products`, { items: [{ productId: old.id, quantity: 1 }] }, a), '2xx');
    expectStatus(await del(`/admin/products/${old.id}`, a), '2xx');
    const row = await prisma.product.findUniqueOrThrow({ where: { id: old.id } });
    assert.ok(row.deletedAt && row.status === 'INACTIVE', 'kept for history, marked deleted');
    assert.equal(await prisma.boxCampaignProduct.count({ where: { productId: old.id } }), 1, 'the past month still shows what it had');
  });
});

describe('a box the customer builds', () => {
  test('one-time: the order holds each product and the packing fee; paying takes the stock', async () => {
    const { customBox: cfg } = await shopSettings(prisma as any);
    const [x, y] = [await boxProduct({ custom: true, price: 8, stock: 20 }), await boxProduct({ custom: true, price: 6, stock: 20 })];
    const c = await customer();
    expectStatus(await post('/cart/custom-box', { items: [{ productId: x.id, quantity: 2 }, { productId: y.id, quantity: Math.max(1, cfg.minItems - 2) }], monthly: false }, c.token), '2xx');
    const nY = Math.max(1, cfg.minItems - 2);
    const o = await pay(c.token, expectStatus(await checkout(c.token), '2xx').id);
    assert.equal(o.status, 'PAID');
    assert.equal(o.subscription, null, 'no plan for a one-time box');
    const goods = money(2 * 8 + nY * 6);
    assert.equal(money(o.subtotal), money(goods + cfg.packingFee));
    const lines = Object.fromEntries(o.items.filter((i) => i.productId).map((i) => [i.productId, i.quantity]));
    assert.deepEqual(lines, { [x.id]: 2, [y.id]: nY });
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { productId: x.id } })).quantity, 18);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { productId: y.id } })).quantity, 20 - nY);
  });

  test('monthly: a plan holding the box; renews at today’s prices; a product removed since is left out — and not packed', async () => {
    const a = await admin();
    const { customBox: cfg } = await shopSettings(prisma as any);
    const n = Math.max(cfg.minItems, 2);
    const items = await Promise.all(Array.from({ length: n + 1 }, () => boxProduct({ custom: true, price: 10, stock: 30 })));
    const c = await customer();
    expectStatus(await post('/cart/custom-box', { items: items.map((p) => ({ productId: p.id, quantity: 1 })), monthly: true }, c.token), '2xx');
    const o = await pay(c.token, expectStatus(await checkout(c.token), '2xx').id);
    const sub = o.subscription!;
    assert.ok(sub.customBoxId, 'the plan holds the box');
    assert.equal(sub.status, 'ACTIVE');
    const box = await prisma.customBox.findUniqueOrThrow({ where: { id: sub.customBoxId! }, include: { items: true } });
    assert.equal(box.items.length, n + 1);

    // A price rise and one product taken off the builder.
    await prisma.product.update({ where: { id: items[0].id }, data: { price: 12 } });
    expectStatus(await del(`/admin/products/${items[1].id}`, a), '2xx');
    await dueSoon(sub.id);
    await createDueRenewals(prisma as any, await email());
    const r = await prisma.order.findFirstOrThrow({ where: { subscriptionId: sub.id, type: 'RENEWAL' } });
    const unit = (p: number) => money(p * (1 - cfg.monthlyDiscount / 100));
    assert.equal(money(r.total), money(unit(12) + unit(10) * (n - 1) + cfg.packingFee), 'today’s prices, removed one left out');

    // The month's packing list leaves the removed product out too.
    const now = new Date(Date.now() + 4 * 3600_000);
    const [y, m] = [now.getUTCFullYear(), now.getUTCMonth() + 1];
    expectStatus(await post('/admin/box-shipments/add-due', { year: y, month: m }, a), '2xx');
    const month = expectStatus(await get(`/admin/box-shipments?year=${y}&month=${m}`, a), 200);
    const mine = month.items.find((i: any) => i.subscriptionId === sub.id);
    assert.ok(mine, 'listed this month');
    const packed = (mine.ownBox ?? []).map((x: any) => x.productId ?? x.id ?? x.name);
    assert.ok(!(mine.ownBox ?? []).some((x: any) => x.name === items[1].name), `removed product not packed: ${JSON.stringify(packed)}`);
    // Packing takes stock only for what goes in.
    expectStatus(await patch('/admin/box-shipments/status', { ids: [mine.id], status: 'PACKED' }, a), '2xx');
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { productId: items[1].id } })).quantity, 30, 'removed product not taken');
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { productId: items[0].id } })).quantity, 29, 'a monthly box takes stock when packed, not when paid');
  });

  test('monthly: too few products left to make a box — no renewal is charged, the customer is told', async () => {
    const a = await admin();
    const { customBox: cfg } = await shopSettings(prisma as any);
    const items = await Promise.all(Array.from({ length: cfg.minItems }, () => boxProduct({ custom: true })));
    const c = await customer();
    expectStatus(await post('/cart/custom-box', { items: items.map((p) => ({ productId: p.id, quantity: 1 })), monthly: true }, c.token), '2xx');
    const sub = (await pay(c.token, expectStatus(await checkout(c.token), '2xx').id)).subscription!;
    expectStatus(await del(`/admin/products/${items[0].id}`, a), '2xx');
    await dueSoon(sub.id);
    await createDueRenewals(prisma as any, await email());
    assert.equal(await prisma.order.count({ where: { subscriptionId: sub.id, type: 'RENEWAL' } }), 0);
    assert.ok(await prisma.notification.count({ where: { userId: c.id } }) >= 1 || (await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub.id } })).autoRenewal === false, 'told, or renewal switched off');
  });
});

describe('carrying a plan on', () => {
  test('renewal paid: one more term and box in the database, and next month’s box is listed', async () => {
    const a = await admin();
    const t = await boxType(), p = await plan(t.id, { price: 30 });
    const c = await customer();
    const sub0 = (await buyPlan(c.token, p.id)).subscription!;
    const end = (await dueSoon(sub0.id)).endDate!;
    await createDueRenewals(prisma as any, await email());
    const r = await prisma.order.findFirstOrThrow({ where: { subscriptionId: sub0.id, type: 'RENEWAL' }, include: { items: true } });
    assert.deepEqual([r.status, money(r.total), r.userId, r.items.length, r.items[0].subscriptionPlanId], ['PENDING', 30, c.id, 1, p.id]);
    await pay(c.token, r.id);
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub0.id } });
    assert.equal(s.boxesTotal, 2);
    assert.ok(s.endDate!.getTime() > end.getTime() + 27 * DAY);
    assert.equal(s.nextRenewalAt!.getTime(), s.endDate!.getTime());
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: r.id } })).status, 'PAID');
    // Box 1 sent; next month box 2 of 2 is listed.
    const now = new Date(Date.now() + 4 * 3600_000);
    const [y, m] = [now.getUTCFullYear(), now.getUTCMonth() + 1];
    expectStatus(await post('/admin/box-shipments/add-due', { year: y, month: m }, a), '2xx');
    const first = await prisma.boxShipment.findFirstOrThrow({ where: { subscriptionId: s.id, year: y, month: m } });
    assert.equal(first.boxNumber, 1);
    expectStatus(await patch('/admin/box-shipments/status', { ids: [first.id], status: 'SHIPPED' }, a), '2xx');
    const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1];
    expectStatus(await post('/admin/box-shipments/add-due', { year: ny, month: nm }, a), '2xx');
    const second = await prisma.boxShipment.findFirstOrThrow({ where: { subscriptionId: s.id, year: ny, month: nm } });
    assert.equal(second.boxNumber, 2);
  });

  test('“extend now” paid: a term added after the current end, its boxes added', async () => {
    const t = await boxType(), p = await plan(t.id, { price: 55, durationValue: 3, boxCount: 3 });
    const c = await customer();
    const sub0 = (await buyPlan(c.token, p.id)).subscription!;
    const ext = expectStatus(await post(`/me/subscriptions/${sub0.id}/extend`, {}, c.token), '2xx');
    assert.equal(ext.total, 55);
    await pay(c.token, ext.orderId);
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub0.id } });
    assert.equal(s.boxesTotal, 6);
    const months = (s.endDate!.getFullYear() - sub0.endDate!.getFullYear()) * 12 + s.endDate!.getMonth() - sub0.endDate!.getMonth();
    assert.equal(months, 3, 'three more months after the old end');
  });

  test('renewal switched off by the customer: none made; back on: made again', async () => {
    const t = await boxType(), p = await plan(t.id);
    const c = await customer();
    const sub0 = (await buyPlan(c.token, p.id)).subscription!;
    await dueSoon(sub0.id);
    expectStatus(await patch(`/me/subscriptions/${sub0.id}/auto-renewal`, { enabled: false }, c.token), '2xx');
    let s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub0.id } });
    assert.deepEqual([s.autoRenewal, s.nextRenewalAt], [false, null]);
    await createDueRenewals(prisma as any, await email());
    assert.equal(await prisma.order.count({ where: { subscriptionId: sub0.id, type: 'RENEWAL' } }), 0);
    expectStatus(await patch(`/me/subscriptions/${sub0.id}/auto-renewal`, { enabled: true }, c.token), '2xx');
    s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub0.id } });
    assert.equal(s.nextRenewalAt!.getTime(), s.endDate!.getTime());
    await createDueRenewals(prisma as any, await email());
    assert.equal(await prisma.order.count({ where: { subscriptionId: sub0.id, type: 'RENEWAL' } }), 1);
  });

  test('switched by admin: the renewal date follows (on: the term’s end; off: none, waiting renewal withdrawn)', async () => {
    const a = await admin(), t = await boxType(), p = await plan(t.id);
    const c = await customer();
    const sub0 = (await buyPlan(c.token, p.id)).subscription!;
    await dueSoon(sub0.id);
    await createDueRenewals(prisma as any, await email());
    const r = await prisma.order.findFirstOrThrow({ where: { subscriptionId: sub0.id, type: 'RENEWAL' } });
    expectStatus(await patch(`/admin/subscriptions/${sub0.id}`, { autoRenewal: false }, a), '2xx');
    let s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub0.id } });
    assert.deepEqual([s.autoRenewal, s.nextRenewalAt], [false, null]);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: r.id } })).status, 'CANCELLED', 'the waiting renewal is withdrawn');
    expectStatus(await patch(`/admin/subscriptions/${sub0.id}`, { autoRenewal: true }, a), '2xx');
    s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub0.id } });
    assert.equal(s.autoRenewal, true);
    assert.equal(s.nextRenewalAt!.getTime(), s.endDate!.getTime(), 'it will renew again');
    await createDueRenewals(prisma as any, await email());
    assert.equal(await prisma.order.count({ where: { subscriptionId: sub0.id, type: 'RENEWAL', status: 'PENDING' } }), 1);
  });

  test('cancelled by the customer: no renewal', async () => {
    const t = await boxType(), p = await plan(t.id);
    const c = await customer();
    const sub0 = (await buyPlan(c.token, p.id)).subscription!;
    await dueSoon(sub0.id);
    expectStatus(await patch(`/me/subscriptions/${sub0.id}/cancel`, { reason: 'test' }, c.token), '2xx');
    await createDueRenewals(prisma as any, await email());
    assert.equal(await prisma.order.count({ where: { subscriptionId: sub0.id, type: 'RENEWAL' } }), 0);
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub0.id } });
    assert.ok(s.cancelledAt && !s.autoRenewal && !s.nextRenewalAt);
  });

  test('its box type turned off (not sold any more): people on it still renew, like a hidden plan', async () => {
    const t = await boxType(), p = await plan(t.id);
    const c = await customer();
    const sub0 = (await buyPlan(c.token, p.id)).subscription!;
    expectStatus(await put(`/admin/box-tiers/${t.id}`, { isActive: false }, await admin()), '2xx');
    await dueSoon(sub0.id);
    await createDueRenewals(prisma as any, await email());
    const r = await prisma.order.findFirstOrThrow({ where: { subscriptionId: sub0.id, type: 'RENEWAL' } });
    await pay(c.token, r.id);
    assert.equal((await prisma.customerSubscription.findUniqueOrThrow({ where: { id: sub0.id } })).boxesTotal, 2);
  });
});
