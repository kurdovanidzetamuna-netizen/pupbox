import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { Prisma } from '@prisma/client';
import type * as Api from '../../../packages/content/src/api-types';
import type { OrdersService } from '../src/modules/orders/orders.service';
import type { CartService } from '../src/modules/cart/cart.service';
import type { DogsService } from '../src/modules/dogs/dogs.service';
import type { ADDRESS_SELECT } from '../src/modules/users/addresses.controller';
import { buy, customer, get, product, admin, expectStatus } from './harness';

/**
 * The site and admin read the server's answers through the descriptions in
 * packages/content/src/api-types.ts. Here those descriptions are checked
 * against what the server's code returns, sent as JSON: if a field is renamed
 * or changes kind on the server, the type check of the tests (npm test runs
 * it first) fails, naming the field — before any page can break.
 */

/** What a value becomes on its way through JSON. */
type Json<T> = T extends Date ? string
  : T extends Prisma.Decimal ? string
  : T extends (infer U)[] ? Json<U>[]
  : T extends object ? { [K in keyof T]: Json<T[K]> }
  : T;
type Fits<Server extends Shared, Shared> = Server;
type Returns<F extends (...a: any) => any> = Json<Awaited<ReturnType<F>>>;

export type Contracts = [
  Fits<Returns<OrdersService['adminGetOne']>, Api.AdminOrderDetail>,
  Fits<Returns<OrdersService['adminList']>['orders'][number], Api.AdminOrderRow>,
  Fits<Returns<OrdersService['findOne']>, Api.Order>,
  Fits<Returns<OrdersService['findByUser']>['orders'][number], Api.CustomerOrder>,
  Fits<Returns<CartService['getOrCreate']>, Api.Cart>,
  Fits<Returns<CartService['getDeliveryMethods']>[number], Api.DeliveryOption>,
  Fits<Json<Prisma.AddressGetPayload<{ select: typeof ADDRESS_SELECT }>>, Api.Address>,
  Fits<Returns<DogsService['findByUser']>[number], Api.Dog>,
  Fits<Json<Prisma.SubscriptionPlanGetPayload<object>>, Api.Plan>,
];

// The same, on real answers: the fields the pages rely on are there and of the right kind.
test('real answers have the described fields', async () => {
  const c = await customer();
  const p = await product({ price: 12 });
  const o = await buy(c.token, [{ productId: p.id }]);
  const mine = expectStatus(await get(`/orders/my/${o.id}`, c.token), 200) as Api.Order;
  const inAdmin = expectStatus(await get(`/orders/admin/${o.id}`, await admin()), 200) as Api.AdminOrder;
  for (const x of [mine, inAdmin]) {
    assert.equal(typeof x.id, 'string');
    assert.ok(['string', 'number'].includes(typeof x.total), 'money as text or number');
    assert.equal(Number(x.total), 17.99);
    assert.ok(!Number.isNaN(Date.parse(x.createdAt)), 'dates as ISO text');
    assert.ok(Array.isArray(x.items) && Array.isArray(x.payments));
    assert.equal(x.items[0].product?.slug, p.slug);
  }
  assert.ok(Array.isArray(inAdmin.allowedNext));
  const cart = expectStatus(await get('/cart', c.token), 200) as Api.Cart;
  for (const k of ['subtotal', 'discountAmount', 'total', 'itemCount'] as const) assert.equal(typeof cart[k], 'number', k);
});
