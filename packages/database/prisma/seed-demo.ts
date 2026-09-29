/**
 * Demo data seeder — DEV ONLY.
 *
 * Generates ~12 months of realistic commercial history so the admin dashboard
 * has something to render: users, dogs, addresses, subscription + ecommerce
 * orders, payments and customer subscriptions.
 *
 * Every record it creates is traceable to a demo user (email `demo.<n>@pupbox.dev`),
 * so re-running the script wipes the previous batch first and leaves real data alone.
 *
 *   npx ts-node prisma/seed-demo.ts
 *   npx ts-node prisma/seed-demo.ts --clean   (wipe demo data, seed nothing)
 */
import { PrismaClient, OrderType, OrderStatus, PaymentStatus, SubscriptionStatus, DogSize, DogGender } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAIL_PREFIX = 'demo.';
const DEMO_EMAIL_DOMAIN = '@pupbox.dev';

const USER_COUNT = 130;
const ORDER_COUNT = 380;
const MONTHS_BACK = 12;

// Deterministic PRNG so repeated runs produce the same dashboard numbers.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260809);

const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p: number) => rnd() < p;

const FIRST_NAMES = ['Nino', 'Giorgi', 'Mariam', 'Luka', 'Ana', 'Davit', 'Elene', 'Saba', 'Tamar', 'Nika', 'Salome', 'Irakli', 'Keti', 'Beka', 'Lika', 'Zura', 'Natia', 'Sandro'];
const LAST_NAMES = ['Beridze', 'Kapanadze', 'Gelashvili', 'Maisuradze', 'Lomidze', 'Tsiklauri', 'Kvaratskhelia', 'Abashidze', 'Chkheidze', 'Dolidze'];
const CITIES = ['Tbilisi', 'Batumi', 'Kutaisi', 'Rustavi', 'Gori', 'Zugdidi'];
const DOG_NAMES = ['Rex', 'Bella', 'Charlie', 'Luna', 'Max', 'Daisy', 'Buddy', 'Coco', 'Rocky', 'Mia'];
const BREEDS = ['Labrador', 'Poodle', 'Beagle', 'Corgi', 'Husky', 'Border Collie', 'Dachshund', 'Mixed'];
const DOG_SIZES: DogSize[] = ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];
const DOG_GENDERS: DogGender[] = ['MALE', 'FEMALE'];

/** Wipe every record belonging to a demo user, deepest relation first. */
async function cleanDemoData() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: DEMO_EMAIL_DOMAIN } },
    select: { id: true },
  });
  const userIds = demoUsers.map((u) => u.id);
  if (userIds.length === 0) {
    console.log('  no existing demo data to clean');
    return;
  }

  const orders = await prisma.order.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const orderIds = orders.map((o) => o.id);
  const payments = await prisma.payment.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const paymentIds = payments.map((p) => p.id);

  await prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
  await prisma.payment.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.couponUsage.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.customerSubscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.referral.deleteMany({ where: { OR: [{ inviterId: { in: userIds } }, { invitedId: { in: userIds } }] } });
  await prisma.dog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log(`  removed ${userIds.length} demo users, ${orderIds.length} orders, ${paymentIds.length} payments`);
}

/**
 * Pick a timestamp within the trailing window, weighted toward recent months so
 * the data reads like a growing business rather than a flat line.
 */
function weightedPastDate(now: Date): Date {
  const r = rnd();
  // 18% of activity lands in the last 7 days so the short ranges are never empty.
  if (r < 0.06) {
    // last 24 hours
    return new Date(now.getTime() - rnd() * 24 * 3600 * 1000);
  }
  if (r < 0.18) {
    // last 7 days
    return new Date(now.getTime() - (1 + rnd() * 6) * 24 * 3600 * 1000);
  }
  // Remaining spread over the full window, biased to recent (square gives growth curve).
  const frac = Math.pow(rnd(), 0.55);
  const msBack = frac * MONTHS_BACK * 30.4 * 24 * 3600 * 1000;
  return new Date(now.getTime() - msBack);
}

