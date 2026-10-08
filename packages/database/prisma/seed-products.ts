import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding products...');

  // Categories
  const treats = await prisma.productCategory.upsert({
    where: { slug: 'treats' },
    update: {},
    create: { name: 'Treats', slug: 'treats', description: 'Delicious dog treats', isActive: true, sortOrder: 1 },
  });
  const toys = await prisma.productCategory.upsert({
    where: { slug: 'toys' },
    update: {},
    create: { name: 'Toys', slug: 'toys', description: 'Fun dog toys', isActive: true, sortOrder: 2 },
  });
  const accessories = await prisma.productCategory.upsert({
    where: { slug: 'accessories' },
    update: {},
    create: { name: 'Accessories', slug: 'accessories', description: 'Dog accessories', isActive: true, sortOrder: 3 },
  });
  const grooming = await prisma.productCategory.upsert({
    where: { slug: 'grooming' },
    update: {},
    create: { name: 'Grooming', slug: 'grooming', description: 'Grooming supplies', isActive: true, sortOrder: 4 },
  });

  // Tags
  const tagNatural = await prisma.productTag.upsert({ where: { slug: 'natural' }, update: {}, create: { name: 'Natural', slug: 'natural' } });
  const tagSmall = await prisma.productTag.upsert({ where: { slug: 'small-dogs' }, update: {}, create: { name: 'Small Dogs', slug: 'small-dogs' } });
  const tagBestseller = await prisma.productTag.upsert({ where: { slug: 'bestseller' }, update: {}, create: { name: 'Bestseller', slug: 'bestseller' } });

  // Products
  const products = [
    {
      name: 'Chicken Jerky Treats',
      slug: 'chicken-jerky-treats',
      sku: 'TRT-001',
      shortDescription: '100% natural chicken jerky strips for dogs',
      description: 'Made from free-range chicken with no artificial preservatives. Perfect as a daily treat or training reward.',
      price: 12.99,
      salePrice: 9.99,
      categoryId: treats.id,
      status: 'ACTIVE' as const,
      standaloneSale: true,
      includedInBox: true,
      stock: 150,
      tagIds: [tagNatural.id, tagBestseller.id],
    },
    {
      name: 'Rope Tug Toy',
      slug: 'rope-tug-toy',
      sku: 'TOY-001',
      shortDescription: 'Durable braided rope toy for interactive play',
      description: 'Strong cotton rope toy great for tug-of-war and dental health. Safe for all dog sizes.',
      price: 8.99,
      categoryId: toys.id,
      status: 'ACTIVE' as const,
      standaloneSale: true,
      includedInBox: true,
      stock: 200,
      tagIds: [tagBestseller.id],
    },
    {
      name: 'Squeaky Plush Bear',
      slug: 'squeaky-plush-bear',
      sku: 'TOY-002',
      shortDescription: 'Soft plush bear toy with built-in squeaker',
      description: 'Ultra-soft plush toy with durable squeaker. Ideal for gentle play and cuddling.',
      price: 11.99,
      categoryId: toys.id,
      status: 'ACTIVE' as const,
      standaloneSale: true,
      includedInBox: true,
      stock: 80,
      tagIds: [tagSmall.id],
    },
    {
      name: 'Personalised Dog Bowl',
      slug: 'personalised-dog-bowl',
      sku: 'ACC-001',
      shortDescription: 'Stainless steel bowl with engraved name',
      description: 'Food-grade stainless steel bowl. Dishwasher safe. Available in 3 sizes.',
      price: 19.99,
      categoryId: accessories.id,
      status: 'ACTIVE' as const,
      standaloneSale: true,
      includedInBox: false,
      stock: 60,
      tagIds: [],
    },
    {
      name: 'Paw Balm',
      slug: 'paw-balm',
      sku: 'GRM-001',
      shortDescription: 'Moisturising paw balm for dry and cracked paws',
      description: 'Natural shea butter and beeswax formula. Softens and protects paw pads from harsh weather.',
      price: 7.49,
      categoryId: grooming.id,
      status: 'ACTIVE' as const,
      standaloneSale: true,
      includedInBox: true,
      stock: 120,
      tagIds: [tagNatural.id],
    },
    {
      name: 'Blueberry Biscuits',
      slug: 'blueberry-biscuits',
      sku: 'TRT-002',
      shortDescription: 'Antioxidant-rich blueberry training treats',
      description: 'Baked with real blueberries and oats. Low calorie, perfect for training sessions.',
      price: 9.99,
      categoryId: treats.id,
      status: 'ACTIVE' as const,
      standaloneSale: true,
      includedInBox: true,
      stock: 180,
      tagIds: [tagNatural.id, tagSmall.id],
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;

    const { stock, tagIds, ...data } = p;
    await prisma.product.create({
      data: {
        ...data,
        tags: tagIds.length ? { create: tagIds.map((id) => ({ tagId: id })) } : undefined,
        inventory: { create: { quantity: stock, lowStockAlert: 10 } },
      },
    });
  }

  console.log('✅ Products seeded');
}

main().catch(console.error).finally(() => prisma.$disconnect());
