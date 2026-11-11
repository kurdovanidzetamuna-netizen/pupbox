import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { address, admin, customer, del, expectStatus, get, money, patch, post, prisma, put } from './harness';
import { createDueRenewals } from '../src/modules/subscriptions/renewal';
import { EmailService } from '../src/modules/email/email.service';
import { server } from './harness';

/**
 * What admin does to box types and plans after customers have them: price
 * changes, turning a plan or a whole box type off, hiding it; the month's
 * box contents by dog size; and what admin can't save.
 */

const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

async function boxType(o: Record<string, unknown> = {}) {
  const s = stamp();
  return expectStatus(await post('/admin/box-tiers', { name: `Setup ${s}`, slug: `setup-${s}`, itemCount: 5, isActive: true, ...o }, await admin()), '2xx', 'box type');
}
async function plan(tierId: string | null, o: Record<string, unknown> = {}) {
  const s = stamp();
  return expectStatus(await post('/admin/subscription-plans', {
    name: `Setup plan ${s}`, slug: `setup-plan-${s}`, durationValue: 1, durationUnit: 'MONTH', boxCount: 1, price: 40,
    deliveryIncluded: true, autoRenewal: true, giftable: true, isActive: true, listed: true, tierId, benefits: ['Free delivery'], ...o,
  }, await admin()), '2xx', 'plan');
}
const order = (token: string) => post('/checkout/order', { deliveryMethodId: 'delivery-standard', ...address, autoRenewal: true }, token);
async function buy(token: string, planId: string) {
  expectStatus(await post('/cart/items', { subscriptionPlanId: planId }, token), '2xx', 'add plan');
  const o = expectStatus(await order(token), '2xx', 'order');
  expectStatus(await post(`/payments/initiate/${o.id}`, {}, token), '2xx', 'pay');
  return prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { subscription: true, items: true } });
}
const onSite = async (planId: string) => (expectStatus(await get('/box-tiers'), 200) as any[]).some((t) => t.plans.some((p: any) => p.id === planId));

describe('a new box type, start to finish', () => {
  test('made in admin, shown on the site, bought; admin sees the subscriber', async () => {
    const t = await boxType();
    const p = await plan(t.id, { price: 33.5 });
    assert.ok(await onSite(p.id), 'on the prices page');
    const c = await customer();
    const o = await buy(c.token, p.id);
    assert.equal(o.status, 'PAID');
    assert.equal(money(o.total), 33.5, 'delivery included');
    assert.equal(o.subscription?.planId, p.id);
    const tiers = expectStatus(await get('/admin/box-tiers', await admin()), 200) as any[];
    assert.equal(tiers.find((x) => x.id === t.id).subscribers, 1);
    // The plan list brings each plan's order count in the one request.
    const plans = expectStatus(await get('/admin/subscription-plans', await admin()), 200) as any[];
    assert.equal(plans.find((x) => x.id === p.id).orderCount, 1);
  });
});

