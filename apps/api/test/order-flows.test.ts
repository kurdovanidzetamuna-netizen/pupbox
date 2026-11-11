import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { address, admin, customer, expectStatus, get, money, patch, post, prisma, product } from './harness';
import { tbilisiDay } from '../src/common/tbilisi';

/**
 * Admin moving orders along, cancelling and refunding them, as the order
 * window does — and what the database, Reports and the order itself say
 * afterwards. A part-refunded order is still a paid one.
 */

const plan = async (slug: string) => prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug } });
async function order(token: string, line: Record<string, unknown>, pay = true) {
  expectStatus(await post('/cart/items', line, token), '2xx', 'add');
  const o = expectStatus(await post('/checkout/order', { deliveryMethodId: 'delivery-standard', ...address, autoRenewal: true }, token), '2xx', 'order');
  if (pay) expectStatus(await post(`/payments/initiate/${o.id}`, {}, token), '2xx', 'pay');
  return prisma.order.findUniqueOrThrow({ where: { id: o.id } });
}
const status = async (id: string, to: string) => patch(`/orders/admin/${id}/status`, { status: to }, await admin());
const shelf = async (productId: string) => (await prisma.inventory.findUniqueOrThrow({ where: { productId } })).quantity;

describe('admin: cancelling and refunding', () => {
  test('part refunded, then cancelled: really cancelled, stock back, the rest owed; refunding the rest closes it', async () => {
    const a = await admin(), c = await customer();
    const p = await product({ price: 25, stock: 10 });
    const o = await order(c.token, { productId: p.id, quantity: 2 });
    expectStatus(await status(o.id, 'PROCESSING'), '2xx');
    expectStatus(await status(o.id, 'PACKED'), '2xx');
    expectStatus(await post(`/orders/admin/${o.id}/refunds`, { mode: 'AMOUNT', amount: 10 }, a), '2xx');
    assert.equal(await shelf(p.id), 8);

    const after = expectStatus(await status(o.id, 'CANCELLED'), '2xx');
    assert.equal(after.status, 'CANCELLED', 'not a pretend cancel');
    assert.equal(await shelf(p.id), 10, 'both back on the shelf');
    assert.equal(after.refundDue, true);
    assert.equal(money(after.refundDueValue), money(Number(o.total) - 10), 'owed: what is left, not the whole payment');
    const list = expectStatus(await get(`/orders/admin?limit=50&search=${o.orderNumber.slice(-8)}`, a), 200);
    assert.equal(money(list.orders[0].refundDueValue), money(Number(o.total) - 10), 'the list says the same');

    expectStatus(await post(`/orders/admin/${o.id}/refunds`, { mode: 'FULL' }, a), '2xx');
    const done = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { payments: { include: { refunds: true } } } });
    assert.equal(done.status, 'REFUNDED');
    assert.equal(done.payments[0].status, 'REFUNDED');
    assert.equal(money(done.payments[0].refunds.reduce((n, r) => n + Number(r.amount), 0)), money(o.total));
    assert.equal(await shelf(p.id), 10, 'not put back twice');
  });

  test('“refunded” on a part-refunded cancelled order pays back only what is left', async () => {
    const a = await admin(), c = await customer();
    const p = await product({ price: 30 });
    const o = await order(c.token, { productId: p.id });
    expectStatus(await post(`/orders/admin/${o.id}/refunds`, { mode: 'AMOUNT', amount: 5 }, a), '2xx');
    expectStatus(await status(o.id, 'CANCELLED'), '2xx');
    expectStatus(await status(o.id, 'REFUNDED'), '2xx');
    const refunds = await prisma.refund.findMany({ where: { payment: { orderId: o.id } } });
    assert.equal(money(refunds.reduce((n, r) => n + Number(r.amount), 0)), money(o.total), 'never more than was paid');
  });

  test('an unpaid order cancelled: stock held for it is freed', async () => {
    const c = await customer();
    const p = await product({ price: 20, stock: 5 });
    const o = await order(c.token, { productId: p.id, quantity: 2 }, false);
    assert.equal((await prisma.inventory.findUniqueOrThrow({ where: { productId: p.id } })).reservedQty, 2);
    const r = expectStatus(await status(o.id, 'CANCELLED'), '2xx');
    assert.equal(r.status, 'CANCELLED');
    const inv = await prisma.inventory.findUniqueOrThrow({ where: { productId: p.id } });
    assert.deepEqual([inv.quantity, inv.reservedQty], [5, 0]);
  });

  test('a plan order cancelled by admin: the plan ends with a date, never renews, and Reports counts it as ended', async () => {
    const a = await admin(), day = tbilisiDay();
    const before = expectStatus(await get(`/reports/insights?from=${day}&to=${day}`, a), 200).plans.ended;
    const c = await customer();
    const o = await order(c.token, { subscriptionPlanId: (await plan('1-month')).id });
    expectStatus(await status(o.id, 'CANCELLED'), '2xx');
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: o.subscriptionId! } });
    assert.equal(s.status, 'CANCELLED');
    assert.ok(s.cancelledAt, 'has a cancel date');
    assert.deepEqual([s.autoRenewal, s.nextRenewalAt], [false, null]);
    const after = expectStatus(await get(`/reports/insights?from=${day}&to=${day}`, a), 200).plans.ended;
    assert.equal(after - before, 1);
  });

  test('a plan order refunded in full by admin before its box: the same', async () => {
    const a = await admin(), c = await customer();
    const o = await order(c.token, { subscriptionPlanId: (await plan('1-month')).id });
    expectStatus(await post(`/orders/admin/${o.id}/refunds`, { mode: 'FULL' }, a), '2xx');
    const s = await prisma.customerSubscription.findUniqueOrThrow({ where: { id: o.subscriptionId! } });
    assert.equal(s.status, 'CANCELLED');
    assert.ok(s.cancelledAt);
    assert.deepEqual([s.autoRenewal, s.nextRenewalAt], [false, null]);
  });

  test('a delivered order can still be refunded; a shipped one can’t be cancelled', async () => {
    const a = await admin(), c = await customer();
    const p = await product({ price: 15 });
    const o = await order(c.token, { productId: p.id });
    for (const s of ['PROCESSING', 'PACKED', 'SHIPPED']) expectStatus(await status(o.id, s), '2xx');
    assert.equal((await status(o.id, 'CANCELLED')).status, 400);
    expectStatus(await status(o.id, 'DELIVERED'), '2xx');
    expectStatus(await post(`/orders/admin/${o.id}/refunds`, { mode: 'AMOUNT', amount: 5 }, a), '2xx');
    const d = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { payments: true } });
    assert.equal(d.payments[0].status, 'PARTIALLY_REFUNDED');
  });
});
