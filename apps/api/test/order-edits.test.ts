import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { address, admin, buy, coupon, customer, expectStatus, money, patch, post, prisma, product } from './harness';

/** Admin changes an order that hasn't left: stock and money follow. */

const stock = async (productId: string) => prisma.inventory.findUniqueOrThrow({ where: { productId } });
const edit = async (id: string, body: Record<string, unknown>) => patch(`/orders/admin/${id}`, body, await admin());

async function unpaid(lines: { productId: string; quantity: number }[]) {
  const c = await customer();
  for (const l of lines) await post('/cart/items', l, c.token);
  const o = expectStatus(await post('/checkout/order', { deliveryMethodId: 'delivery-standard', ...address }, c.token), '2xx');
  return { c, o: await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { items: true } }) };
}

describe('editing an unpaid order', () => {
  test('more, fewer, added, removed: lines, held stock and the amount to pay', async () => {
    const [a, b, n] = [await product({ price: 10, stock: 10 }), await product({ price: 5, stock: 10 }), await product({ price: 7, stock: 10 })];
    const { o } = await unpaid([{ productId: a.id, quantity: 2 }, { productId: b.id, quantity: 1 }]);
    const la = o.items.find((i) => i.productId === a.id)!, lb = o.items.find((i) => i.productId === b.id)!;
    const r = expectStatus(await edit(o.id, { items: [{ id: la.id, quantity: 3 }, { id: lb.id, quantity: 0 }, { productId: n.id, quantity: 2 }], reason: 'phoned in' }), 200);
    assert.equal(r.changes.length, 3);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { items: true } });
    assert.deepEqual(after.items.map((i) => [i.productId, i.quantity]).sort(), [[a.id, 3], [n.id, 2]].sort());
    assert.equal(money(after.subtotal), 44);
    assert.equal(money(after.total), 49.99);
    assert.equal((await stock(a.id)).reservedQty, 3);
    assert.equal((await stock(b.id)).reservedQty, 0);
    assert.equal((await stock(n.id)).reservedQty, 2);
    assert.match(after.internalNotes ?? '', /Edited by admin .* phoned in/);
  });

  test('nothing left is refused; more than in stock is refused and nothing changes', async () => {
    const a = await product({ price: 10, stock: 3 });
    const { o } = await unpaid([{ productId: a.id, quantity: 2 }]);
    assert.match((await edit(o.id, { items: [{ id: o.items[0].id, quantity: 0 }] })).body.message, /at least one item/);
    assert.equal((await edit(o.id, { items: [{ id: o.items[0].id, quantity: 5 }] })).status, 400);
    assert.equal((await prisma.orderItem.findUniqueOrThrow({ where: { id: o.items[0].id } })).quantity, 2);
    assert.equal((await stock(a.id)).reservedQty, 2);
  });

  test('a code is priced again on what is left', async () => {
    const a = await product({ price: 20, stock: 10 });
    const c = await customer();
    await post('/cart/items', { productId: a.id, quantity: 3 }, c.token);
    await post('/cart/coupon', { code: (await coupon({ discountValue: 10, scopes: ['SHOP'] })).code }, c.token);
    const o = expectStatus(await post('/checkout/order', { deliveryMethodId: 'delivery-standard', ...address }, c.token), '2xx');
    assert.equal(money(o.total), 54, '60 − 6, free delivery from 60');
    const line = (await prisma.orderItem.findFirstOrThrow({ where: { orderId: o.id } })).id;
    expectStatus(await edit(o.id, { items: [{ id: line, quantity: 1 }] }), 200);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(money(after.discountAmount), 2);
    assert.equal(money(after.total), 18, 'delivery stays what was agreed at checkout');
  });
});

describe('editing a paid order', () => {
  test('fewer: refund due, stock back on the shelf', async () => {
    const c = await customer();
    const a = await product({ price: 10, stock: 10 });
    const o = await buy(c.token, [{ productId: a.id, quantity: 3 }]);
    assert.equal((await stock(a.id)).quantity, 7);
    expectStatus(await edit(o.id, { items: [{ id: o.items[0].id, quantity: 1 }] }), 200);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(money(after.total), 15.99);
    assert.equal(money(after.refundDueAmount), 20);
    assert.equal((await stock(a.id)).quantity, 9);
  });

  test('more: a separate order the customer pays by link', async () => {
    const c = await customer();
    const a = await product({ price: 10, stock: 10 });
    const o = await buy(c.token, [{ productId: a.id, quantity: 1 }]);
    const r = expectStatus(await edit(o.id, { items: [{ id: o.items[0].id, quantity: 2 }] }), 200);
    assert.ok(r.changes.some((x: string) => /extra payment of ₾10\.00/.test(x)));
    const extra = await prisma.order.findFirstOrThrow({ where: { parentOrderId: o.id }, include: { items: true } });
    assert.equal(extra.status, 'PENDING');
    assert.equal(money(extra.total), 10);
    assert.equal(extra.items[0].quantity, 1);
    assert.equal((await stock(a.id)).reservedQty, 1, 'held for the extra payment');
    assert.equal(money((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).total), 15.99, 'the paid order is unchanged');
  });

  test('a new address for the order and the plan', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ subscriptionPlanId: (await prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug: '1-month' } })).id }]);
    expectStatus(await edit(o.id, { address: { ...address, city: 'Batumi', addressLine1: '2 Sea street' }, newAddress: true, addressForPlan: true }), 200);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { address: true, subscription: { include: { address: true } } } });
    assert.equal(after.address?.city, 'Batumi');
    assert.equal(after.subscription?.address?.city, 'Batumi');
    assert.equal(await prisma.address.count({ where: { userId: c.id } }), 2, 'added to the customer’s book');
  });

  test('a shipped order can’t be edited', async () => {
    const c = await customer();
    const o = await buy(c.token, [{ productId: (await product({ price: 10 })).id }]);
    expectStatus(await patch(`/orders/admin/${o.id}/status`, { status: 'SHIPPED' }, await admin()), 200);
    assert.match((await edit(o.id, { items: [{ id: o.items[0].id, quantity: 0 }] })).body.message, /can't be edited/);
  });
});
