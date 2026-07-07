import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding subscription plans...');

  const plans = [
    {
      name: '1 Month',
      slug: '1-month',
      durationValue: 1,
      durationUnit: 'MONTH' as const,
      boxCount: 1,
      price: 49.99,
      discountPercent: null,
      monthlyEquivPrice: 49.99,
      deliveryIncluded: true,
      autoRenewal: true,
      description: 'Try Pupbox for one month. No commitment.',
      benefits: ['1 curated box', 'Free delivery', '5-8 products per box', 'Cancel anytime'],
      badge: null,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '3 Months',
      slug: '3-months',
      durationValue: 3,
      durationUnit: 'MONTH' as const,
      boxCount: 3,
      price: 134.99,
      discountPercent: 10,
      monthlyEquivPrice: 44.99,
      deliveryIncluded: true,
      autoRenewal: true,
      description: 'Save 10% with a 3-month plan.',
      benefits: ['3 curated boxes', 'Free delivery', '5-8 products per box', '10% savings', 'Cancel anytime'],
      badge: 'popular',
      isActive: true,
      sortOrder: 2,
    },
    {
      name: '6 Months',
      slug: '6-months',
      durationValue: 6,
      durationUnit: 'MONTH' as const,
      boxCount: 6,
      price: 254.99,
      discountPercent: 15,
      monthlyEquivPrice: 42.49,
      deliveryIncluded: true,
      autoRenewal: true,
      description: 'Best value for dedicated dog parents.',
      benefits: ['6 curated boxes', 'Free delivery', '5-8 products per box', '15% savings', 'Priority packing', 'Exclusive items'],
      badge: 'best_value',
      isActive: true,
      sortOrder: 3,
    },
    {
      name: '1 Year',
      slug: '1-year',
      durationValue: 12,
      durationUnit: 'MONTH' as const,
      boxCount: 12,
      price: 479.99,
      discountPercent: 20,
      monthlyEquivPrice: 39.99,
      deliveryIncluded: true,
      autoRenewal: true,
      description: 'The ultimate commitment for the best value.',
      benefits: ['12 curated boxes', 'Free delivery', '6-10 products per box', '20% savings', 'Priority packing', 'Exclusive items', 'Free bonus gift'],
      badge: null,
      isActive: true,
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {},
      create: plan,
    });
  }

  console.log('✅ Subscription plans seeded');
}

main().catch(console.error).finally(() => prisma.$disconnect());
