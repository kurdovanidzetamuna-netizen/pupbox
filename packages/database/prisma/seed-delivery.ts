import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const standard = await prisma.deliveryMethod.upsert({
    where: { id: 'delivery-standard' },
    update: {},
    create: { id: 'delivery-standard', name: 'Standard Delivery', description: 'Delivered in 3-5 business days', price: 5.99, freeThreshold: 60.00, estimatedDays: '3-5', isActive: true, sortOrder: 1 },
  });
  const express = await prisma.deliveryMethod.upsert({
    where: { id: 'delivery-express' },
    update: {},
    create: { id: 'delivery-express', name: 'Express Delivery', description: 'Delivered next business day', price: 12.99, freeThreshold: null, estimatedDays: '1', isActive: true, sortOrder: 2 },
  });
  console.log('✅ Delivery methods seeded');
}

main().catch(console.error).finally(() => prisma.$disconnect());
