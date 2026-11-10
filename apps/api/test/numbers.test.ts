import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { admin, buy, customer, expectStatus, get, money, post, prisma, product } from './harness';
import { tbilisiDay } from '../src/common/tbilisi';

/**
 * Dashboard, Reports, Orders and Customers show the same money and the same
 * counts for the same days (common/ledger.ts). A new order and a refund must
 * move every screen by exactly the same amount.
 */

const plan = async (slug: string) => prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug } });

async function screens() {
  const t = await admin(), day = tbilisiDay();
  const [d, r, o, c] = await Promise.all([
    get(`/analytics/overview?range=${day}~${day}`, t),
    get(`/reports/insights?from=${day}&to=${day}`, t),
    get(`/orders/admin?limit=1&dateFrom=${day}&dateTo=${day}`, t),
    get(`/admin/customers?limit=5&joinedFrom=${day}&joinedTo=${day}`, t),
  ]).then((all) => all.map((x) => expectStatus(x, '2xx')));
  return {
    in: { dashboard: d.combined.collected, reports: r.kpi.collected, orders: o.summary.collected },
    refunded: { dashboard: d.combined.refunded, reports: r.kpi.refunded, orders: o.summary.refunded },
    net: { dashboard: d.combined.revenue, reports: r.kpi.net, orders: o.summary.paidRevenue, parts: money(d.subscription.revenue + d.ecommerce.revenue) },
    paid: { dashboard: d.combined.paidOrders, reports: r.kpi.orders },
    placed: { dashboard: d.combined.orders, reports: Object.values(r.ordersByStatus as Record<string, number>).reduce((a, b) => a + b, 0), orders: o.summary.totalOrders },
    customers: { dashboard: d.users.new, reports: r.kpi.newCustomers, customers: c.total },
  };
}

/** Every screen agrees, and returns that one value per figure. */
function agreed(s: Awaited<ReturnType<typeof screens>>) {
  return Object.fromEntries(Object.entries(s).map(([k, v]) => {
    const values = Object.values(v).map(money);
    assert.ok(values.every((x) => x === values[0]), `${k}: ${JSON.stringify(v)}`);
    return [k, values[0]];
  })) as Record<keyof typeof s, number>;
}

describe('the same numbers on every admin screen', () => {
  test('a paid order and a refund move Dashboard, Reports, Orders and Customers alike', async () => {
    const before = agreed(await screens());

    const c = await customer();
    const p = await product({ price: 20, stock: 10 });
    const o = await buy(c.token, [{ subscriptionPlanId: (await plan('1-month')).id }, { productId: p.id, quantity: 2 }]);
    expectStatus(await post(`/orders/admin/${o.id}/refunds`, { mode: 'AMOUNT', amount: 7.5 }, await admin()), '2xx');

    const after = agreed(await screens());
    assert.equal(money(after.in - before.in), money(o.total), 'money in');
    assert.equal(money(after.refunded - before.refunded), 7.5, 'refunds');
    assert.equal(money(after.net - before.net), money(Number(o.total) - 7.5), 'revenue');
    assert.equal(after.paid - before.paid, 1, 'paid orders');
    assert.equal(after.placed - before.placed, 1, 'orders placed');
    assert.equal(after.customers - before.customers, 1, 'new customers');
  });

  test('a period of picked days: whole Tbilisi days, compared with as many days before', async () => {
    const t = await admin();
    const d = expectStatus(await get('/analytics/overview?range=2026-10-01~2026-10-31', t), '2xx');
    assert.equal(d.from, '2026-09-30T20:00:00.000Z');
    assert.equal(d.to, '2026-10-31T19:59:59.999Z');
    assert.equal(d.comparedTo.from, '2026-08-30T20:00:00.000Z');
  });
});
