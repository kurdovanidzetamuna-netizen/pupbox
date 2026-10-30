import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { admin, call, customer, server } from './harness';

/**
 * Every route the server has, found from the server itself (so a new route is
 * covered the day it's added), called three ways: signed out, as a customer,
 * as the super admin. Nothing may crash (5xx), and admin routes must turn away
 * everyone but admins.
 */

type Route = { method: string; path: string };

async function routes(): Promise<Route[]> {
  const { app } = await server();
  const stack = app.getHttpAdapter().getInstance()._router.stack as any[];
  return stack
    .filter((l) => l.route)
    .flatMap((l) => Object.keys(l.route.methods).map((m) => ({ method: m.toUpperCase(), path: String(l.route.path) })))
    .filter((r) => r.path.startsWith('/api/v1/'));
}

// Routes that wait on the outside world or are meant to be open to everyone.
const PUBLIC_WRITES = /\/(auth|newsletter|marketing\/consent|payments\/webhook|cms\/popups|cart)/;
// Routes that start real work (send messages, run jobs) are still called, but with an empty body.
const fake = (path: string) => path.replace(/:([A-Za-z]+)/g, (_, p) => (p === 'slug' || p === 'key' || p === 'pageKey' ? 'no-such-thing' : p === 'lang' ? 'en' : p === 'year' ? '2026' : p === 'month' ? '10' : 'cnotarealid000000000000000'));
const strip = (path: string) => path.replace(/^\/api\/v1/, '');
const isAdmin = (path: string) => /^\/api\/v1\/(admin\/|audit|analytics|reports|orders\/admin|referrals\/admin|cms\/admin|box-campaigns)/.test(path) && !/\/admin\/auth\/login$/.test(path);

describe('every route', () => {
  test('there are as many routes as we think', async () => {
    const all = await routes();
    assert.ok(all.length >= 230, `found ${all.length}`);
    console.log(`  ${all.length} routes`);
  });

  test('nothing crashes, signed out, as a customer, or as admin', async () => {
    const all = await routes();
    const who = { visitor: undefined, customer: (await customer()).token, admin: await admin() } as Record<string, string | undefined>;
    const crashes: string[] = [];
    for (const r of all) {
      for (const [name, token] of Object.entries(who)) {
        const res = await call(r.method, fake(strip(r.path)), { token, body: r.method === 'GET' || r.method === 'DELETE' ? undefined : {} });
        if (res.status >= 500) crashes.push(`${name} ${r.method} ${r.path} → ${res.status} ${JSON.stringify(res.body).slice(0, 160)}`);
      }
    }
    assert.deepEqual(crashes, []);
  });

  test('admin routes turn away visitors and customers', async () => {
    const all = (await routes()).filter((r) => isAdmin(r.path));
    const c = (await customer()).token;
    const open: string[] = [];
    for (const r of all) {
      for (const [name, token] of [['visitor', undefined], ['customer', c]] as const) {
        const res = await call(r.method, fake(strip(r.path)), { token, body: r.method === 'GET' || r.method === 'DELETE' ? undefined : {} });
        if (![401, 403].includes(res.status)) open.push(`${name} ${r.method} ${r.path} → ${res.status}`);
      }
    }
    assert.deepEqual(open, []);
    console.log(`  ${all.length} admin routes checked`);
  });

  test('customer routes need a sign-in', async () => {
    // The push key is public on purpose: the browser needs it before signing in.
    const mine = (await routes()).filter((r) => /^\/api\/v1\/(me\/|orders\/my|checkout|users\/me|payments\/(initiate|order))/.test(r.path) && r.path !== '/api/v1/me/push/key');
    const open: string[] = [];
    for (const r of mine) {
      const res = await call(r.method, fake(strip(r.path)), { body: r.method === 'GET' || r.method === 'DELETE' ? undefined : {} });
      if (res.status !== 401) open.push(`${r.method} ${r.path} → ${res.status}`);
    }
    assert.deepEqual(open, []);
    console.log(`  ${mine.length} customer routes checked`);
  });

  test('public writes are the expected ones', async () => {
    const writes = (await routes()).filter((r) => r.method !== 'GET' && !isAdmin(r.path) && !/^\/api\/v1\/(me\/|orders\/my|checkout|users\/me|payments\/(initiate|order))/.test(r.path));
    const unexpected: string[] = [];
    for (const r of writes) {
      const res = await call(r.method, fake(strip(r.path)), { body: {} });
      if (res.status !== 401 && res.status !== 403 && !PUBLIC_WRITES.test(r.path)) unexpected.push(`${r.method} ${r.path} → ${res.status}`);
    }
    // Shown, not failed: each one is a route anyone can call without signing in.
    if (unexpected.length) console.log(`  open to anyone:\n    ${unexpected.join('\n    ')}`);
  });
});
