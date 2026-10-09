import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { endOfMonth, planCancellation } from './cancellation';
import { cancelUnpaidOrder } from '../orders/order-lifecycle';

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
    const ended = { status: 'ACTIVE' as const, endDate: { lte: new Date() } };
    // Cancelled by the customer and the last month is over: now really cancelled.
    const { count: cancelled } = await this.prisma.customerSubscription.updateMany({ where: { ...ended, cancelledAt: { not: null } }, data: { status: 'CANCELLED' } });
    const { count: expired } = await this.prisma.customerSubscription.updateMany({
      where: { ...ended, cancelledAt: null, OR: [{ autoRenewal: false }, { nextRenewalAt: null }] },
      data: { status: 'EXPIRED' },
    });
    const count = cancelled + expired;
    if (count) this.logger.log(`Expired ${count} subscription(s) that reached their end date`);
    return { expired: count };
  }

  async findByUser(userId: string) {
    return this.prisma.customerSubscription.findMany({
      where: { userId },
      include: {
        plan: true,
        dog: true,
        address: { select: { firstName: true, lastName: true, phone: true, city: true, addressLine1: true, addressLine2: true } },
        // The customer's box history; tracking is theirs to see.
        shipments: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true, year: true, month: true, boxNumber: true, status: true, trackingNumber: true, shippedAt: true, deliveredAt: true },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
      },
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

  /** What cancelling now would mean — shown to the customer before they confirm. */
  async cancelPreview(id: string, userId: string) {
    const sub = await this.findOne(id, userId);
    if (['CANCELLED', 'EXPIRED'].includes(sub.status) || sub.cancelledAt) throw new BadRequestException('Subscription already cancelled');
    return (await planCancellation(this.prisma, id)).plan;
  }

  /**
   * Cancels under the shop's rule (see planCancellation): free within the
   * window, otherwise this month's box still ships and the unused months are
   * owed back. The refund is recorded as due on the order; admin pays it
   * through the payment provider and records it.
   */
  async cancel(id: string, userId: string, reason?: string) {
    const sub = await this.findOne(id, userId);
    if (['CANCELLED', 'EXPIRED'].includes(sub.status) || sub.cancelledAt) throw new BadRequestException('Subscription already cancelled');

    // Never paid: nothing to refund, drop the unpaid order with it.
    if (sub.status === 'PENDING' && !sub.isGift) {
      const order = await this.prisma.order.findFirst({ where: { subscriptionId: id, status: 'PENDING' }, select: { id: true } });
      if (order) await cancelUnpaidOrder(this.prisma, order.id, 'Cancelled by the customer before paying.');
      await this.prisma.customerSubscription.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, autoRenewal: false, nextRenewalAt: null } });
      return { kind: 'free', refund: 0, keptBoxes: 0 };
    }

    const now = new Date();
    const { plan, orderId } = await planCancellation(this.prisma, id, now);
    const keepsBox = plan.kind === 'keep' && plan.thisMonthBoxComing;
    await this.prisma.customerSubscription.update({
      where: { id },
      data: {
        cancelledAt: now, cancelReason: reason, autoRenewal: false, nextRenewalAt: null,
        boxesTotal: plan.kind === 'free' ? sub.boxesTotal : plan.keptBoxes,
        // This month's box still ships: stay active until the month ends.
        status: keepsBox ? 'ACTIVE' : 'CANCELLED',
        endDate: keepsBox ? endOfMonth(now) : now,
      },
    });
    if (plan.kind === 'free') {
      await this.prisma.boxShipment.updateMany({ where: { subscriptionId: id, status: { in: ['TO_PACK', 'PACKED'] } }, data: { status: 'CANCELLED' } });
    }
    if (plan.refund > 0 && orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { refundDueAmount: true, internalNotes: true } });
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          refundDueAmount: Number(order?.refundDueAmount ?? 0) + plan.refund,
          internalNotes: [order?.internalNotes, `Subscription cancelled by the customer (${plan.kind === 'free' ? `within ${plan.freeHours} h — full refund` : `kept ${plan.keptBoxes} of ${plan.boxesTotal} boxes`}). Refund due ₾${plan.refund.toFixed(2)}.`].filter(Boolean).join('\n'),
        },
      });
    }
    return plan;
  }

  /**
   * Sends this subscription's boxes somewhere new from now on. Boxes not yet
   * packed follow at once; one already packed keeps its label, and the
   * customer is told so.
   */
  async changeAddress(id: string, userId: string, a: { firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2?: string }) {
    const sub = await this.findOne(id, userId);
    if (['CANCELLED', 'EXPIRED'].includes(sub.status)) throw new BadRequestException('This subscription has ended');
    const address = await this.prisma.address.create({
      data: { userId, firstName: a.firstName.trim(), lastName: a.lastName.trim(), phone: a.phone.trim(), city: a.city.trim(), addressLine1: a.addressLine1.trim(), addressLine2: a.addressLine2?.trim() || null },
    });
    await this.prisma.customerSubscription.update({ where: { id }, data: { addressId: address.id } });
    const { count: moved } = await this.prisma.boxShipment.updateMany({ where: { subscriptionId: id, status: 'TO_PACK' }, data: { addressId: address.id } });
    const alreadyPacked = await this.prisma.boxShipment.count({ where: { subscriptionId: id, status: 'PACKED' } });
    return { ok: true, movedBoxes: moved, alreadyPacked };
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
          orders: { select: { giftRecipientName: true, giftRecipientEmail: true, giftDeliverOn: true, giftSentAt: true }, take: 1 },
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
        giftCardScheduledFor: s.orders[0]?.giftDeliverOn ?? null,
        giftCardSentAt: s.orders[0]?.giftSentAt ?? null,
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
