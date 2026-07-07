import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed languages
  await prisma.language.upsert({
    where: { code: 'en' },
    update: {},
    create: { code: 'en', name: 'English', nativeName: 'English', isDefault: true, isActive: true },
  });
  await prisma.language.upsert({
    where: { code: 'ka' },
    update: {},
    create: { code: 'ka', name: 'Georgian', nativeName: 'ქართული', isActive: true },
  });
  await prisma.language.upsert({
    where: { code: 'ru' },
    update: {},
    create: { code: 'ru', name: 'Russian', nativeName: 'Русский', isActive: true },
  });

  // Seed permissions
  const permissions = [
    { key: 'dashboard.view', module: 'dashboard', description: 'View dashboard' },
    { key: 'users.view', module: 'users', description: 'View customers' },
    { key: 'users.edit', module: 'users', description: 'Edit customers' },
    { key: 'users.block', module: 'users', description: 'Block/unblock customers' },
    { key: 'products.view', module: 'products', description: 'View products' },
    { key: 'products.create', module: 'products', description: 'Create products' },
    { key: 'products.edit', module: 'products', description: 'Edit products' },
    { key: 'products.delete', module: 'products', description: 'Delete products' },
    { key: 'subscriptions.view', module: 'subscriptions', description: 'View subscriptions' },
    { key: 'subscriptions.manage', module: 'subscriptions', description: 'Manage subscriptions' },
    { key: 'orders.view', module: 'orders', description: 'View orders' },
    { key: 'orders.manage', module: 'orders', description: 'Manage orders' },
    { key: 'payments.view', module: 'payments', description: 'View payments' },
    { key: 'payments.refund', module: 'payments', description: 'Refund payments' },
    { key: 'cms.view', module: 'cms', description: 'View CMS' },
    { key: 'cms.edit', module: 'cms', description: 'Edit CMS content' },
    { key: 'reports.view', module: 'reports', description: 'View reports' },
    { key: 'admin.manage', module: 'admin', description: 'Manage admin users' },
    { key: 'delivery.manage', module: 'delivery', description: 'Manage delivery settings' },
    { key: 'coupons.manage', module: 'coupons', description: 'Manage coupons' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }

  // Seed Super Admin role with all permissions
  const allPerms = await prisma.permission.findMany();
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Full access to everything',
      isSystem: true,
      permissions: {
        create: allPerms.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  // Seed other roles
  await prisma.role.upsert({
    where: { name: 'Content Manager' },
    update: {},
    create: { name: 'Content Manager', description: 'Manages CMS and blog content' },
  });
  await prisma.role.upsert({
    where: { name: 'Operations Manager' },
    update: {},
    create: { name: 'Operations Manager', description: 'Manages orders and delivery' },
  });
  await prisma.role.upsert({
    where: { name: 'Finance Manager' },
    update: {},
    create: { name: 'Finance Manager', description: 'Manages payments and reports' },
  });
  await prisma.role.upsert({
    where: { name: 'Customer Support' },
    update: {},
    create: { name: 'Customer Support', description: 'Handles customer issues' },
  });

  // Seed Super Admin user
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  await prisma.adminUser.upsert({
    where: { email: 'admin@pupbox.ge' },
    update: {},
    create: {
      email: 'admin@pupbox.ge',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Seed complete');
  console.log('Admin login: admin@pupbox.ge / Admin@123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
