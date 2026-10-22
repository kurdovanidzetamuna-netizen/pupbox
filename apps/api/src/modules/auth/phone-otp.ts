import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import type { PrismaService } from '../prisma/prisma.service';
import type { SmsService } from '../sms/sms.service';
import { normalisePhone } from './verification';
import { smsSettings } from '../sms/sms-settings';

/**
 * One-time SMS codes for a phone number that isn't confirmed on an account
 * yet: at sign-up (before the account exists) and when someone changes their
 * number. Same rules as account codes — 6 digits, 10 minutes, 5 tries, one a
 * minute and 5 an hour per number — plus a cap per visitor (IP), since the
 * sign-up one is open to anyone and every SMS costs money.
 *
 * Sign-up: a right code returns a proof (valid 30 minutes, used once) that
 * the sign-up form sends with the new account, which is then created with
 * the phone already confirmed. Change: a right code switches the number.
 */
export type OtpPurpose = 'SIGNUP' | 'CHANGE';
const PROOF_TTL_MS = 30 * 60_000;
const MAX_ATTEMPTS = 5;
// Generous: many mobile customers share one address (carrier NAT). The per-number limits above are the real guard.
const MAX_PER_IP_HOUR = 40;

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const codeHash = (phone: string, code: string) => sha(`otp:${phone}:${code}`);
// Same test codes as account verification (verification.ts).
const testCode = () => (/^\d{6}$/.test(process.env.TEST_LOGIN_CODE ?? '') ? process.env.TEST_LOGIN_CODE! : null);
const devCode = () => testCode() ?? (process.env.NODE_ENV === 'development' ? '111111' : null);

function phoneOrFail(raw: unknown) {
  const phone = normalisePhone(raw);
  if (!phone) throw new BadRequestException('Enter a valid mobile number');
  return phone;
}

export async function sendPhoneOtp(prisma: PrismaService, sms: SmsService, o: { phone: unknown; purpose: OtpPurpose; userId?: string; ip?: string; language?: string }) {
  const phone = phoneOrFail(o.phone);
  const { codes } = await smsSettings(prisma);
  const RESEND_AFTER_MS = codes.resendSeconds * 1000, MAX_PER_HOUR = codes.perHour, CODE_TTL_MS = codes.validMinutes * 60_000;
  // A number confirmed on someone else's account can't be taken over.
  const owner = await prisma.user.findFirst({ where: { phone, phoneVerified: true, deletedAt: null }, select: { id: true } });
  if (owner && owner.id !== o.userId) {
    throw new BadRequestException(o.purpose === 'SIGNUP' ? 'This phone number is already used by another account. Sign in instead.' : 'This phone number is already used by another account.');
  }
  if (o.purpose === 'CHANGE' && owner?.id === o.userId) throw new BadRequestException('This is already your confirmed number.');

  const hourAgo = new Date(Date.now() - 3600_000);
  const recent = await prisma.phoneOtp.findMany({ where: { phone, createdAt: { gt: hourAgo } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  const wait = recent[0] ? Math.ceil((recent[0].createdAt.getTime() + RESEND_AFTER_MS - Date.now()) / 1000) : 0;
  if (wait > 0) throw new HttpException(`Please wait ${wait} seconds before asking for a new code.`, HttpStatus.TOO_MANY_REQUESTS);
  if (recent.length >= MAX_PER_HOUR) throw new HttpException('Too many codes asked for. Try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
  if (o.ip && (await prisma.phoneOtp.count({ where: { ip: o.ip, createdAt: { gt: hourAgo } } })) >= MAX_PER_IP_HOUR) {
    throw new HttpException('Too many codes asked for. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }

  const code = devCode() ?? String(crypto.randomInt(100000, 1000000));
  // Older codes for this number and purpose stop working.
  await prisma.phoneOtp.updateMany({ where: { phone, purpose: o.purpose, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.phoneOtp.create({ data: { phone, purpose: o.purpose, userId: o.userId ?? null, codeHash: codeHash(phone, code), expiresAt: new Date(Date.now() + CODE_TTL_MS), ip: o.ip ?? null } });

  if (!testCode()) {
    const text = o.language === 'en' ? `PupBox code: ${code}. Valid for ${codes.validMinutes} minutes.` : `PupBox-ის კოდი: ${code}. მოქმედებს ${codes.validMinutes} წუთი.`;
    await sms.send(phone, text, { kind: 'OTP', userId: o.userId, secret: code });
  }
  return { sent: true, to: `${phone.slice(0, 7)}•••${phone.slice(-2)}`, resendIn: RESEND_AFTER_MS / 1000 };
}

/** Checks a code. Sign-up: returns a proof. Change: switches the user's number and marks it confirmed. */
export async function verifyPhoneOtp(prisma: PrismaService, o: { phone: unknown; code: unknown; purpose: OtpPurpose; userId?: string }) {
  const phone = phoneOrFail(o.phone);
  const row = await prisma.phoneOtp.findFirst({
    where: { phone, purpose: o.purpose, usedAt: null, ...(o.purpose === 'CHANGE' ? { userId: o.userId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  if (!row || row.expiresAt < new Date()) throw new BadRequestException('This code has expired. Ask for a new one.');
  if (row.attempts >= MAX_ATTEMPTS) throw new BadRequestException('Too many wrong tries. Ask for a new code.');
  const ok = crypto.timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(codeHash(phone, String(o.code ?? '').replace(/\D/g, ''))));
  if (!ok) {
    await prisma.phoneOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - row.attempts - 1;
    throw new BadRequestException(left > 0 ? `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong tries. Ask for a new code.');
  }
  const owner = await prisma.user.findFirst({ where: { phone, phoneVerified: true, deletedAt: null, ...(o.userId ? { id: { not: o.userId } } : {}) }, select: { id: true } });
  if (owner) throw new BadRequestException('This phone number is already used by another account.');

  if (o.purpose === 'SIGNUP') {
    const proof = crypto.randomBytes(24).toString('hex');
    await prisma.phoneOtp.update({ where: { id: row.id }, data: { usedAt: new Date(), proofHash: sha(proof), proofUntil: new Date(Date.now() + PROOF_TTL_MS) } });
    return { verified: true, phone, proof };
  }
  await prisma.phoneOtp.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const user = await prisma.user.update({
    where: { id: o.userId },
    data: { phone, phoneVerified: true, phoneVerifiedAt: new Date(), phoneVerifiedVia: 'SMS' },
    select: { id: true, emailVerified: true, phoneVerified: true, status: true },
  });
  if (user.emailVerified && user.status === 'UNVERIFIED') await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
  return { verified: true, phone };
}

/** Uses up a sign-up proof for this number. True if it was good. */
export async function useSignupProof(prisma: PrismaService, phone: string, proof: string) {
  const { count } = await prisma.phoneOtp.updateMany({
    where: { proofHash: sha(proof), phone, purpose: 'SIGNUP', proofUsedAt: null, proofUntil: { gt: new Date() } },
    data: { proofUsedAt: new Date() },
  });
  return count === 1;
}
