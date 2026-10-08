import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const HOUR = 60 * 60 * 1000;

@Injectable()
export class SubscriptionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const run = () => this.expireEnded().catch((e) => this.logger.error(`Expiry check failed: ${e.message}`));
    setTimeout(run, 10_000).unref(); // catch up after a restart
    this.timer = setInterval(run, HOUR);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /**
   * Ends subscriptions whose term is over and which the customer did not ask
   * to renew. Renewing ones stay active: charging them needs Flitt, see
   * processDueRenewals. Safe to run from several instances at once.
   */
  async expireEnded() {
    const { count } = await this.prisma.customerSubscription.updateMany({
      where: { status: 'ACTIVE', endDate: { lte: new Date() }, OR: [{ autoRenewal: false }, { nextRenewalAt: null }] },
      data: { status: 'EXPIRED' },
    });
    if (count) this.logger.log(`Expired ${count} subscription(s) that reached their end date`);
    return { expired: count };
  }

  async findByUser(userId: string) {
    return this.prisma.customerSubscription.findMany({
      where: { userId },
      include: { plan: true, dog: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;
    const sub = await this.prisma.customerSubscription.findFirst({
      where,
      include: { plan: true, dog: true, orders: { include: { items: true, payments: true }, orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  async create(userId: string, data: { planId: string; dogId?: string; autoRenewal?: boolean }) {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id: data.planId, isActive: true, deletedAt: null } });
    if (!plan) throw new BadRequestException('Plan not found or inactive');
    return this.prisma.customerSubscription.create({
      data: { userId, planId: data.planId, dogId: data.dogId, status: 'PENDING', boxesTotal: plan.boxCount, autoRenewal: data.autoRenewal ?? true },
      include: { plan: true },
    });
  }

  async cancel(id: string, userId: string, reason?: string) {
    const sub = await this.findOne(id, userId);
    if (['CANCELLED', 'EXPIRED'].includes(sub.status)) throw new BadRequestException('Subscription already cancelled');
    return this.prisma.customerSubscription.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: reason },
    });
  }

  async toggleAutoRenewal(id: string, userId: string, enabled: boolean) {
    const sub = await this.findOne(id, userId);
    if (['CANCELLED', 'EXPIRED'].includes(sub.status)) throw new BadRequestException('Cannot modify a cancelled subscription');
    // Renewal falls due when the current term ends; switching it off clears that.
    return this.prisma.customerSubscription.update({ where: { id }, data: { autoRenewal: enabled, nextRenewalAt: enabled ? sub.endDate : null } });
  }

  // Cron stub — finds subscriptions due for renewal. Payment charge is NOT implemented yet.
  async processDueRenewals() {
    const now = new Date();
    const due = await this.prisma.customerSubscription.findMany({
      where: { autoRenewal: true, status: 'ACTIVE', nextRenewalAt: { lte: now } },
      include: { plan: true, user: true },
    });
    for (const sub of due) {
      // TODO: charge via Flitt payment gateway
      console.log(`[AutoRenewal] Due: ${sub.id} user=${sub.user.email} plan=${sub.plan.name}`);
    }
    return { processed: due.length };
  }

  // Admin methods
  /**
   * `gifts` narrows to gifted subscriptions: 'unclaimed' is the operational
   * queue — paid for, but with no dog and no address, so nothing can ship yet.
   */
  async adminList(params: { status?: string; page?: number; limit?: number; gifts?: 'all' | 'unclaimed' | 'claimed' }) {
    const { status, page = 1, limit = 20, gifts } = params;
    const where: any = {};
    if (status) where.status = status;
    if (gifts) {
      where.isGift = true;
      if (gifts === 'unclaimed') where.giftClaimedAt = null;
      if (gifts === 'claimed') where.giftClaimedAt = { not: null };
    }

    const [items, total, unclaimedGifts] = await Promise.all([
      this.prisma.customerSubscription.findMany({
        where,
        include: {
          plan: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          dog: true,
          purchasedBy: { select: { email: true, firstName: true, lastName: true } },
          orders: { select: { giftRecipientName: true, giftRecipientEmail: true }, take: 1 },
        },
        // Unclaimed gifts are chased oldest-first; everything else reads newest-first.
        orderBy: { createdAt: gifts === 'unclaimed' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerSubscription.count({ where }),
      this.prisma.customerSubscription.count({ where: { isGift: true, giftClaimedAt: null } }),
    ]);

    const now = Date.now();
    return {
      items: items.map((s) => ({
        ...s,
        giftRecipientName: s.orders[0]?.giftRecipientName ?? null,
        giftRecipientEmail: s.orders[0]?.giftRecipientEmail ?? null,
        giftUnclaimed: s.isGift && s.giftClaimedAt === null,
        daysOutstanding: s.isGift && !s.giftClaimedAt ? Math.floor((now - s.createdAt.getTime()) / 86400000) : null,
      })),
      total,
      unclaimedGifts,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async adminUpdate(id: string, data: { status?: string; cancelReason?: string; endDate?: Date; nextRenewalAt?: Date }) {
    return this.prisma.customerSubscription.update({ where: { id }, data: data as any });
  }
}