async function main() {
  const cleanOnly = process.argv.includes('--clean');

  console.log('▸ cleaning previous demo data…');
  await cleanDemoData();
  if (cleanOnly) {
    console.log('✓ clean complete (--clean, nothing seeded)');
    return;
  }

  // ── Reference data pulled from whatever is actually in the DB ──────────────
  // Soft-deleted rows are retired catalogue entries — seeding orders against
  // them would resurrect them in every dashboard ranking.
  const allProducts = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, sku: true, price: true, salePrice: true, status: true, standaloneSale: true, includedInBox: true },
  });
  const sellableProducts = allProducts.filter((p) => p.standaloneSale && p.status === 'ACTIVE');
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, slug: true, price: true, boxCount: true },
  });
  const deliveryMethods = await prisma.deliveryMethod.findMany({ select: { id: true, price: true } });

  if (sellableProducts.length === 0) throw new Error('No sellable ACTIVE products — run seed-products first.');
  if (plans.length === 0) throw new Error('No active subscription plans — run seed-plans first.');

  console.log(`▸ using ${sellableProducts.length} sellable products, ${plans.length} active plans`);

  const now = new Date();

  // ── Users (+ address + dog) ───────────────────────────────────────────────
  console.log(`▸ creating ${USER_COUNT} users…`);
  const users: { id: string; createdAt: Date; addressId: string; dogId: string }[] = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const createdAt = weightedPastDate(now);

    const user = await prisma.user.create({
      data: {
        email: `${DEMO_EMAIL_PREFIX}${i}${DEMO_EMAIL_DOMAIN}`,
        firstName,
        lastName,
        phone: `+9955${int(10000000, 99999999)}`,
        // Not a real credential — demo accounts are never logged into.
        passwordHash: '$2b$10$demoseedonlynotarealhashvaluexxxxxxxxxxxxxxxxxxxxxxxxxxx',
        status: chance(0.92) ? 'ACTIVE' : chance(0.5) ? 'UNVERIFIED' : 'BLOCKED',
        emailVerified: chance(0.9),
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true, createdAt: true },
    });

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        phone: `+9955${int(10000000, 99999999)}`,
        city: pick(CITIES),
        addressLine1: `${int(1, 120)} ${pick(['Rustaveli', 'Chavchavadze', 'Aghmashenebeli', 'Vazha-Pshavela'])} Ave`,
        postalCode: `0${int(100, 199)}`,
        isDefault: true,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true },
    });

    const dog = await prisma.dog.create({
      data: {
        userId: user.id,
        name: pick(DOG_NAMES),
        breed: pick(BREEDS),
        gender: pick(DOG_GENDERS),
        size: pick(DOG_SIZES),
        weightKg: Number((rnd() * 40 + 2).toFixed(1)),
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true },
    });

    users.push({ id: user.id, createdAt: user.createdAt, addressId: address.id, dogId: dog.id });
  }

  // ── Orders + items + payments (+ subscriptions) ───────────────────────────
  console.log(`▸ creating ${ORDER_COUNT} orders with items and payments…`);
  const tally = {
    byType: {} as Record<string, number>,
    byPayment: {} as Record<string, number>,
    subscriptions: 0,
    revenue: 0,
  };

  for (let i = 0; i < ORDER_COUNT; i++) {
    const user = pick(users);
    // An order can never predate its customer.
    let createdAt = weightedPastDate(now);
    if (createdAt < user.createdAt) {
      createdAt = new Date(user.createdAt.getTime() + rnd() * (now.getTime() - user.createdAt.getTime()));
    }

    const roll = rnd();
    const type: OrderType = roll < 0.55 ? 'PRODUCT' : roll < 0.87 ? 'SUBSCRIPTION' : 'MIXED';

    const items: { productId?: string; subscriptionPlanId?: string; name: string; sku?: string; price: number; quantity: number; total: number }[] = [];

    if (type === 'PRODUCT' || type === 'MIXED') {
      const lineCount = int(1, 3);
      const chosen = new Set<string>();
      for (let l = 0; l < lineCount; l++) {
        const product = pick(sellableProducts);
        if (chosen.has(product.id)) continue;
        chosen.add(product.id);
        const unit = Number(product.salePrice ?? product.price);
        if (!unit || unit <= 0) continue;
        const qty = int(1, 3);
        items.push({ productId: product.id, name: product.name, sku: product.sku, price: unit, quantity: qty, total: Number((unit * qty).toFixed(2)) });
      }
    }

    let chosenPlan: (typeof plans)[number] | null = null;
    if (type === 'SUBSCRIPTION' || type === 'MIXED') {
      // Weight toward the sensible retail plans so "most popular" is meaningful.
      const popular = plans.filter((p) => ['1-month', '3-months', '6-months', '1-year'].includes(p.slug));
      chosenPlan = popular.length > 0 && chance(0.85) ? pick(popular) : pick(plans);
      const unit = Number(chosenPlan.price);
      items.push({ subscriptionPlanId: chosenPlan.id, name: chosenPlan.name || chosenPlan.slug, price: unit, quantity: 1, total: unit });
    }

    if (items.length === 0) continue;

    const subtotal = Number(items.reduce((s, it) => s + it.total, 0).toFixed(2));
    const delivery = pick(deliveryMethods);
    const deliveryCost = type === 'SUBSCRIPTION' ? 0 : Number(delivery?.price ?? 5.99);
    const discountAmount = chance(0.18) ? Number((subtotal * (chance(0.5) ? 0.1 : 0.15)).toFixed(2)) : 0;
    const total = Number((subtotal + deliveryCost - discountAmount).toFixed(2));

    // Payment outcome drives the order status — they must never disagree.
    const payRoll = rnd();
    const paymentStatus: PaymentStatus = payRoll < 0.88 ? 'PAID' : payRoll < 0.96 ? 'FAILED' : 'REFUNDED';
    let orderStatus: OrderStatus;
    if (paymentStatus === 'FAILED') orderStatus = 'FAILED';
    else if (paymentStatus === 'REFUNDED') orderStatus = 'REFUNDED';
    else {
      const ageDays = (now.getTime() - createdAt.getTime()) / 86400000;
      // Recent paid orders are still in flight; older ones have landed.
      orderStatus = ageDays < 2 ? pick<OrderStatus>(['PAID', 'PROCESSING'])
        : ageDays < 6 ? pick<OrderStatus>(['PROCESSING', 'PACKED', 'SHIPPED'])
        : pick<OrderStatus>(['DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPED']);
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        dogId: type !== 'PRODUCT' ? user.dogId : null,
        addressId: user.addressId,
        deliveryMethodId: delivery?.id ?? null,
        type,
        status: orderStatus,
        subtotal,
        deliveryCost,
        discountAmount,
        total,
        trackingNumber: ['SHIPPED', 'DELIVERED'].includes(orderStatus) ? `GE${int(100000000, 999999999)}` : null,
        shippedAt: ['SHIPPED', 'DELIVERED'].includes(orderStatus) ? new Date(createdAt.getTime() + 2 * 86400000) : null,
        deliveredAt: orderStatus === 'DELIVERED' ? new Date(createdAt.getTime() + 5 * 86400000) : null,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: items.map((it) => ({
            productId: it.productId ?? null,
            subscriptionPlanId: it.subscriptionPlanId ?? null,
            name: it.name,
            sku: it.sku ?? null,
            price: it.price,
            quantity: it.quantity,
            total: it.total,
            createdAt,
          })),
        },
      },
      select: { id: true },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: user.id,
        status: paymentStatus,
        provider: 'flitt',
        providerPaymentId: `demo_${int(1000000, 9999999)}`,
        amount: total,
        currency: 'GEL',
        paidAt: paymentStatus === 'PAID' ? createdAt : null,
        failReason: paymentStatus === 'FAILED' ? pick(['insufficient_funds', 'card_declined', 'expired_card']) : null,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true },
    });

    if (paymentStatus === 'REFUNDED') {
      await prisma.refund.create({
        data: { paymentId: payment.id, amount: total, reason: pick(['customer_request', 'damaged_item', 'wrong_size']), createdAt: new Date(createdAt.getTime() + 3 * 86400000) },
      });
    }

    // A paid subscription order creates the actual customer subscription.
    if (chosenPlan && paymentStatus === 'PAID') {
      const boxesTotal = chosenPlan.boxCount || 1;
      const monthsElapsed = (now.getTime() - createdAt.getTime()) / (30.4 * 86400000);
      const boxesDelivered = Math.min(boxesTotal, Math.max(0, Math.floor(monthsElapsed)));
      const finished = boxesDelivered >= boxesTotal;
      const subStatus: SubscriptionStatus = finished ? 'EXPIRED' : chance(0.08) ? 'CANCELLED' : chance(0.06) ? 'PAUSED' : 'ACTIVE';

      const sub = await prisma.customerSubscription.create({
        data: {
          userId: user.id,
          planId: chosenPlan.id,
          dogId: user.dogId,
          status: subStatus,
          startDate: createdAt,
          endDate: new Date(createdAt.getTime() + boxesTotal * 30.4 * 86400000),
          nextRenewalAt: subStatus === 'ACTIVE' ? new Date(createdAt.getTime() + (boxesDelivered + 1) * 30.4 * 86400000) : null,
          autoRenewal: chance(0.8),
          boxesTotal,
          boxesDelivered,
          cancelReason: subStatus === 'CANCELLED' ? pick(['too_expensive', 'dog_dislikes', 'moving_abroad']) : null,
          createdAt,
          updatedAt: createdAt,
        },
        select: { id: true },
      });
      await prisma.order.update({ where: { id: order.id }, data: { subscriptionId: sub.id } });
      tally.subscriptions++;
    }

    tally.byType[type] = (tally.byType[type] ?? 0) + 1;
    tally.byPayment[paymentStatus] = (tally.byPayment[paymentStatus] ?? 0) + 1;
    if (paymentStatus === 'PAID') tally.revenue += total;
  }

  // ── Make the low-stock card meaningful ────────────────────────────────────
  const invTargets = sellableProducts.slice(0, 3);
  if (invTargets[0]) await prisma.inventory.updateMany({ where: { productId: invTargets[0].id }, data: { quantity: 3, lowStockAlert: 10 } });
  if (invTargets[1]) await prisma.inventory.updateMany({ where: { productId: invTargets[1].id }, data: { quantity: 0, lowStockAlert: 10 } });
  if (invTargets[2]) await prisma.inventory.updateMany({ where: { productId: invTargets[2].id }, data: { quantity: 7, lowStockAlert: 10 } });

  console.log('\n✓ demo seed complete');
  console.log(`  users          ${USER_COUNT}`);
  console.log(`  orders         ${Object.entries(tally.byType).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  console.log(`  payments       ${Object.entries(tally.byPayment).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  console.log(`  subscriptions  ${tally.subscriptions}`);
  console.log(`  paid revenue   ₾${tally.revenue.toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error('✗ seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
