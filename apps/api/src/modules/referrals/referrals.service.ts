import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, ReferralStatus } from '@prisma/client';
import { dateRange } from '../reports/reports.service';
import { notify } from '../notifications/notify';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { shopSettings } from '../settings/settings';

/** What the inviter gets once their friend's first order sticks (the site says ₾10). */
const REWARD_GEL = 10;
/** Payment states where the money was taken. */
const COLLECTED = ['PAID', 'PARTIALLY_REFUNDED'] as const;

// Georgian letters as Latin, so ნინო's code reads NINO.
const KA_LATIN: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k', ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh',
  რ: 'r', ს: 's', ტ: 't', უ: 'u', ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts', ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};
// No 0/O, 1/I/L: a code is often read out or typed from a message.
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
/** A short code a friend can read and type: NINO-4K7P. */
function codeFor(firstName?: string | null) {
  const latin = [...(firstName ?? '')].map((c) => KA_LATIN[c] ?? c).join('').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8);
  const tail = [...randomBytes(4)].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
  return `${latin.length >= 2 ? latin : 'PUPBOX'}-${tail}`;
}

@Injectable()
export class ReferralsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReferralsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService, private email: EmailService) {}

  onModuleInit() {
    // Older accounts got a long random id as their code; give them a short one.
    setTimeout(() => this.shortenOldCodes().catch((e) => this.logger.error(`Referral codes not shortened: ${e.message}`)), 5_000).unref();
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

  /** Gives a user a short, readable code (NINO-4K7P); tries again on the rare clash. */
  async assignShortCode(userId: string, firstName?: string | null): Promise<string> {
    for (let i = 0; i < 6; i++) {
      const code = codeFor(firstName);
      try {
        await this.prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
        return code;
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new Error('Could not find a free referral code');
  }

  /** Long codes (cuids, no dash) become short ones. Safe to run on every start. */
  async shortenOldCodes() {
    const old = await this.prisma.user.findMany({ where: { NOT: { referralCode: { contains: '-' } } }, select: { id: true, firstName: true } });
    for (const u of old) await this.assignShortCode(u.id, u.firstName);
    if (old.length) this.logger.log(`Gave ${old.length} account(s) a short referral code`);
    return old.length;
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

    // What one friend's first order earns, so the page never hard-codes the amount.
    return { referralCode: user.referralCode, reward: REWARD_GEL, stats, referrals };
  }

  /**
   * Links a new customer to whoever invited them. Only before their first
   * paid order: a code added later would reward an order the friend was
   * going to make anyway.
   */
  async applyReferralCode(newUserId: string, code: string) {
    if (typeof code !== 'string' || !code.trim() || code.length > 40) throw new BadRequestException('Invalid referral code');
    // Typed by hand it may come in lower case: codes are stored in capitals.
    const inviter = await this.prisma.user.findUnique({ where: { referralCode: code.trim().toUpperCase() } });
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

  /**
   * Where a referral really is. "First order" is never stored (the reward step
   * goes straight from Registered), so it's read from the friend's orders: a
   * paid order that wasn't cancelled or refunded.
   */
  private paidFirstOrder(): Prisma.UserWhereInput {
    return { orders: { some: { total: { gt: 0 }, status: { notIn: ['PENDING', 'CANCELLED', 'REFUNDED', 'FAILED'] }, payments: { some: { status: { in: [...COLLECTED] } } } } } };
  }

  private adminWhere(f: ReferralFilters): Prisma.ReferralWhereInput {
    const and: Prisma.ReferralWhereInput[] = [];
    if (f.status === 'FIRST_ORDER_COMPLETED') and.push({ status: { in: ['REGISTERED', 'FIRST_ORDER_COMPLETED'] }, invited: this.paidFirstOrder() });
    else if (f.status === 'REGISTERED') and.push({ status: 'REGISTERED', NOT: { invited: this.paidFirstOrder() } });
    else if (f.status && ['INVITED', 'REWARD_GRANTED', 'CANCELLED'].includes(f.status)) and.push({ status: f.status as ReferralStatus });
    const range = dateRange(f.from, f.to);
    if (range) and.push({ createdAt: range });
    const q = f.q?.trim();
    if (q) {
      const person = (field: 'inviter' | 'invited'): Prisma.ReferralWhereInput => ({ [field]: { OR: [
        { email: { contains: q, mode: 'insensitive' } }, { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } },
      ] } });
      and.push({ OR: [person('inviter'), person('invited'), { inviter: { referralCode: { equals: q, mode: 'insensitive' } } }] });
    }
    return and.length ? { AND: and } : {};
  }

  private async adminRows(where: Prisma.ReferralWhereInput, skip?: number, take?: number) {
    const rows = await this.prisma.referral.findMany({
      where,
      include: {
        inviter: { select: { id: true, email: true, firstName: true, lastName: true, referralCode: true } },
        invited: { select: { id: true, email: true, firstName: true, lastName: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    // Which friends have a paid first order, in one query.
    const ids = rows.map((r) => r.invitedId).filter(Boolean) as string[];
    const paid = new Set((await this.prisma.user.findMany({ where: { id: { in: ids }, ...this.paidFirstOrder() }, select: { id: true } })).map((u) => u.id));
    return rows.map((r) => ({
      ...r,
      rewardValue: r.rewardValue == null ? null : Number(r.rewardValue),
      stage: r.status === 'REGISTERED' && r.invitedId && paid.has(r.invitedId) ? 'FIRST_ORDER_COMPLETED' : r.status,
    }));
  }

  // Admin: referrals, filtered by stage, date and who
  async adminList(page = 1, limit = 20, filters: ReferralFilters = {}) {
    page = Math.max(1, page || 1);
    limit = Math.min(100, Math.max(1, limit || 20));
    const where = this.adminWhere(filters);
    const [referrals, total] = await Promise.all([
      this.adminRows(where, (page - 1) * limit, limit),
      this.prisma.referral.count({ where }),
    ]);
    return { referrals, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  /** The same rows, unpaged, for the CSV export. */
  async adminExport(filters: ReferralFilters = {}) {
    return this.adminRows(this.adminWhere(filters), 0, 10_000);
  }

  /**
   * The whole programme in numbers, across every referral (not one page):
   * the funnel, the rewards in ₾ (used and not yet), what referred friends
   * have spent, and the top inviters.
   */
  async adminStats() {
    const [byStatus, firstOrder, rewards, coupons, revenue, top] = await Promise.all([
      this.prisma.referral.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.referral.count({ where: { OR: [{ status: 'REWARD_GRANTED' }, { status: { in: ['REGISTERED', 'FIRST_ORDER_COMPLETED'] }, invited: this.paidFirstOrder() }] } }),
      this.prisma.referral.aggregate({ where: { status: 'REWARD_GRANTED' }, _sum: { rewardValue: true } }),
      // Reward coupons are REF-… codes (linked properly once referrals store their coupon).
      this.prisma.coupon.findMany({ where: { code: { startsWith: 'REF-' } }, select: { discountValue: true, isActive: true, expiresAt: true, _count: { select: { usages: true } } } }),
      this.prisma.order.aggregate({
        where: { user: { referralsReceived: { some: { status: { not: 'CANCELLED' } } } }, total: { gt: 0 }, status: { notIn: ['PENDING', 'CANCELLED', 'REFUNDED', 'FAILED'] }, payments: { some: { status: { in: [...COLLECTED] } } } },
        _sum: { total: true }, _count: { _all: true },
      }),
      this.prisma.referral.groupBy({ by: ['inviterId'], _count: { _all: true }, orderBy: { _count: { inviterId: 'desc' } }, take: 10 }),
    ]);
    const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
    const total = byStatus.reduce((n, x) => n + x._count._all, 0);
    const cancelled = count('CANCELLED');
    const registered = total - count('INVITED') - cancelled;
    const rewarded = count('REWARD_GRANTED');
    const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
    const now = new Date();
    const used = coupons.filter((c) => c._count.usages > 0);
    const open = coupons.filter((c) => !c._count.usages && c.isActive && (!c.expiresAt || c.expiresAt > now));
    const sum = (list: typeof coupons) => list.reduce((n, c) => n + Number(c.discountValue), 0);

    const people = await this.prisma.user.findMany({ where: { id: { in: top.map((t) => t.inviterId) } }, select: { id: true, email: true, firstName: true, lastName: true, referralCode: true } });
    const rewardedBy = await this.prisma.referral.groupBy({ by: ['inviterId'], where: { inviterId: { in: top.map((t) => t.inviterId) }, status: 'REWARD_GRANTED' }, _count: { _all: true } });

    return {
      funnel: {
        invited: total, registered, firstOrder, rewarded, cancelled,
        registeredPct: pct(registered, total), firstOrderPct: pct(firstOrder, registered), rewardedPct: pct(rewarded, firstOrder),
      },
      rewards: {
        given: Number(rewards._sum.rewardValue ?? 0),
        used: sum(used), usedCount: used.length,
        unused: sum(open), unusedCount: open.length,
      },
      referredRevenue: { total: Number(revenue._sum.total ?? 0), orders: revenue._count._all },
      topInviters: top.map((t) => ({
        ...people.find((p) => p.id === t.inviterId),
        referrals: t._count._all,
        rewarded: rewardedBy.find((r) => r.inviterId === t.inviterId)?._count._all ?? 0,
      })),
    };
  }
}

export type ReferralFilters = { status?: string; from?: string; to?: string; q?: string };
