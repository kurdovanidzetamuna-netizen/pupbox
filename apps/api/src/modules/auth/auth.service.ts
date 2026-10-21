import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { notify } from '../notifications/notify';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ReferralsService } from '../referrals/referrals.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { removeDogPhoto } from '../dogs/dog-photo';
import { Channel, confirmCode, normalisePhone, sendCode, verificationState } from './verification';

/** How long a "forgot password" link works. */
const RESET_TTL_MS = 60 * 60 * 1000;
/** Only the hash is stored; the link carries the token itself. */
const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private referrals: ReferralsService,
    private email: EmailService,
    private sms: SmsService,
  ) {}

  /** Sends a code to the account's email or phone (registration, or after changing the phone). */
  sendVerification(userId: string, channel: Channel) {
    return sendCode(this.prisma, this.email, this.sms, userId, channel);
  }

  confirmVerification(userId: string, channel: Channel, code: string) {
    return confirmCode(this.prisma, userId, channel, code);
  }

  /** Email addresses are case-insensitive: "Nino@…" and "nino@…" are one account. */
  private normalise(email: string) {
    return email.trim().toLowerCase();
  }

  private findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email: { equals: this.normalise(email), mode: 'insensitive' }, deletedAt: null } });
  }

  async register(dto: RegisterDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const phone = normalisePhone(dto.phone);
    if (!phone) throw new BadRequestException('Enter a valid mobile number');
    if (await this.prisma.user.findFirst({ where: { phone, phoneVerified: true, deletedAt: null }, select: { id: true } })) {
      throw new ConflictException('This phone number is already used by another account. Sign in instead.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: this.normalise(dto.email),
        language: dto.language ?? 'ka',
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone,
        passwordHash,
        // The sign-up tick covers both channels; each can be switched off later.
        marketingConsent: dto.marketingConsent === true,
        marketingConsentAt: dto.marketingConsent === true ? new Date() : null,
        marketingEmail: dto.marketingConsent === true,
        marketingSms: dto.marketingConsent === true,
        marketingEmailAt: dto.marketingConsent === true ? new Date() : null,
        marketingSmsAt: dto.marketingConsent === true ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        referralCode: true,
        createdAt: true,
      },
    });

    // A short code to share (the database default is a long random id).
    user.referralCode = await this.referrals.assignShortCode(user.id, user.firstName).catch(() => user.referralCode);

    // Apply referral code if provided
    if (dto.referralCode) {
      try { await this.referrals.applyReferralCode(user.id, dto.referralCode); } catch { /* ignore invalid codes */ }
    }

    // Fire-and-forget welcome email
    notify(this.prisma, user.id, 'WELCOME', { firstName: user.firstName }, '/account/dogs');
    this.email.sendWelcome({ email: user.email, firstName: user.firstName, language: dto.language ?? 'ka' }).catch(() => {});

    // Both codes go out now; the next screen asks for them. A failed send
    // doesn't undo the account — "Send again" is on that screen.
    for (const channel of ['EMAIL', 'PHONE'] as const) {
      await this.sendVerification(user.id, channel).catch((e) => this.logger.warn(`Verification ${channel} not sent for ${user.id}: ${e.message}`));
    }

    const token = this.signToken(user.id, user.email, 'customer');
    return { user, token, verification: verificationState({ emailVerified: false, phoneVerified: false }) };
  }

  async login(dto: LoginDto) {
    const user = await this.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'BLOCKED') throw new UnauthorizedException('Account is blocked');

    const token = this.signToken(user.id, user.email, 'customer');
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        referralCode: user.referralCode,
      },
      token,
      // Not verified yet: the site sends them to finish it before anything else.
      verification: verificationState(user),
    };
  }

  /**
   * Emails a one-time link to set a new password. Always answers the same
   * way, so the form can't be used to find out who has an account.
   */
  async forgotPassword(email: string) {
    const user = await this.findByEmail(email);
    if (user && user.status !== 'BLOCKED') {
      const raw = crypto.randomBytes(32).toString('base64url');
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
        }),
      ]);
      this.email.sendPasswordReset({ email: user.email, firstName: user.firstName, language: user.language, token: raw })
        .catch((e) => this.logger.error(`Password reset email failed: ${e.message}`));
    }
    return { ok: true };
  }

  /** Sets the new password, signs out every other session, and signs this one in. */
  async resetPassword(token: string, password: string) {
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!row || row.usedAt || row.expiresAt < new Date() || row.user.deletedAt || row.user.status === 'BLOCKED') {
      throw new BadRequestException('This link has expired or was already used. Ask for a new one.');
    }
    // Whole seconds, like a token's iat: the token issued below stays valid,
    // every earlier one is refused by JwtStrategy.
    const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(password, 12), passwordChangedAt: changedAt } }),
      this.prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: row.userId, id: { not: row.id } } }),
    ]);
    const u = row.user;
    return {
      user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName },
      token: this.signToken(u.id, u.email, 'customer'),
    };
  }

  /** A new password from inside the account: checks the old one, signs out every other session, keeps this one. */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new BadRequestException('Your current password is not right.');
    const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12), passwordChangedAt: changedAt } });
    await this.prisma.passwordResetToken.deleteMany({ where: { userId } });
    return { token: this.signToken(user.id, user.email, 'customer') };
  }

  /**
   * The customer's right to erasure. Personal details are wiped; orders and
   * payments stay (with no name, contact or street attached) because the law
   * requires keeping financial records. A running subscription must be
   * cancelled first, so the cancellation and refund rules apply to it.
   */
  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new BadRequestException('Account not found');
    if (!(await bcrypt.compare(password, user.passwordHash))) throw new BadRequestException('Your password is not right.');
    const running = await this.prisma.customerSubscription.count({ where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } } });
    if (running) throw new BadRequestException('Cancel your subscription first, then delete the account.');

    const now = new Date();
    const photos = await this.prisma.dog.findMany({ where: { userId, photoUrl: { not: null } }, select: { photoUrl: true } });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`, firstName: 'Deleted', lastName: 'customer', phone: null, avatarUrl: null,
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 4),
          status: 'BLOCKED', deletedAt: now, passwordChangedAt: now,
          marketingConsent: false, marketingConsentAt: null, marketingEmail: false, marketingSms: false, emailVerified: false, phoneVerified: false,
        },
      }),
      this.prisma.address.updateMany({ where: { userId }, data: { firstName: 'Deleted', lastName: 'customer', phone: '', addressLine1: '—', addressLine2: null, postalCode: null, deletedAt: now } }),
      this.prisma.dog.updateMany({ where: { userId }, data: { name: 'Deleted', breed: null, birthday: null, specialNotes: null, photoUrl: null, deletedAt: now } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.verificationCode.deleteMany({ where: { userId } }),
      this.prisma.cart.deleteMany({ where: { userId } }),
    ]);
    for (const p of photos) await removeDogPhoto(p.photoUrl);
    this.logger.log(`Account ${userId} deleted at the customer's request`);
    return { ok: true };
  }

  private signToken(userId: string, email: string, role: string) {
    return this.jwt.sign({ sub: userId, email, role });
  }
}
