import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { admin, buy, coupon, customer, expectStatus, get, post, prisma, product } from './harness';
import { tbilisiDay } from '../src/common/tbilisi';
import { daysBetween, tbilisiDay as sharedDay, tbilisiEnd, tbilisiMonth, tbilisiStart } from '../../../packages/content/src/tbilisi';

/**
 * The shop runs on Tbilisi time (UTC+4): between midnight and 4am there it is
 * still yesterday in UTC, which is when the server's own clock used to be
 * wrong. Every case here falls in those hours.
 */

describe('Tbilisi time', () => {
  test('the day a moment falls on is Tbilisi’s, on the server and on the site', () => {
    const lateNight = new Date('2026-10-31T21:30:00Z'); // 1 November, 01:30 in Tbilisi
    assert.equal(tbilisiDay(lateNight), '2026-11-01');
    assert.equal(sharedDay(lateNight), '2026-11-01');
    assert.equal(sharedDay(lateNight, 30), '2026-12-01');
    assert.equal(sharedDay('2026-11-01T19:59:59Z'), '2026-11-01');
    assert.equal(sharedDay('2026-11-01T20:00:00Z'), '2026-11-02');
    assert.equal(new Date(tbilisiStart('2026-11-01')).toISOString(), '2026-10-31T20:00:00.000Z');
    assert.equal(new Date(tbilisiEnd('2026-11-30')).toISOString(), '2026-11-30T19:59:59.000Z');
    const m = tbilisiMonth();
    assert.equal(m.first, `${sharedDay().slice(0, 8)}01`);
    assert.ok(m.last >= sharedDay() && m.last.slice(0, 7) === m.first.slice(0, 7));
    assert.equal(tbilisiMonth(-1).last, sharedDay(m.first, -1));
    assert.equal(daysBetween('2026-10-31', '2026-11-01'), 1, 'yesterday');
    assert.equal(daysBetween(sharedDay(lateNight), '2026-11-01'), 0, '1:30am is today, not yesterday');
    assert.equal(daysBetween('2026-12-31', '2027-03-01'), 60);
  });

  test('the server itself runs on Tbilisi time', () => {
    assert.equal(process.env.TZ, 'Asia/Tbilisi');
    assert.equal(new Date('2026-10-31T21:30:00Z').getDate(), 1);
  });

  test('an order placed at 1am belongs to that day in the admin order filter', async () => {
    const a = await admin();
    const c = await customer();
    const p = await product({ price: 10 });
    const order = await buy(c.token, [{ productId: p.id }]);
    await prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date('2026-10-31T21:30:00Z') } });
    const ids = async (from: string, to: string) =>
      expectStatus(await get(`/orders/admin?dateFrom=${from}&dateTo=${to}&limit=100`, a), 200).orders.map((o: any) => o.id);
    assert.ok((await ids('2026-11-01', '2026-11-01')).includes(order.id), 'on 1 November');
    assert.ok(!(await ids('2026-10-31', '2026-10-31')).includes(order.id), 'not on 31 October');
  });

  test('a promo code works through its last Tbilisi day and not after', async () => {
    const c = await customer();
    const p = await product({ price: 20 });
    const yesterday = sharedDay(Date.now(), -1), today = sharedDay();
    const ended = await coupon({ expiresAt: new Date(tbilisiEnd(yesterday)) });
    const lastDay = await coupon({ expiresAt: new Date(tbilisiEnd(today)) });
    expectStatus(await post('/cart/items', { productId: p.id }, c.token), '2xx');
    assert.equal((await post('/cart/coupon', { code: ended.code }, c.token)).status, 400, 'ended yesterday');
    expectStatus(await post('/cart/coupon', { code: lastDay.code }, c.token), '2xx', 'still works on its last day');
  });
});
