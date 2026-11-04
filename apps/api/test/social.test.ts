import { before, describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as crypto from 'crypto';
import { admin, customer, del, expectStatus, get, post, prisma, put } from './harness';

/**
 * Continue with Google / Facebook. In tests a token "test:{…}" stands for
 * what Google or Facebook would answer about the person (see social.ts);
 * `aud` is the app the token was made for, checked like the real one.
 */

const GOOGLE_ID = 'pupbox-test.apps.googleusercontent.com';
const FB_ID = '1234567890';
let n = 0;
const uniq = () => `${Date.now().toString(36)}${n++}`;
const google = (p: { id?: string; email?: string | null; emailVerified?: boolean; firstName?: string; lastName?: string; aud?: string } = {}) =>
  `test:${JSON.stringify({ aud: GOOGLE_ID, id: `g-${uniq()}`, email: `g-${uniq()}@gmail.test`, firstName: 'Nino', lastName: 'Beridze', ...p })}`;
const facebook = (p: { id?: string; email?: string | null; aud?: string } = {}) =>
  `test:${JSON.stringify({ aud: FB_ID, id: `f-${uniq()}`, email: `f-${uniq()}@fb.test`, firstName: 'Giorgi', lastName: 'K', ...p })}`;
const keys = { google: { enabled: true, clientId: GOOGLE_ID }, facebook: { enabled: true, appId: FB_ID, appSecret: 'test-app-secret' } };

describe('Google and Facebook sign-in', () => {
  before(async () => {
    expectStatus(await put('/admin/social-login', keys, await admin()), '2xx', 'save keys');
  });

  test('admin keeps the keys; the secret only ever comes back masked; checks the shape', async () => {
    const a = await admin();
    const saved = expectStatus(await get('/admin/social-login', a), 200);
    assert.equal(saved.google.clientId, GOOGLE_ID);
    assert.equal(saved.facebook.appSecret, '••••••cret');
    assert.ok(saved.google.ready && saved.facebook.ready);
    // Saving the masked value back keeps the real secret.
    expectStatus(await put('/admin/social-login', { ...keys, facebook: { ...keys.facebook, appSecret: saved.facebook.appSecret } }, a), '2xx');
    const row = await prisma.cMSPage.findUnique({ where: { slug: 'config-social' } });
    assert.equal((row!.content as any).facebook.appSecret, 'test-app-secret');
    assert.equal((await put('/admin/social-login', { google: { clientId: 'not-a-client-id' } }, a)).status, 400);
    assert.equal((await put('/admin/social-login', keys, (await customer()).token)).status, 401);
    // The general pages API can't read it.
    assert.equal((await get('/cms/admin/config-social', a)).status, 404);
  });

  test('the site learns which buttons to show — public ids only', async () => {
    const p = expectStatus(await get('/auth/providers'), 200);
    assert.deepEqual(p, { google: { clientId: GOOGLE_ID }, facebook: { appId: FB_ID } });
  });

  test('a new person: an account with a confirmed email and no password; the phone still to confirm', async () => {
    const id = `g-${uniq()}`, email = `new-${uniq()}@gmail.test`;
    const r = expectStatus(await post('/auth/google', { token: google({ id, email, firstName: 'Ana', lastName: 'Kapanadze' }), language: 'en', marketingConsent: true }), 200);
    assert.equal(r.created, true);
    assert.deepEqual(r.verification, { emailVerified: true, phoneVerified: false, verified: false });
    const u = await prisma.user.findUniqueOrThrow({ where: { email }, include: { identities: true } });
    assert.equal(u.passwordHash, null);
    assert.equal(u.signupMethod, 'GOOGLE');
    assert.equal(u.firstName, 'Ana');
    assert.equal(u.language, 'en');
    assert.equal(u.marketingEmail, true);
    assert.deepEqual(u.identities.map((i) => [i.provider, i.providerUserId]), [['GOOGLE', id]]);
    // Signed in for real.
    expectStatus(await get('/users/me', r.token), 200);
    // Again: the same account, nothing new.
    const again = expectStatus(await post('/auth/google', { token: google({ id, email }) }), 200);
    assert.equal(again.created, false);
    assert.equal(again.user.id, u.id);
  });

  test('a token made for someone else’s app is refused', async () => {
    assert.equal((await post('/auth/google', { token: google({ aud: 'other.apps.googleusercontent.com' }) })).status, 401);
    assert.equal((await post('/auth/facebook', { token: facebook({ aud: '999' }) })).status, 401);
  });

  test('an existing customer with the same email: Google is linked, the password keeps working', async () => {
    const c = await customer();
    const r = expectStatus(await post('/auth/google', { token: google({ email: c.email }) }), 200);
    assert.equal(r.created, false);
    assert.equal(r.user.id, c.id);
    const m = expectStatus(await get('/auth/methods', c.token), 200);
    assert.equal(m.hasPassword, true);
    assert.equal(m.signupMethod, 'EMAIL');
    assert.deepEqual(m.identities.map((i: any) => i.provider), ['GOOGLE']);
    expectStatus(await post('/auth/login', { email: c.email, password: 'Test-pass-123' }), 200);
  });

  test('an email the provider didn’t confirm, or none at all, can’t make or take an account', async () => {
    const c = await customer();
    assert.equal((await post('/auth/google', { token: google({ email: c.email, emailVerified: false }) })).status, 400);
    assert.equal((await post('/auth/facebook', { token: facebook({ email: null }) })).status, 400);
    assert.equal(await prisma.userIdentity.count({ where: { userId: c.id } }), 0);
  });

  test('Facebook works the same way', async () => {
    const email = `fb-${uniq()}@fb.test`;
    const r = expectStatus(await post('/auth/facebook', { token: facebook({ email }) }), 200);
    assert.equal(r.created, true);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { email } })).signupMethod, 'FACEBOOK');
  });

  test('no password yet: the password form says how to get in; setting one needs no old password', async () => {
    const email = `nopw-${uniq()}@gmail.test`;
    const { token } = expectStatus(await post('/auth/google', { token: google({ email }) }), 200);
    const refused = await post('/auth/login', { email, password: 'anything-123' });
    assert.equal(refused.status, 401);
    // The same answer as for an email nobody has: the form doesn't tell who has an account, or how they sign in.
    const nobody = await post('/auth/login', { email: `nobody-${uniq()}@pupbox.test`, password: 'anything-123' });
    assert.equal(refused.body.message, nobody.body.message);
    assert.match(refused.body.message, /Google or Facebook/);
    expectStatus(await post('/auth/change-password', { newPassword: 'New-pass-456' }, token), 200);
    expectStatus(await post('/auth/login', { email, password: 'New-pass-456' }), 200);
    // Now the old one is needed, as for everyone.
    assert.equal((await post('/auth/change-password', { newPassword: 'Other-pass-789' }, token)).status, 400);
  });

  test('unlinking never removes the last way in', async () => {
    const email = `un-${uniq()}@gmail.test`;
    const { token } = expectStatus(await post('/auth/google', { token: google({ email }) }), 200);
    assert.equal((await del('/auth/link/google', token)).status, 400);
    expectStatus(await post('/auth/link/facebook', { token: facebook() }, token), 200);
    const m = expectStatus(await del('/auth/link/google', token), 200);
    assert.deepEqual(m.identities.map((i: any) => i.provider), ['FACEBOOK']);
  });

  test('a Google account already on another PupBox account can’t be linked to a second one', async () => {
    const id = `g-${uniq()}`;
    expectStatus(await post('/auth/google', { token: google({ id }) }), 200);
    const other = await customer();
    assert.equal((await post('/auth/link/google', { token: google({ id }) }, other.token)).status, 409);
  });

  test('a blocked account stays out', async () => {
    const email = `bl-${uniq()}@gmail.test`, id = `g-${uniq()}`;
    expectStatus(await post('/auth/google', { token: google({ id, email }) }), 200);
    await prisma.user.update({ where: { email }, data: { status: 'BLOCKED' } });
    assert.equal((await post('/auth/google', { token: google({ id, email }) })).status, 401);
  });

  test('switched off in admin: the button goes and the route refuses', async () => {
    const a = await admin();
    expectStatus(await put('/admin/social-login', { facebook: { enabled: false } }, a), '2xx');
    assert.equal(expectStatus(await get('/auth/providers'), 200).facebook, null);
    assert.equal((await post('/auth/facebook', { token: facebook() })).status, 400);
    expectStatus(await put('/admin/social-login', keys, a), '2xx');
  });

  test('admin sees how each customer signs in: on the row, by filter, in the CSV and the detail', async () => {
    const a = await admin();
    const email = `adm-${uniq()}@gmail.test`;
    expectStatus(await post('/auth/google', { token: google({ email }) }), 200);
    const list = expectStatus(await get(`/admin/customers?search=${encodeURIComponent(email)}`, a), 200);
    const row = list.rows.find((r: any) => r.email === email);
    assert.equal(row.signupMethod, 'GOOGLE');
    assert.equal(row.hasPassword, false);
    assert.deepEqual(row.providers, ['GOOGLE']);
    const google_ = expectStatus(await get('/admin/customers?signIn=google&limit=200', a), 200);
    assert.ok(google_.rows.some((r: any) => r.email === email));
    assert.ok(google_.rows.every((r: any) => r.providers.includes('GOOGLE')));
    const pw = expectStatus(await get('/admin/customers?signIn=password&limit=200', a), 200);
    assert.ok(!pw.rows.some((r: any) => r.email === email));
    const detail = expectStatus(await get(`/admin/customers/${row.id}`, a), 200);
    assert.equal(detail.hasPassword, false);
    assert.equal(detail.passwordHash, undefined);
    assert.deepEqual(detail.identities.map((i: any) => i.provider), ['GOOGLE']);
    const csv = await get(`/admin/customers/export.csv?search=${encodeURIComponent(email)}`, a);
    assert.match(String(csv.body), /Signed up with,Signs in with/);
    assert.match(String(csv.body), /,Google,Google/);
  });

  test('deleting an account made with Google needs no password and unlinks Google', async () => {
    const email = `del-${uniq()}@gmail.test`, id = `g-${uniq()}`;
    const { token, user } = expectStatus(await post('/auth/google', { token: google({ id, email }) }), 200);
    expectStatus(await post('/auth/delete-account', {}, token), 200);
    assert.equal(await prisma.userIdentity.count({ where: { userId: user.id } }), 0);
    // The same Google account later makes a fresh account.
    const again = expectStatus(await post('/auth/google', { token: google({ id, email }) }), 200);
    assert.equal(again.created, true);
    assert.notEqual(again.user.id, user.id);
  });

  test('Facebook’s data deletion request: checked against the app secret, then the Facebook link and its email are gone', async () => {
    const fbId = `f-${uniq()}`, email = `fbdel-${uniq()}@fb.test`;
    const { user } = expectStatus(await post('/auth/facebook', { token: facebook({ id: fbId, email }) }), 200);
    const signed = (secret: string) => {
      const payload = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', user_id: fbId, issued_at: Math.floor(Date.now() / 1000) })).toString('base64url');
      return `${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}.${payload}`;
    };
    // Not signed by our app: nothing happens.
    assert.equal((await post('/auth/facebook/data-deletion', { signed_request: signed('someone-else') })).status, 400);
    assert.equal(await prisma.userIdentity.count({ where: { userId: user.id } }), 1);
    const r = expectStatus(await post('/auth/facebook/data-deletion', { signed_request: signed('test-app-secret') }), 200);
    assert.match(r.confirmation_code, /^FBDEL-/);
    assert.match(r.url, new RegExp(`/pages/privacy\\?deletion=${r.confirmation_code}$`));
    assert.equal(await prisma.userIdentity.count({ where: { userId: user.id } }), 0);
  });

  test('my data export includes how I signed up and what Google shared — never a token', async () => {
    const email = `exp-${uniq()}@gmail.test`;
    const { token } = expectStatus(await post('/auth/google', { token: google({ email }) }), 200);
    const data = expectStatus(await get('/users/me/export', token), 200);
    assert.equal(data.profile.signupMethod, 'GOOGLE');
    assert.deepEqual(data.profile.identities.map((i: any) => [i.provider, i.email]), [['GOOGLE', email]]);
    assert.ok(!JSON.stringify(data).includes('providerUserId') && !JSON.stringify(data).includes('passwordHash'));
  });

  test('the profile tells the customer how they registered', async () => {
    const { token } = expectStatus(await post('/auth/facebook', { token: facebook() }), 200);
    assert.equal(expectStatus(await get('/users/me', token), 200).signupMethod, 'FACEBOOK');
  });
});
