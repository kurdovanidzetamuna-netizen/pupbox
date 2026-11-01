import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { admin, customer, del, expectStatus, get, post, prisma, product, put } from './harness';

/** Lists admin keeps for the site: product tags, plan badges, ready-made allergies. */

describe('product tags', () => {
  test('made in both languages, put on a product, shown on its page; off hides it; delete takes it off', async () => {
    const a = await admin();
    const list = expectStatus(await post('/admin/tags', { name: 'Grain free', nameKa: 'უმარცვლო' }, a), '2xx', 'create');
    const tag = list.find((x: any) => x.name === 'Grain free');
    assert.equal(tag.slug, 'grain-free');
    assert.equal(tag.nameKa, 'უმარცვლო');
    assert.equal(tag.products, 0);

    const p = await product({ price: 10 });
    expectStatus(await put(`/admin/products/${p.id}`, { name: p.name, slug: p.slug, sku: p.sku, price: 10, tagIds: [tag.id] }, a), '2xx', 'put on product');
    const page = expectStatus(await get(`/products/${p.slug}`), 200);
    assert.deepEqual(page.tags.map((x: any) => [x.tag.name, x.tag.translations?.ka?.name]), [['Grain free', 'უმარცვლო']]);
    assert.equal(expectStatus(await get('/admin/tags', a), 200).find((x: any) => x.id === tag.id).products, 1);

    expectStatus(await put(`/admin/tags/${tag.id}`, { name: 'Grain free', nameKa: 'უმარცვლო', isActive: false }, a), '2xx', 'off');
    assert.ok(!expectStatus(await get('/tags'), 200).some((x: any) => x.id === tag.id), 'gone from the site list');

    expectStatus(await del(`/admin/tags/${tag.id}`, a), '2xx', 'delete');
    assert.equal(await prisma.productTagRelation.count({ where: { tagId: tag.id } }), 0);
  });

  test('a name is needed; no two tags alike; customers can’t edit', async () => {
    const a = await admin();
    assert.equal((await post('/admin/tags', { name: '  ' }, a)).status, 400);
    expectStatus(await post('/admin/tags', { name: 'Handmade' }, a), '2xx');
    assert.equal((await post('/admin/tags', { name: 'handmade' }, a)).status, 409);
    assert.equal((await post('/admin/tags', { name: 'X' }, (await customer()).token)).status, 401);
  });
});

describe('plan badges', () => {
  test('the four built-in ones are always there, with Georgian names', async () => {
    const list = expectStatus(await get('/subscription-plans/badges'), 200);
    assert.deepEqual(list.slice(0, 4).map((b: any) => b.en), ['Most Popular', 'Best Value', 'New', 'Limited']);
    assert.ok(list.every((b: any) => b.ka));
  });

  test('a custom badge is shared through the server; built-in ones can be renamed in Georgian but not removed', async () => {
    const a = await admin();
    const saved = expectStatus(await put('/admin/subscription-plans/badges', { badges: [{ en: 'Flash Sale', ka: 'ფლეშ ფასდაკლება' }, { en: 'New', ka: 'სიახლე' }, { en: 'flash sale', ka: 'dup' }] }, a), '2xx');
    assert.deepEqual(saved.map((b: any) => b.en), ['Most Popular', 'Best Value', 'New', 'Limited', 'Flash Sale']);
    assert.equal(saved.find((b: any) => b.en === 'New').ka, 'სიახლე');
    const publicList = expectStatus(await get('/subscription-plans/badges'), 200);
    assert.equal(publicList.find((b: any) => b.en === 'Flash Sale').ka, 'ფლეშ ფასდაკლება');
    assert.equal((await put('/admin/subscription-plans/badges', { badges: [] }, (await customer()).token)).status, 401);
  });
});

describe('ready-made allergies', () => {
  test('the 8 starting ones until admin changes the list', async () => {
    await prisma.cMSPage.deleteMany({ where: { slug: 'config-allergens' } });
    const list = expectStatus(await get('/allergens'), 200);
    assert.equal(list.length, 8);
    assert.deepEqual(list[0], { key: 'Chicken', ka: 'ქათამი' });
  });

  test('admin adds, renames in Georgian, reorders and removes; the site sees it', async () => {
    const a = await admin();
    const saved = expectStatus(await put('/admin/allergens', { allergens: [{ key: 'turkey', ka: 'ინდაური' }, { key: 'Chicken', ka: 'ქათმის ხორცი' }, { key: 'Turkey', ka: 'dup' }] }, a), '2xx');
    assert.deepEqual(saved, [{ key: 'Turkey', ka: 'ინდაური' }, { key: 'Chicken', ka: 'ქათმის ხორცი' }]);
    assert.deepEqual(expectStatus(await get('/allergens'), 200), saved);
    assert.equal((await put('/admin/allergens', { allergens: [] }, (await customer()).token)).status, 401);
    await prisma.cMSPage.deleteMany({ where: { slug: 'config-allergens' } });
  });
});
