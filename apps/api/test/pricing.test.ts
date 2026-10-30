import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { address, coupon, customer, expectStatus, get, money, post, prisma, product } from './harness';

/**
 * The basket's delivery options, the checkout preview and the order itself
 * must show the same total for the same basket — whatever code is on it.
 */

const plan = async (slug: string) => prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug } });
const gift = { recipientName: 'Nino', dog: { name: 'Bela', size: 'SMALL' } };

async function threeTotals(token: string, deliveryMethodId: string, o: { gift?: boolean } = {}) {
  const options = expectStatus(await get(`/cart/delivery-methods${o.gift ? '?gift=true' : ''}`, token), 200);
  const shown = options.find((m: any) => m.id === deliveryMethodId);
  const preview = o.gift ? null : expectStatus(await post('/checkout/prepare', { deliveryMethodId }, token), '2xx', 'prepare').totals;
  const order = expectStatus(await post('/checkout/order', { deliveryMethodId, ...address, ...(o.gift ? { gift } : {}) }, token), '2xx', 'order');
  return { shown: { total: shown.total, discount: shown.discount }, preview: preview && { total: preview.total, discount: preview.discount }, order: { total: money(order.total), discount: money(order.discountAmount) } };
}

function same(t: Awaited<ReturnType<typeof threeTotals>>, total: number, discount: number) {
  assert.deepEqual(t.shown, { total, discount }, 'delivery options');
  if (t.preview) assert.deepEqual(t.preview, { total, discount }, 'checkout preview');
  assert.deepEqual(t.order, { total, discount }, 'order');
}

describe('one total everywhere', () => {
  test('no code', async () => {
    const c = await customer();
    await post('/cart/items', { productId: (await product({ price: 20 })).id, quantity: 2 }, c.token);
    same(await threeTotals(c.token, 'delivery-standard'), 45.99, 0);
  });

  test('a code on shop products and delivery', async () => {
    const c = await customer();
    await post('/cart/items', { productId: (await product({ price: 20 })).id }, c.token);
    await post('/cart/coupon', { code: (await coupon({ discountType: 'FIXED', discountValue: 23, scopes: ['SHOP', 'DELIVERY'] })).code }, c.token);
    same(await threeTotals(c.token, 'delivery-express'), 9.99, 23);
  });

  test('a % code with a cap', async () => {
    const c = await customer();
    await post('/cart/items', { productId: (await product({ price: 100 })).id }, c.token);
    await post('/cart/coupon', { code: (await coupon({ discountValue: 50, maxDiscount: 30, scopes: ['SHOP'] })).code }, c.token);
    same(await threeTotals(c.token, 'delivery-standard'), 70, 30);
  });

  test('a friend’s code', async () => {
    const inviter = await customer({ signup: true });
    const code = (await prisma.user.findUniqueOrThrow({ where: { id: inviter.id } })).referralCode!;
    const c = await customer();
    await post('/cart/items', { productId: (await product({ price: 30 })).id }, c.token);
    expectStatus(await post('/cart/coupon', { code }, c.token), '2xx');
    same(await threeTotals(c.token, 'delivery-standard'), 32.99, 3);
  });

  test('a gift plan with a gift-only code', async () => {
    const c = await customer();
    await post('/cart/items', { subscriptionPlanId: (await plan('3-months')).id }, c.token);
    expectStatus(await post('/cart/coupon', { code: (await coupon({ discountValue: 20, scopes: ['GIFT'] })).code }, c.token), '2xx');
    same(await threeTotals(c.token, 'delivery-standard', { gift: true }), 107.99, 27);
  });

  test('a gift plan with a friend’s code only for gifts', async () => {
    const inviter = await customer({ signup: true });
    const code = (await prisma.user.findUniqueOrThrow({ where: { id: inviter.id } })).referralCode!;
    const c = await customer();
    await post('/cart/items', { subscriptionPlanId: (await plan('1-month')).id }, c.token);
    expectStatus(await post('/cart/coupon', { code }, c.token), '2xx');
    const t = await threeTotals(c.token, 'delivery-express', { gift: true });
    same(t, 49.99 - 5 + 7, 5);
  });
});
