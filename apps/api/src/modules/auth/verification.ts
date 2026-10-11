import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { PrismaService } from '../prisma/prisma.service';
import type { EmailService } from '../email/email.service';
import type { SmsService } from '../sms/sms.service';

export type Channel = 'EMAIL' | 'PHONE';

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60_000;
const MAX_PER_HOUR = 5;

/**
 * A phone number from any country in one international form (+995599123456).
 * Without a +country code it's read as Georgian. Null if it isn't a real
 * number for that country.
 */
export function normalisePhone(raw: unknown): string | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const parsed = parsePhoneNumberFromString(text.startsWith('00') ? `+${text.slice(2)}` : text, 'GE');
  return parsed && parsed.isValid() ? parsed.number : null;
}

const hash = (userId: string, code: string) => crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex');

/** Sends a fresh code to the account's email or phone. */
export async function sendCode(prisma: PrismaService, email: EmailService, sms: SmsService, userId: string, channel: Channel) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true, firstName: true, language: true, emailVerified: true, phoneVerified: true } });
  if (!user) throw new BadRequestException('Account not found');
  if (channel === 'EMAIL' ? user.emailVerified : user.phoneVerified) return { sent: false, alreadyVerified: true };
  const target = channel === 'EMAIL' ? user.email : user.phone;
  if (!target) throw new BadRequestException('Add your phone number first.');

  const recent = await prisma.verificationCode.findMany({
    where: { userId, channel, createdAt: { gt: new Date(Date.now() - 3600_000) } },
    orderBy: { createdAt: 'desc' }, select: { createdAt: true, target: true },
  });
  // The one-a-minute wait is per number/address: a corrected phone number
  // gets its code straight away. The hourly cap counts every code.
  const lastHere = recent.find((r) => r.target === target);
  const wait = lastHere ? Math.ceil((lastHere.createdAt.getTime() + RESEND_AFTER_MS - Date.now()) / 1000) : 0;
  if (wait > 0) throw new HttpException(`Please wait ${wait} seconds before asking for a new code.`, HttpStatus.TOO_MANY_REQUESTS);
  if (recent.length >= MAX_PER_HOUR) throw new HttpException('Too many codes asked for. Try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);

  const code = String(crypto.randomInt(100000, 1000000));
  // Older codes stop working once a new one is sent.
  await prisma.verificationCode.updateMany({ where: { userId, channel, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.verificationCode.create({ data: { userId, channel, target, codeHash: hash(userId, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) } });

  if (channel === 'EMAIL') {
    await email.sendVerificationCode({ email: target, firstName: user.firstName, language: user.language, code });
  } else {
    const text = user.language === 'en' ? `Pupbox code: ${code}. Valid for 10 minutes.` : `Pupbox-ის კოდი: ${code}. მოქმედებს 10 წუთი.`;
    await sms.send(target, text);
  }
  return { sent: true, to: channel === 'EMAIL' ? target : `${target.slice(0, 7)}•••${target.slice(-2)}` };
}

/** Checks a code; on success marks the email or phone verified, and the account active once both are. */
export async function confirmCode(prisma: PrismaService, userId: string, channel: Channel, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true, emailVerified: true, phoneVerified: true, status: true } });
  if (!user) throw new BadRequestException('Account not found');
  if (channel === 'EMAIL' ? user.emailVerified : user.phoneVerified) return verificationState(user);

  const row = await prisma.verificationCode.findFirst({ where: { userId, channel, usedAt: null }, orderBy: { createdAt: 'desc' } });
  const target = channel === 'EMAIL' ? user.email : user.phone;
  if (!row || row.expiresAt < new Date() || row.target !== target) throw new BadRequestException('This code has expired. Ask for a new one.');
  if (row.attempts >= MAX_ATTEMPTS) throw new BadRequestException('Too many wrong tries. Ask for a new code.');

  const ok = crypto.timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(hash(userId, String(code ?? '').replace(/\D/g, ''))));
  if (!ok) {
    await prisma.verificationCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - row.attempts - 1;
    throw new BadRequestException(left > 0 ? `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Ask for a new code.');
  }

  // One verified number per account: stops a single phone opening many accounts (e.g. for referral coupons).
  if (channel === 'PHONE') {
    const taken = await prisma.user.findFirst({ where: { id: { not: userId }, phone: target, phoneVerified: true, deletedAt: null }, select: { id: true } });
    if (taken) throw new BadRequestException('This phone number is already used by another account.');
  }

  await prisma.verificationCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const next = { emailVerified: channel === 'EMAIL' ? true : user.emailVerified, phoneVerified: channel === 'PHONE' ? true : user.phoneVerified };
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { ...next, ...(next.emailVerified && next.phoneVerified && user.status === 'UNVERIFIED' ? { status: 'ACTIVE' as const } : {}) },
    select: { emailVerified: true, phoneVerified: true },
  });
  return verificationState(updated);
}

export const verificationState = (u: { emailVerified: boolean; phoneVerified: boolean }) => ({
  emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified,
  verified: u.emailVerified && u.phoneVerified,
});
