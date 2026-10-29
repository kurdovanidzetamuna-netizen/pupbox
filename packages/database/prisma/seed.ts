import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { resolveAdminPassword } from './admin-password';

const prisma = new PrismaClient();

/** Ready-made roles an install starts with. */
const PRESET_ROLES = [
  { name: 'Content Manager', description: 'Edits pages, blog and FAQ', keys: ['dashboard.view', 'cms.view', 'cms.edit', 'products.view', 'marketing.view'] },
  { name: 'Marketing Manager', description: 'Ads, analytics and Google: SEO & tracking, pages, promo codes, reports', keys: ['dashboard.view', 'reports.view', 'marketing.view', 'marketing.manage', 'cms.view', 'cms.edit', 'coupons.manage', 'products.view', 'crm.view'] },
  { name: 'Operations Manager', description: 'Orders, stock and monthly boxes', keys: ['dashboard.view', 'orders.view', 'orders.manage', 'subscriptions.view', 'subscriptions.manage', 'products.view', 'products.edit', 'users.view'] },
  { name: 'Finance Manager', description: 'Reports, refunds and coupons', keys: ['dashboard.view', 'reports.view', 'orders.view', 'payments.refund', 'coupons.manage', 'subscriptions.view'] },
  { name: 'Customer Support', description: 'Helps customers with orders and plans', keys: ['dashboard.view', 'orders.view', 'subscriptions.view', 'subscriptions.manage', 'users.view', 'users.block', 'crm.view', 'crm.manage'] },
  { name: 'Head of CRM', description: 'Owns retention and campaigns: CRM, exports, coupons, reports', keys: ['dashboard.view', 'reports.view', 'users.view', 'crm.view', 'crm.export', 'crm.manage', 'coupons.manage', 'orders.view', 'subscriptions.view'] },
  { name: 'CRM Manager', description: 'Runs campaigns: CRM, exports and coupons', keys: ['dashboard.view', 'users.view', 'crm.view', 'crm.export', 'crm.manage', 'coupons.manage', 'subscriptions.view'] },
  { name: 'CRM Specialist', description: 'Works the CRM lists; no exports', keys: ['dashboard.view', 'users.view', 'crm.view', 'subscriptions.view'] },
];

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
    { key: 'users.block', module: 'users', description: 'Block/unblock customers' },
    { key: 'products.view', module: 'products', description: 'View products' },
    { key: 'products.create', module: 'products', description: 'Create products' },
    { key: 'products.edit', module: 'products', description: 'Edit products' },
    { key: 'products.delete', module: 'products', description: 'Delete products' },
    { key: 'subscriptions.view', module: 'subscriptions', description: 'View subscriptions' },
    { key: 'subscriptions.manage', module: 'subscriptions', description: 'Manage subscriptions' },
    { key: 'orders.view', module: 'orders', description: 'View orders' },
    { key: 'orders.manage', module: 'orders', description: 'Manage orders' },
    { key: 'payments.refund', module: 'payments', description: 'Refund payments' },
    { key: 'cms.view', module: 'cms', description: 'View CMS' },
    { key: 'cms.edit', module: 'cms', description: 'Edit CMS content' },
    { key: 'reports.view', module: 'reports', description: 'View reports' },
    { key: 'admin.manage', module: 'admin', description: 'Manage admin users' },
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

  // Starting roles. Permissions only on first creation; admin edits them after.
  // (The API keeps Super Admin's list complete at startup.)
  for (const r of PRESET_ROLES) {
    const perms = await prisma.permission.findMany({ where: { key: { in: r.keys } }, select: { id: true } });
    await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name, description: r.description, permissions: { create: perms.map((p) => ({ permissionId: p.id })) } },
    });
  }

  // Seed Super Admin user. The password comes from ADMIN_PASSWORD; a fixed
  // default here would be the same publicly known login on every server.
  // An existing admin is left untouched (update: {}).
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pupbox.ge';
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail }, select: { id: true } });
  const adminPassword = existingAdmin ? null : resolveAdminPassword();
  const passwordHash = adminPassword ? await bcrypt.hash(adminPassword.password, 12) : '';
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Seed complete');
  if (!adminPassword) console.log(`Admin ${adminEmail} already exists; password unchanged.`);
  else if (adminPassword.generated) console.log(`Admin login: ${adminEmail} / ${adminPassword.password}  (generated, shown once)`);
  else console.log(`Admin login: ${adminEmail} / the ADMIN_PASSWORD you set`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
