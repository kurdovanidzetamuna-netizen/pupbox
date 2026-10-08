/**
 * One-off catalogue tidy-up.
 *
 * Retires leftover test plans, products and categories, fixes a plan left with a blank
 * name, and populates the active box campaign.
 *
 * Everything here is REVERSIBLE — rows are soft-deleted (deletedAt + inactive),
 * never dropped, because Prisma relations from historical orders still point at
 * them. Run with --undo to restore.
 *
 *   npx ts-node prisma/cleanup-catalogue.ts
 *   npx ts-node prisma/cleanup-catalogue.ts --undo
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Identified by slug/sku so a rename can't silently change what gets retired. */
const RETIRE_PLAN_SLUGS = ['10-monthtest', '3-month', '1testing', '3month', '3test', '2-month', '3---month'];
const RETIRE_PRODUCT_SKUS = ['test', 'ტესტ', 'treat-001'];
const RETIRE_CATEGORY_SLUGS = ['t'];

/** The pricing page's "Most Popular" sat on the ₾150 test plan; it belongs on a real one. */
const POPULAR_PLAN_SLUG = '6-months';

/** A real plan that lost its name — the pricing page renders an empty heading. */
const RENAME_PLAN = { slug: '3-months', name: '3 Months' };

const CAMPAIGN_MONTH = 7;
const CAMPAIGN_YEAR = 2026;

async function retire() {
  const now = new Date();

  const plans = await prisma.subscriptionPlan.findMany({
    where: { slug: { in: RETIRE_PLAN_SLUGS } },
    select: { id: true, name: true, slug: true, price: true },
  });
  for (const p of plans) {
    await prisma.subscriptionPlan.update({
      where: { id: p.id },
      data: { isActive: false, deletedAt: now },
    });
    console.log(`  retired plan  "${p.name || '(blank)'}" (${p.slug}, ₾${p.price})`);
  }
  const missingPlans = RETIRE_PLAN_SLUGS.filter((s) => !plans.some((p) => p.slug === s));
  if (missingPlans.length) console.log(`  · already gone: ${missingPlans.join(', ')}`);

  const products = await prisma.product.findMany({
    where: { sku: { in: RETIRE_PRODUCT_SKUS } },
    select: { id: true, name: true, sku: true },
  });
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: { status: 'INACTIVE', standaloneSale: false, includedInBox: false, deletedAt: now },
    });
    console.log(`  retired product "${p.name}" (${p.sku})`);
  }
  const missingProducts = RETIRE_PRODUCT_SKUS.filter((s) => !products.some((p) => p.sku === s));
  if (missingProducts.length) console.log(`  · already gone: ${missingProducts.join(', ')}`);

  const categories = await prisma.productCategory.findMany({
    where: { slug: { in: RETIRE_CATEGORY_SLUGS }, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  for (const c of categories) {
    await prisma.productCategory.update({ where: { id: c.id }, data: { isActive: false, deletedAt: now } });
    console.log(`  retired category "${c.name}" (${c.slug})`);
  }
  if (!categories.length) console.log(`  · categories already gone: ${RETIRE_CATEGORY_SLUGS.join(', ')}`);
}

async function restore() {
  const plans = await prisma.subscriptionPlan.updateMany({
    where: { slug: { in: RETIRE_PLAN_SLUGS } },
    data: { isActive: true, deletedAt: null },
  });
  const products = await prisma.product.updateMany({
    where: { sku: { in: RETIRE_PRODUCT_SKUS } },
    data: { status: 'ACTIVE', standaloneSale: true, includedInBox: true, deletedAt: null },
  });
  const categories = await prisma.productCategory.updateMany({
    where: { slug: { in: RETIRE_CATEGORY_SLUGS } },
    data: { isActive: true, deletedAt: null },
  });
  console.log(`  restored ${plans.count} plans, ${products.count} products, ${categories.count} categories`);
}

async function fixBlankName() {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: RENAME_PLAN.slug }, select: { id: true, name: true } });
  if (!plan) return console.log(`  · plan ${RENAME_PLAN.slug} not found`);
  if (plan.name?.trim()) return console.log(`  · plan ${RENAME_PLAN.slug} already named "${plan.name}"`);
  await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { name: RENAME_PLAN.name } });
  console.log(`  renamed ${RENAME_PLAN.slug} → "${RENAME_PLAN.name}"`);
}

async function movePopularBadge() {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: POPULAR_PLAN_SLUG }, select: { id: true, badge: true } });
  if (!plan) return console.log(`  · plan ${POPULAR_PLAN_SLUG} not found`);
  if (plan.badge) return console.log(`  · ${POPULAR_PLAN_SLUG} already badged "${plan.badge}"`);
  const elsewhere = await prisma.subscriptionPlan.count({ where: { badge: 'Most Popular', isActive: true, deletedAt: null } });
  if (elsewhere) return console.log('  · another active plan is already "Most Popular"');
  await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { badge: 'Most Popular' } });
  console.log(`  "Most Popular" → ${POPULAR_PLAN_SLUG}`);
}

async function fillCampaign() {
  const campaign = await prisma.boxCampaign.findFirst({
    where: { month: CAMPAIGN_MONTH, year: CAMPAIGN_YEAR },
    select: { id: true, name: true, products: { select: { id: true } } },
  });
  if (!campaign) return console.log(`  · no campaign for ${CAMPAIGN_MONTH}/${CAMPAIGN_YEAR}`);
  if (campaign.products.length > 0) return console.log(`  · "${campaign.name}" already has ${campaign.products.length} items`);

  // Only genuinely box-eligible products, after the retirements above.
  const eligible = await prisma.product.findMany({
    where: { includedInBox: true, status: 'ACTIVE', deletedAt: null },
    select: { id: true, name: true, price: true },
    orderBy: { name: 'asc' },
  });
  if (eligible.length === 0) return console.log('  · no box-eligible products to add');

  await prisma.boxCampaignProduct.createMany({
    data: eligible.map((p) => ({ campaignId: campaign.id, productId: p.id, quantity: 1 })),
  });
  const cost = eligible.reduce((s, p) => s + Number(p.price), 0);
  console.log(`  filled "${campaign.name}" with ${eligible.length} items (₾${cost.toFixed(2)} cost per box):`);
  eligible.forEach((p) => console.log(`      1× ${p.name} — ₾${p.price}`));
}

async function main() {
  if (process.argv.includes('--undo')) {
    console.log('▸ restoring retired catalogue rows…');
    await restore();
    console.log('✓ restored (campaign contents and the rename are left as-is)');
    return;
  }

  console.log('▸ retiring test catalogue rows…');
  await retire();
  console.log('\n▸ fixing blank plan name…');
  await fixBlankName();
  console.log('\n▸ placing the "Most Popular" badge…');
  await movePopularBadge();
  console.log('\n▸ populating box campaign…');
  await fillCampaign();

  const activePlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true, deletedAt: null },
    select: { name: true, slug: true, price: true, boxCount: true },
    orderBy: { price: 'asc' },
  });
  console.log('\n✓ cleanup complete — remaining active plans:');
  for (const p of activePlans) {
    const perBox = Number(p.price) / (p.boxCount || 1);
    console.log(`    ${(p.name || p.slug).padEnd(12)} ₾${String(p.price).padStart(7)}  ${String(p.boxCount).padStart(2)} boxes  →  ₾${perBox.toFixed(2)}/box`);
  }
  const activeProducts = await prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null } });
  console.log(`\n  active products: ${activeProducts}`);
}

main()
  .catch((e) => { console.error('✗ cleanup failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
