import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { resolveAdminPassword } from './admin-password';

/**
 * Sets an admin's password from the command line, for when nobody can sign
 * in to change it on the Users page (e.g. it is still the old default).
 *
 *   ADMIN_PASSWORD='…' npx ts-node prisma/set-admin-password.ts [email]
 *
 * Without ADMIN_PASSWORD (development only) a random one is generated and
 * printed once. The email defaults to ADMIN_EMAIL, then admin@pupbox.ge.
 */
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@pupbox.ge';
  const admin = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (!admin) throw new Error(`No admin with email ${email}`);

  const { password, generated } = resolveAdminPassword();
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });

  console.log(`✓ password updated for ${email}`);
  if (generated) console.log(`  new password (shown once, store it in your password manager): ${password}`);
}

main()
  .catch((e) => { console.error('✗', e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
