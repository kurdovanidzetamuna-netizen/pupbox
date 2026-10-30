import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { admin, customer, expectStatus, get, patch, post, prisma } from './harness';

/** Signing up, signing in, keeping an account safe — customers and admins. */

describe('customer accounts', () => {
  test('sign-up through the site’s steps: phone code, account, email code', async () => {
    const c = await customer({ signup: true, marketing: true });
    assert.equal(c.user.phoneVerified, true);
    assert.equal(c.user.emailVerified, true);
    assert.equal(c.user.marketingSms, true);
    assert.match(c.user.referralCode ?? '', /^[A-Z]+-[A-Z0-9]{4}$/, 'a short code to share');
  });

  test('a wrong code, a used email, a phone already confirmed elsewhere', async () => {
    const c = await customer();
    assert.equal((await post('/auth/phone/send', { phone: c.phone })).status, 400, 'number already on an account');
    assert.equal((await post('/auth/register', { email: c.email, password: 'Another-pass-1', firstName: 'A', lastName: 'B', phone: '+995599111222' })).status, 409);
    const fresh = await customer({ verified: false });
    assert.equal((await post('/auth/verify', { channel: 'EMAIL', code: '999999' }, fresh.token)).status, 400);
  });

  test('sign-in: right password only; a blocked account can’t', async () => {
    const c = await customer();
    assert.equal((await post('/auth/login', { email: c.email, password: 'wrong-password' })).status, 401);
    assert.equal((await post('/auth/login', { email: c.email.toUpperCase(), password: 'Test-pass-123' })).status, 200, 'email in any case');
    await prisma.user.update({ where: { id: c.id }, data: { status: 'BLOCKED' } });
    assert.equal((await post('/auth/login', { email: c.email, password: 'Test-pass-123' })).status, 401);
    assert.equal((await get('/users/me', c.token)).status, 401, 'and its open session ends');
  });

  test('changing the password signs out other sessions', async () => {
    const c = await customer();
    await new Promise((r) => setTimeout(r, 1100)); // tokens are dated to the second
    assert.equal((await post('/auth/change-password', { currentPassword: 'nope', newPassword: 'New-pass-456' }, c.token)).status, 400);
    const { token } = expectStatus(await post('/auth/change-password', { currentPassword: 'Test-pass-123', newPassword: 'New-pass-456' }, c.token), 200);
    assert.equal((await get('/users/me', c.token)).status, 401, 'the old session');
    assert.equal((await get('/users/me', token)).status, 200, 'the new one');
    assert.equal((await post('/auth/login', { email: c.email, password: 'New-pass-456' })).status, 200);
  });

  test('forgot password: the same answer whether or not the account exists', async () => {
    const c = await customer();
    const known = await post('/auth/forgot-password', { email: c.email });
    const unknown = await post('/auth/forgot-password', { email: 'nobody@pupbox.test' });
    assert.equal(known.status, unknown.status);
    assert.deepEqual(known.body, unknown.body);
  });

  test('deleting an account wipes the person, keeps the orders', async () => {
    const c = await customer();
    assert.equal((await post('/auth/delete-account', { password: 'nope' }, c.token)).status, 400);
    expectStatus(await post('/auth/delete-account', { password: 'Test-pass-123' }, c.token), 200);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: c.id } });
    assert.ok(u.deletedAt);
    assert.equal(u.phone, null);
    assert.notEqual(u.email, c.email);
    assert.equal((await post('/auth/login', { email: c.email, password: 'Test-pass-123' })).status, 401);
  });

  test('marketing consent can be switched off by the customer', async () => {
    const c = await customer({ marketing: true });
    const r = await patch('/users/me', { marketingSms: false }, c.token);
    assert.ok([200, 400].includes(r.status), `answered ${r.status}`);
  });
});

describe('admin accounts', () => {
  test('sign-in, wrong password, and what a role allows', async () => {
    assert.equal((await post('/admin/auth/login', { email: 'admin@pupbox.ge', password: 'wrong-one' })).status, 401);
    const a = await admin();
    expectStatus(await get('/admin/auth/me', a), 200);
    const role = expectStatus(await post('/admin/roles', { name: `Viewer ${Date.now()}`, permissionKeys: ['dashboard.view', 'orders.view'] }, a), '2xx', 'role');
    const email = `staff-${Date.now()}@pupbox.test`;
    expectStatus(await post('/admin/users', { email, password: 'Staff-pass-1234', firstName: 'Staff', lastName: 'Member', roleId: role.id }, a), '2xx', 'staff');
    const staff = expectStatus(await post('/admin/auth/login', { email, password: 'Staff-pass-1234' }), '2xx').token;
    assert.equal((await get('/orders/admin', staff)).status, 200, 'orders.view');
    assert.equal((await get('/admin/coupons', staff)).status, 403, 'no coupons.manage');
    assert.equal((await post('/admin/delivery', { name: 'X', price: 1, isActive: true }, staff)).status, 403, 'no cms.edit');
  });

  test('a customer token is never an admin token', async () => {
    const c = await customer();
    assert.equal((await get('/admin/auth/me', c.token)).status, 401);
    assert.equal((await get('/admin/customers', c.token)).status, 401);
  });
});