describe('changing a plan after people have it', () => {
  test('a new price: baskets pay it; current subscribers renew at it', async () => {
    const t = await boxType(), p = await plan(t.id, { price: 40 });
    const early = await customer();
    const first = await buy(early.token, p.id);

    const waiting = await customer();
    expectStatus(await post('/cart/items', { subscriptionPlanId: p.id }, waiting.token), '2xx');
    expectStatus(await put(`/admin/subscription-plans/${p.id}`, { price: 45 }, await admin()), '2xx');
    const o = expectStatus(await order(waiting.token), '2xx');
    assert.equal(money(o.total), 45, 'the basket pays today’s price');

    // The bought term keeps what was paid; the next one is at the new price.
    assert.equal(money(first.total), 40);
    await prisma.customerSubscription.update({ where: { id: first.subscriptionId! }, data: { nextRenewalAt: new Date(Date.now() + 86400_000) } });
    await createDueRenewals(prisma as any, (await server()).app.get(EmailService));
    const renewal = await prisma.order.findFirstOrThrow({ where: { subscriptionId: first.subscriptionId!, type: 'RENEWAL' } });
    assert.equal(money(renewal.total), 45);
  });

  test('turned off after it went in a basket: it can’t be bought', async () => {
    const t = await boxType(), p = await plan(t.id);
    const c = await customer();
    expectStatus(await post('/cart/items', { subscriptionPlanId: p.id }, c.token), '2xx');
    expectStatus(await put(`/admin/subscription-plans/${p.id}`, { isActive: false }, await admin()), '2xx');
    assert.equal(await onSite(p.id), false);
    const r = await order(c.token);
    assert.equal(r.status, 400, `checkout: ${r.status}`);
  });

  test('hidden from the site: not bought new, current subscribers still renew', async () => {
    const t = await boxType(), p = await plan(t.id);
    const before = await customer();
    const first = await buy(before.token, p.id);
    const c = await customer();
    expectStatus(await post('/cart/items', { subscriptionPlanId: p.id }, c.token), '2xx');
    expectStatus(await put(`/admin/subscription-plans/${p.id}`, { listed: false }, await admin()), '2xx');
    assert.equal(await onSite(p.id), false);
    assert.equal((await order(c.token)).status, 400, 'checkout refuses a hidden plan');
    const other = await customer();
    assert.equal((await post('/cart/items', { subscriptionPlanId: p.id }, other.token)).status, 404, 'can’t be added');

    await prisma.customerSubscription.update({ where: { id: first.subscriptionId! }, data: { nextRenewalAt: new Date(Date.now() + 86400_000) } });
    await createDueRenewals(prisma as any, (await server()).app.get(EmailService));
    assert.ok(await prisma.order.findFirst({ where: { subscriptionId: first.subscriptionId!, type: 'RENEWAL' } }), 'still renews');
  });

  test('a whole box type turned off: its plans leave the site and can’t be bought', async () => {
    const t = await boxType(), p = await plan(t.id);
    const c = await customer();
    expectStatus(await post('/cart/items', { subscriptionPlanId: p.id }, c.token), '2xx');
    expectStatus(await put(`/admin/box-tiers/${t.id}`, { isActive: false }, await admin()), '2xx');
    assert.equal(await onSite(p.id), false, 'not on the prices page');
    const listed = expectStatus(await get('/subscription-plans'), 200) as any[];
    assert.ok(!listed.some((x) => x.id === p.id), 'not in the public plan list');
    assert.equal((await order(c.token)).status, 400, 'checkout refuses it');
    const other = await customer();
    assert.equal((await post('/cart/items', { subscriptionPlanId: p.id }, other.token)).status, 404, 'can’t be added');
  });
});

describe('the month’s box contents', () => {
  test('each subscriber gets the list for their dog’s size, else the all-sizes one; switched-off months don’t count', async () => {
    const a = await admin();
    const [y, m] = [2031, 3]; // a month no other test uses
    const prod = async (name: string) => prisma.product.create({ data: { name, slug: `pk-${stamp()}`, sku: `PK-${stamp()}`, price: 5, status: 'ACTIVE', includedInBox: true, standaloneSale: false } });
    const [chew, toy, old] = [await prod('Chew'), await prod('Toy'), await prod('Old')];
    const all = expectStatus(await post('/box-campaigns', { name: 'All sizes', month: m, year: y, dogSize: null }, a), '2xx');
    const small = expectStatus(await post('/box-campaigns', { name: 'Small dogs', month: m, year: y, dogSize: 'SMALL' }, a), '2xx');
    const off = expectStatus(await post('/box-campaigns', { name: 'Off', month: m, year: y, dogSize: 'LARGE' }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${all.id}/products`, { items: [{ productId: chew.id, quantity: 1 }] }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${small.id}/products`, { items: [{ productId: toy.id, quantity: 2 }] }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${off.id}/products`, { items: [{ productId: old.id, quantity: 1 }] }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${off.id}`, { isActive: false }, a), '2xx');

    const t = await boxType(), p = await plan(t.id);
    const subWith = async (size: string) => {
      const c = await customer();
      const o = await buy(c.token, p.id);
      const dog = await prisma.dog.create({ data: { userId: c.id, name: `Dog ${size}`, size: size as any } });
      await prisma.customerSubscription.update({ where: { id: o.subscriptionId! }, data: { dogId: dog.id } });
      return o.subscriptionId!;
    };
    const [s, l] = [await subWith('SMALL'), await subWith('LARGE')];
    const list = expectStatus(await get(`/box-campaigns/packing-list?year=${y}&month=${m}`, a), 200) as any[];
    const row = (id: string) => list.find((r) => r.subscriptionId === id);
    assert.deepEqual(row(s).products.map((x: any) => [x.name, x.quantity]), [['Toy', 2]]);
    assert.equal(row(l).campaign, 'All sizes', 'the switched-off Large list is skipped');
    assert.deepEqual(row(l).products.map((x: any) => [x.name, x.quantity]), [['Chew', 1]]);

    // Deleting a month takes its list away.
    expectStatus(await del(`/box-campaigns/${small.id}`, a), '2xx');
    const after = expectStatus(await get(`/box-campaigns/packing-list?year=${y}&month=${m}`, a), 200) as any[];
    assert.equal(after.find((r) => r.subscriptionId === s).campaign, 'All sizes');
  });
});

