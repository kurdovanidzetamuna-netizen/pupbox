import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ReferralsService } from '../referrals/referrals.service';
import { EmailService } from '../email/email.service';

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
  ) {}

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

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: this.normalise(dto.email),
        language: dto.language ?? 'ka',
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
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

    // Apply referral code if provided
    if (dto.referralCode) {
      try { await this.referrals.applyReferralCode(user.id, dto.referralCode); } catch { /* ignore invalid codes */ }
    }

    // Fire-and-forget welcome email
    this.email.sendWelcome({ email: user.email, firstName: user.firstName, language: dto.language ?? 'ka' }).catch(() => {});

    const token = this.signToken(user.id, user.email, 'customer');
    return { user, token };
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

  private signToken(userId: string, email: string, role: string) {
    return this.jwt.sign({ sub: userId, email, role });
  }
}
