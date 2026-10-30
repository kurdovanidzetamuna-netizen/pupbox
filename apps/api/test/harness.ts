import './env';
import { after } from 'node:test';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

/**
 * The real server, set up as it runs live (configureApp), on a free port of
 * this machine and the test database. One per test file, closed at the end.
 */
let started: Promise<{ app: NestExpressApplication; base: string }> | null = null;
export const prisma = new PrismaClient();

export function server() {
  started ??= (async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = configureApp(mod.createNestApplication<NestExpressApplication>({ logger: ['error'] }));
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as { port: number };
    return { app, base: `http://127.0.0.1:${port}/api/v1` };
  })();
  return started;
}

after(async () => {
  if (started) await (await started).app.close();
  await prisma.$disconnect();
});

export type Res<T = any> = { status: number; body: T };

/** One request: `token` signs in, `body` goes as JSON. Never throws on a refusal; tests check `status`. */
export async function call<T = any>(method: string, path: string, o: { token?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<Res<T>> {
  const { base } = await server();
  const r = await fetch(base + path, {
    method,
    headers: { ...(o.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(o.token ? { authorization: `Bearer ${o.token}` } : {}), ...o.headers },
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
  });
  const text = await r.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* CSV, empty */ }
  return { status: r.status, body };
}
export const get = (path: string, token?: string) => call('GET', path, { token });
export const post = (path: string, body?: unknown, token?: string) => call('POST', path, { body: body ?? {}, token });
export const put = (path: string, body?: unknown, token?: string) => call('PUT', path, { body: body ?? {}, token });
export const patch = (path: string, body?: unknown, token?: string) => call('PATCH', path, { body: body ?? {}, token });
export const del = (path: string, token?: string) => call('DELETE', path, { token });

/** Fails the test with the server's answer when the status isn't the expected one (2xx: any success). */
export function expectStatus(r: Res, status: number | '2xx', what = '') {
  if (status === '2xx' ? r.status < 200 || r.status > 299 : r.status !== status) throw new Error(`${what || 'request'}: expected ${status}, got ${r.status} — ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body;
}

let n = 0;
const unique = () => `${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A Georgian mobile number nobody else in this run has. */
const phone = () => `+9955${String(Math.floor(10_000_000 + Math.random() * 89_999_999))}`;

/**
 * A new customer. By default made straight in the database (the shop allows
 * only a few SMS codes an hour from one address, and the tests make
 * hundreds of customers), then signed in with the password like on the site.
 * `signup: true` goes through the site's own steps instead: phone code,
 * sign-up, email code. `verified: false` leaves email and phone unconfirmed.
 */
export async function customer(o: { verified?: boolean; marketing?: boolean; signup?: boolean } = {}) {
  const tel = phone();
  const email = `t-${unique()}@pupbox.test`;
  const verified = o.verified !== false;
  if (o.signup) {
    expectStatus(await post('/auth/phone/send', { phone: tel }), '2xx', 'phone/send');
    const proof = expectStatus(await post('/auth/phone/verify', { phone: tel, code: '111111' }), '2xx', 'phone/verify');
    const reg = expectStatus(await post('/auth/register', {
      email, password: PASSWORD, firstName: 'Test', lastName: 'Customer', phone: tel, phoneProof: proof.proof, marketingConsent: o.marketing === true,
    }), '2xx', 'register');
    if (verified) expectStatus(await post('/auth/verify', { channel: 'EMAIL', code: '111111' }, reg.token), '2xx', 'verify email');
  } else {
    passwordHash ??= bcrypt.hash(PASSWORD, 4);
    await prisma.user.create({
      data: {
        email, phone: tel, firstName: 'Test', lastName: 'Customer', passwordHash: await passwordHash,
        emailVerified: verified, phoneVerified: verified, marketingConsent: o.marketing === true, marketingEmail: o.marketing === true, marketingSms: o.marketing === true,
      },
    });
  }
  const { token } = expectStatus(await post('/auth/login', { email, password: PASSWORD }), '2xx', 'login');
  const me = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { token: token as string, id: me.id, email, phone: tel, user: me };
}
const PASSWORD = 'Test-pass-123';
let passwordHash: Promise<string> | undefined;

let adminToken: Promise<string> | null = null;
/** The seeded super admin. */
export const admin = () => (adminToken ??= post('/admin/auth/login', { email: 'admin@pupbox.ge', password: process.env.ADMIN_PASSWORD }).then((r) => expectStatus(r, '2xx', 'admin login').token));

/** Starter data the seeds put in the test database. */
export async function catalogue() {
  const products = await prisma.product.findMany({ where: { status: 'ACTIVE', deletedAt: null, standaloneSale: true }, include: { inventory: true }, orderBy: { price: 'asc' } });
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true, listed: true, deletedAt: null, isCustomBox: false }, orderBy: { price: 'asc' } });
  const delivery = await prisma.deliveryMethod.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  return { products, plans, delivery };
}

/** A product of our own with its price and stock, so totals are known exactly. */
export async function product(o: { price: number; salePrice?: number; stock?: number; name?: string } ) {
  const id = unique();
  return prisma.product.create({
    data: {
      name: o.name ?? `Test product ${id}`, slug: `test-${id}`, sku: `T-${id}`, price: o.price, salePrice: o.salePrice ?? null,
      status: 'ACTIVE', standaloneSale: true,
      inventory: { create: { quantity: o.stock ?? 100 } },
    },
    include: { inventory: true },
  });
}

/** A promo code straight in the database. */
export async function coupon(data: Record<string, unknown>) {
  return prisma.coupon.create({ data: { code: `T${unique().toUpperCase()}`, discountType: 'PERCENTAGE', discountValue: 10, isActive: true, scopes: ['SHOP', 'BOX', 'CUSTOM_BOX', 'GIFT'], ...data } as any });
}

/** The delivery fields every order needs. */
export const address = { firstName: 'Test', lastName: 'Customer', phone: '+995599000000', city: 'Tbilisi', addressLine1: '1 Test street' };

/** Basket → order → simulated payment. Returns the paid order with its items and payments. */
export async function buy(token: string, lines: { productId?: string; subscriptionPlanId?: string; quantity?: number }[], o: { deliveryMethodId?: string; couponCode?: string; extra?: Record<string, unknown> } = {}) {
  for (const l of lines) expectStatus(await post('/cart/items', l, token), '2xx', 'add to cart');
  if (o.couponCode) expectStatus(await post('/cart/coupon', { code: o.couponCode }, token), '2xx', 'apply coupon');
  const deliveryMethodId = o.deliveryMethodId ?? (await catalogue()).delivery[0].id;
  const order = expectStatus(await post('/checkout/order', { deliveryMethodId, ...address, ...o.extra }, token), '2xx', 'create order');
  expectStatus(await post(`/payments/initiate/${order.id}`, {}, token), '2xx', 'pay');
  return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, payments: true, subscription: true } });
}

export const money = (v: unknown) => Math.round(Number(v) * 100) / 100;