describe('packing the month’s boxes (This month’s boxes)', () => {
  test('listed by dog size, a later month list picked up, packing takes stock, shipping counts the box', async () => {
    const a = await admin();
    const [year, month] = [2032, 5]; // a month no other test uses
    const prod = async (name: string, stock: number) => prisma.product.create({ data: { name, slug: `sh-${stamp()}`, sku: `SH-${stamp()}`, price: 5, status: 'ACTIVE', includedInBox: true, standaloneSale: false, inventory: { create: { quantity: stock } } } });
    const [treat, toy, big] = [await prod('Treat', 10), await prod('Toy', 10), await prod('Big bone', 10)];
    const all = expectStatus(await post('/box-campaigns', { name: 'All sizes', month, year, dogSize: null }, a), '2xx');
    const small = expectStatus(await post('/box-campaigns', { name: 'Small dogs', month, year, dogSize: 'SMALL' }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${all.id}/products`, { items: [{ productId: treat.id, quantity: 1 }] }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${small.id}/products`, { items: [{ productId: toy.id, quantity: 2 }] }, a), '2xx');

    const t = await boxType(), p = await plan(t.id);
    const subWith = async (size: string) => {
      const c = await customer();
      const o = await buy(c.token, p.id);
      const dog = await prisma.dog.create({ data: { userId: c.id, name: `Dog ${size}`, size: size as any } });
      await prisma.customerSubscription.update({ where: { id: o.subscriptionId! }, data: { dogId: dog.id } });
      return o.subscriptionId!;
    };
    const [s, l] = [await subWith('SMALL'), await subWith('LARGE')];
    const box = (subId: string) => prisma.boxShipment.findFirstOrThrow({ where: { subscriptionId: subId, year, month } });

    expectStatus(await post('/admin/box-shipments/add-due', { year, month }, a), '2xx');
    expectStatus(await post('/admin/box-shipments/add-due', { year, month }, a), '2xx');
    assert.equal(await prisma.boxShipment.count({ where: { subscriptionId: { in: [s, l] }, year, month } }), 2, 'one box each, even pressed twice');
    assert.equal((await box(s)).campaignId, small.id);
    assert.equal((await box(l)).campaignId, all.id);

    // A list for large dogs made afterwards: "refresh" moves the large dog's box to it.
    const large = expectStatus(await post('/box-campaigns', { name: 'Large dogs', month, year, dogSize: 'LARGE' }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${large.id}/products`, { items: [{ productId: big.id, quantity: 1 }] }, a), '2xx');
    expectStatus(await post('/admin/box-shipments/refresh-campaigns', { year, month }, a), '2xx');
    assert.equal((await box(l)).campaignId, large.id);
    const page = expectStatus(await get(`/admin/box-shipments?year=${year}&month=${month}`, a), 200);
    assert.ok(page.items.some((i: any) => i.subscriptionId === s), 'on the page');

    const stock = async (id: string) => (await prisma.inventory.findUniqueOrThrow({ where: { productId: id } })).quantity;
    const sent = async (id: string) => (await prisma.customerSubscription.findUniqueOrThrow({ where: { id } })).boxesDelivered;
    const small1 = await box(s);
    expectStatus(await patch('/admin/box-shipments/status', { ids: [small1.id], status: 'PACKED' }, a), '2xx');
    assert.equal(await stock(toy.id), 8, 'packing takes 2 toys');
    assert.equal(await sent(s), 0);
    expectStatus(await patch('/admin/box-shipments/status', { ids: [small1.id], status: 'SHIPPED', trackingNumber: 'TRK1' }, a), '2xx');
    assert.equal(await stock(toy.id), 8, 'not taken twice');
    assert.equal(await sent(s), 1, 'shipping counts the box');
    assert.equal((await box(s)).trackingNumber, 'TRK1');

    const large1 = await box(l);
    expectStatus(await patch('/admin/box-shipments/status', { ids: [large1.id], status: 'PACKED' }, a), '2xx');
    assert.equal(await stock(big.id), 9);
    expectStatus(await patch('/admin/box-shipments/status', { ids: [large1.id], status: 'CANCELLED' }, a), '2xx');
    assert.equal(await stock(big.id), 10, 'a cancelled box puts its products back');
    assert.equal(await sent(l), 0);
    // Packed with the small-dog list: that list is now fixed.
    assert.equal((await put(`/box-campaigns/${small.id}/products`, { items: [{ productId: treat.id, quantity: 1 }] }, a)).status, 400, 'can’t change a list already packed');
    assert.equal((await del(`/box-campaigns/${small.id}`, a)).status, 400, 'can’t delete a list already packed');
    expectStatus(await put(`/box-campaigns/${large.id}/products`, { items: [{ productId: big.id, quantity: 2 }] }, a), '2xx', 'its box was put back, so it can change');
    // A shipped box can't jump back to "to pack".
    const r = expectStatus(await patch('/admin/box-shipments/status', { ids: [small1.id], status: 'TO_PACK' }, a), '2xx');
    assert.equal(r.updated, 0);
  });

  test('a plan’s order follows its box: packed, shipped (with tracking), delivered — with no second message', async () => {
    const a = await admin(), [year, month] = [2032, 6];
    const c = await customer(), o = await buy(c.token, (await plan((await boxType()).id)).id);
    expectStatus(await post('/admin/box-shipments/add-due', { year, month }, a), '2xx');
    const b = await prisma.boxShipment.findFirstOrThrow({ where: { subscriptionId: o.subscriptionId!, year, month } });
    const now = async () => prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    const move = async (status: string, trackingNumber?: string) => expectStatus(await patch('/admin/box-shipments/status', { ids: [b.id], status, trackingNumber }, a), '2xx');
    assert.equal((await now()).status, 'PAID', 'listed only: still to pack');
    await move('PACKED'); assert.equal((await now()).status, 'PACKED');
    await move('SHIPPED', 'TRK9');
    let x = await now(); assert.equal(x.status, 'SHIPPED'); assert.equal(x.trackingNumber, 'TRK9'); assert.ok(x.shippedAt);
    await move('DELIVERED');
    x = await now(); assert.equal(x.status, 'DELIVERED'); assert.ok(x.deliveredAt);
    const kinds = (await prisma.notification.findMany({ where: { userId: c.id } })).map((n) => n.type);
    assert.ok(!kinds.some((k) => /^ORDER_(SHIPPED|DELIVERED)/.test(k)), `only the box messages: ${kinds}`);
  });

  test('a 3-box order: shipped with its first box, delivered with its last', async () => {
    const a = await admin(), c = await customer();
    const o = await buy(c.token, (await plan((await boxType()).id, { durationValue: 3, boxCount: 3, price: 105 })).id);
    const status = async () => (await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status;
    for (const [i, month] of [7, 8, 9].entries()) {
      expectStatus(await post('/admin/box-shipments/add-due', { year: 2032, month }, a), '2xx');
      const b = await prisma.boxShipment.findFirstOrThrow({ where: { subscriptionId: o.subscriptionId!, year: 2032, month } });
      assert.equal(b.boxNumber, i + 1);
      expectStatus(await patch('/admin/box-shipments/status', { ids: [b.id], status: 'SHIPPED' }, a), '2xx');
      expectStatus(await patch('/admin/box-shipments/status', { ids: [b.id], status: 'DELIVERED' }, a), '2xx');
      assert.equal(await status(), i < 2 ? 'SHIPPED' : 'DELIVERED', `after box ${i + 1}`);
    }
  });

  test('a packed box of a plan cancelled by admin: the box is cancelled and its products go back', async () => {
    const a = await admin(), [year, month] = [2032, 10];
    const chew = await prisma.product.create({ data: { name: 'Chew', slug: `sh-${stamp()}`, sku: `SH-${stamp()}`, price: 5, status: 'ACTIVE', includedInBox: true, standaloneSale: false, inventory: { create: { quantity: 10 } } } });
    const list = expectStatus(await post('/box-campaigns', { name: 'All sizes', month, year, dogSize: null }, a), '2xx');
    expectStatus(await put(`/box-campaigns/${list.id}/products`, { items: [{ productId: chew.id, quantity: 2 }] }, a), '2xx');
    const c = await customer(), o = await buy(c.token, (await plan((await boxType()).id)).id);
    expectStatus(await post('/admin/box-shipments/add-due', { year, month }, a), '2xx');
    const b = await prisma.boxShipment.findFirstOrThrow({ where: { subscriptionId: o.subscriptionId!, year, month } });
    expectStatus(await patch('/admin/box-shipments/status', { ids: [b.id], status: 'PACKED' }, a), '2xx');
    const shelf = async () => (await prisma.inventory.findUniqueOrThrow({ where: { productId: chew.id } })).quantity;
    assert.equal(await shelf(), 8);
    expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: 'CANCELLED' }, a), '2xx', 'cancel the plan order');
    assert.equal((await prisma.boxShipment.findUniqueOrThrow({ where: { id: b.id } })).status, 'CANCELLED');
    assert.equal(await shelf(), 10, 'the packed chews are back on the shelf');
  });
});

describe('what admin can’t save', () => {
  test('box types: a name, a web name, at least one item, budget in order, no twins; one with plans can’t go', async () => {
    const a = await admin(), s = stamp();
    const bad = async (body: Record<string, unknown>) => (await post('/admin/box-tiers', { name: 'X', slug: `x-${stamp()}`, itemCount: 5, ...body }, a)).status;
    assert.equal(await bad({ name: undefined }), 400);
    assert.equal(await bad({ slug: 'Has Spaces' }), 400);
    assert.equal(await bad({ itemCount: 0 }), 400);
    assert.equal(await bad({ budgetMin: -1 }), 400);
    assert.equal(await bad({ budgetMin: 50, budgetMax: 20 }), 400);
    expectStatus(await post('/admin/box-tiers', { name: 'Twin', slug: `twin-${s}`, itemCount: 5 }, a), '2xx');
    assert.equal(await bad({ slug: `twin-${s}` }), 409);
    const t = await boxType(); await plan(t.id);
    assert.equal((await del(`/admin/box-tiers/${t.id}`, a)).status, 400);
  });

  test('plans: a price above 0, a sensible discount, a known box type, no twins', async () => {
    const a = await admin(), t = await boxType();
    const base = () => ({ name: 'P', slug: `p-${stamp()}`, durationValue: 1, durationUnit: 'MONTH', boxCount: 1, price: 10, tierId: t.id });
    const bad = async (body: Record<string, unknown>) => (await post('/admin/subscription-plans', { ...base(), ...body }, a)).status;
    assert.equal(await bad({ price: 0 }), 400, 'free plan');
    assert.equal(await bad({ price: -5 }), 400);
    assert.equal(await bad({ discountPercent: 120 }), 400);
    assert.equal(await bad({ discountPercent: -10 }), 400);
    assert.equal(await bad({ durationValue: 0 }), 400);
    assert.equal(await bad({ boxCount: 0 }), 400);
    assert.equal(await bad({ slug: 'Not A Slug' }), 400);
    assert.equal(await bad({ tierId: 'nope' }), 404);
    const p = await plan(t.id);
    assert.equal(await bad({ slug: p.slug }), 409);
    assert.equal((await put(`/admin/subscription-plans/${p.id}`, { price: 0 }, a)).status, 400, 'edited to free');
  });
});
