import { randomBytes } from 'crypto';

/** The password every early seed shipped with. Never accept it again. */
export const RETIRED_DEFAULT_PASSWORDS = ['Admin@123456'];

/**
 * The super admin's password: ADMIN_PASSWORD when set, otherwise a random
 * one generated for this run (development only — production must set it).
 * `generated` tells the caller to show it once, since nobody else knows it.
 */
export function resolveAdminPassword(): { password: string; generated: boolean } {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) {
    if (RETIRED_DEFAULT_PASSWORDS.includes(fromEnv)) throw new Error('ADMIN_PASSWORD is the old public default. Choose another.');
    if (fromEnv.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
    return { password: fromEnv, generated: false };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set ADMIN_PASSWORD to create the admin account in production.');
  }
  return { password: randomBytes(12).toString('base64url'), generated: true };
}
