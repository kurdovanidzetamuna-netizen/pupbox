import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { notify } from '../notifications/notify';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { shopSettings } from '../settings/settings';

/** What the inviter gets once their friend's first order sticks (the site says ₾10). */
const REWARD_GEL = 10;
/** Payment states where the money was taken. */
const COLLECTED = ['PAID', 'PARTIALLY_REFUNDED'] as const;

@Injectable()
export class ReferralsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReferralsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService, private email: EmailService) {}

  onModuleInit() {
    const run = () =>
      this.grantDueRewards()
        .then((n) => { if (n) this.logger.log(`Granted ${n} referral reward(s)`); })
        .catch((e) => this.logger.error(`Referral rewards failed: ${e.message}`));
    setTimeout(run, 25_000).unref();
    this.timer = setInterval(run, 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  // Customer: get my referral code & stats
  async getMyReferrals(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (!user) throw new NotFoundException('User not found');

    const referrals = await this.prisma.referral.findMany({
      where: { inviterId: userId },
      include: { invited: { select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: referrals.length,
      registered: referrals.filter(r => r.status !== 'INVITED').length,
      rewarded: referrals.filter(r => r.status === 'REWARD_GRANTED').length,
    };

    return { referralCode: user.referralCode, stats, referrals };
  }

  /**
   * Links a new customer to whoever invited them. Only before their first
   * paid order: a code added later would reward an order the friend was
   * going to make anyway.
   */
  async applyReferralCode(newUserId: string, code: string) {
    if (typeof code !== 'string' || !code.trim() || code.length > 40) throw new BadRequestException('Invalid referral code');
    const inviter = await this.prisma.user.findUnique({ where: { referralCode: code.trim() } });
    if (!inviter || inviter.deletedAt) throw new BadRequestException('Invalid referral code');
    if (inviter.id === newUserId) throw new BadRequestException('Cannot refer yourself');

    const existing = await this.prisma.referral.findFirst({ where: { invitedId: newUserId } });
    if (existing) return existing; // already applied

    const ordered = await this.prisma.order.count({ where: { userId: newUserId, payments: { some: { status: { in: [...COLLECTED, 'REFUNDED'] } } } } });
    if (ordered) throw new BadRequestException('A referral code can only be added before your first order.');

    return this.prisma.referral.create({
      data: { inviterId: inviter.id, invitedId: newUserId, status: 'REGISTERED' },
    });
  }

  /**
   * Rewards inviters whose friend's first order has stuck: paid, not
   * cancelled or refunded, and past the free-cancellation window — so paying
   * and cancelling straight away can't earn a coupon. Runs hourly.
   */
  async grantDueRewards() {
    const { freeCancelHours } = await shopSettings(this.prisma);
    const settledBefore = new Date(Date.now() - freeCancelHours * 3600_000);
    const due = await this.prisma.referral.findMany({
      where: {
        status: 'REGISTERED',
        inviter: { deletedAt: null },
        invited: {
          orders: {
            some: {
              total: { gt: 0 },
              status: { notIn: ['PENDING', 'CANCELLED', 'REFUNDED', 'FAILED'] },
              payments: { some: { status: { in: [...COLLECTED] }, paidAt: { lte: settledBefore } } },
            },
          },
        },
      },
      select: { id: true },
    });
    let granted = 0;
    for (const r of due) {
      try {
        if (await this.grant(r.id)) granted++;
      } catch (e: any) {
        this.logger.error(`Referral ${r.id} not rewarded, will retry: ${e?.message ?? e}`);
      }
    }
    return granted;
  }

  /** Claims the referral first, so two runs can't both issue a coupon. */
  private async grant(referralId: string) {
    const { count } = await this.prisma.referral.updateMany({ where: { id: referralId, status: 'REGISTERED' }, data: { status: 'FIRST_ORDER_COMPLETED' } });
    if (!count) return false;
    const referral = await this.prisma.referral.findUniqueOrThrow({
      where: { id: referralId },
      select: { inviterId: true, inviter: { select: { email: true, firstName: true, language: true } } },
    });
    // Random: the code is the only thing standing between it and anyone else.
    const couponCode = `REF-${randomBytes(5).toString('hex').toUpperCase()}`;
    try {
      await this.prisma.$transaction([
        this.prisma.coupon.create({
          data: {
            code: couponCode,
            description: `Referral reward for ${referral.inviter.email}`,
            discountType: 'FIXED',
            discountValue: REWARD_GEL,
            usageLimit: 1,
            perUserLimit: 1,
            isActive: true,
          },
        }),
        this.prisma.referral.update({
          where: { id: referralId },
          data: { status: 'REWARD_GRANTED', rewardType: 'fixed', rewardValue: REWARD_GEL, rewardedAt: new Date() },
        }),
      ]);
    } catch (e) {
      await this.prisma.referral.update({ where: { id: referralId }, data: { status: 'REGISTERED' } });
      throw e;
    }
    notify(this.prisma, referral.inviterId, 'REFERRAL_REWARD', { couponCode, amount: REWARD_GEL }, '/account/referrals');
    this.email
      .sendReferralReward({ email: referral.inviter.email, firstName: referral.inviter.firstName, language: referral.inviter.language, couponCode })
      .catch((e) => this.logger.error(`Referral reward email failed: ${e.message}`));
    return true;
  }

  // Admin: all referrals
  async adminList(page = 1, limit = 20) {
    page = Math.max(1, page || 1);
    limit = Math.min(100, Math.max(1, limit || 20));
    const skip = (page - 1) * limit;
    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        include: {
          inviter: { select: { id: true, email: true, firstName: true, lastName: true } },
          invited: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.referral.count(),
    ]);
    return { referrals, total, page, limit };
  }
}
