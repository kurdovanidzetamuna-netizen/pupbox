import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { endOfMonth, planCancellation } from './cancellation';
import { createDueRenewals, endUnpaidRenewals } from './renewal';
import { EmailService } from '../email/email.service';
import { cancelUnpaidOrder } from '../orders/order-lifecycle';

const HOUR = 60 * 60 * 1000;

@Injectable()
export class SubscriptionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService, private email: EmailService) {}

  onModuleInit() {
    // Hourly: end finished terms, send renewal payment links, end unpaid renewals.
    const run = async () => {
      for (const [name, job] of [
        ['Expiry check', () => this.expireEnded()],
        ['Renewal reminders', () => createDueRenewals(this.prisma, this.email)],
        ['Unpaid renewals', () => endUnpaidRenewals(this.prisma)],
      ] as const) {
        await job().catch((e: any) => this.logger.error(`${name} failed: ${e.message}`));
      }
    };
    setTimeout(run, 10_000).unref(); // catch up after a restart
    this.timer = setInterval(run, HOUR);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /**
   * Ends subscriptions whose term is over and which the customer did not ask
   * to renew. Renewing ones stay active while their renewal is open (see
   * renewal.ts). Safe to run from several instances at once.
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
        // An open renewal to pay, shown as "renewal due" with a Pay button.
        orders: { where: { type: 'RENEWAL', status: 'PENDING' }, select: { id: true, total: true, renewalFor: true }, take: 1 },
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
      include: {
        plan: true, dog: true,
        address: { select: { firstName: true, lastName: true, phone: true, city: true, addressLine1: true, addressLine2: true } },
        orders: { include: { items: true, payments: true }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  /** What cancelling now would mean — shown to the customer before they confirm. */
  async cancelPreview(id: string, userId?: string) {
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
  async cancel(id: string, userId: string | undefined, reason?: string) {
    const sub = await this.findOne(id, userId);
    if (['CANCELLED', 'EXPIRED'].includes(sub.status) || sub.cancelledAt) throw new BadRequestException('Subscription already cancelled');

    // Never paid: nothing to refund, drop the unpaid order with it.
    if (sub.status === 'PENDING' && !sub.isGift) {
      const order = await this.prisma.order.findFirst({ where: { subscriptionId: id, status: 'PENDING' }, select: { id: true } });
      if (order) await cancelUnpaidOrder(this.prisma, order.id, 'Cancelled by the customer before paying.');
      await this.prisma.customerSubscription.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, autoRenewal: false, nextRenewalAt: null } });
      return { kind: 'free', refund: 0, keptBoxes: 0 };
    }

    await this.withdrawOpenRenewals(id, 'Subscription cancelled by the customer.');
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
  async changeAddress(id: string, userId: string | undefined, a: { firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2?: string }) {
    const sub = await this.findOne(id, userId);
    if (['CANCELLED', 'EXPIRED'].includes(sub.status)) throw new BadRequestException('This subscription has ended');
    // Admin changes it on the customer's behalf: the address is still theirs.
    const address = await this.prisma.address.create({
      data: { userId: sub.userId, firstName: a.firstName.trim(), lastName: a.lastName.trim(), phone: a.phone.trim(), city: a.city.trim(), addressLine1: a.addressLine1.trim(), addressLine2: a.addressLine2?.trim() || null },
    });
    await this.prisma.customerSubscription.update({ where: { id }, data: { addressId: address.id } });
    const { count: moved } = await this.prisma.boxShipment.updateMany({ where: { subscriptionId: id, status: 'TO_PACK' }, data: { addressId: address.id } });
    const alreadyPacked = await this.prisma.boxShipment.count({ where: { subscriptionId: id, status: 'PACKED' } });
    return { ok: true, movedBoxes: moved, alreadyPacked };
  }

  async toggleAutoRenewal(id: string, userId: string, enabled: boolean) {
    const sub = await this.findOne(id, userId);
    if (['CANCELLED', 'EXPIRED'].includes(sub.status)) throw new BadRequestException('Cannot modify a cancelled subscription');
    // Renewal falls due when the current term ends; switching it off clears
    // that and withdraws a renewal payment that was waiting.
    if (!enabled) await this.withdrawOpenRenewals(id, 'Renewal turned off by the customer.');
    return this.prisma.customerSubscription.update({ where: { id }, data: { autoRenewal: enabled, nextRenewalAt: enabled ? sub.endDate : null } });
  }

  private async withdrawOpenRenewals(subscriptionId: string, note: string) {
    const open = await this.prisma.order.findMany({ where: { subscriptionId, type: 'RENEWAL', status: 'PENDING' }, select: { id: true } });
    for (const o of open) await cancelUnpaidOrder(this.prisma, o.id, note);
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
          address: { select: { firstName: true, lastName: true, phone: true, city: true, addressLine1: true, addressLine2: true } },
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
    // Tab counts for the whole table, not just this page.
    const byStatus = await this.prisma.customerSubscription.groupBy({ by: ['status'], _count: { _all: true } });
    const statusCounts = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));

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
      statusCounts,
      unclaimedGifts,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin's direct changes. Status moves only for resuming a paused plan:
   * activating happens by payment or gift claim, cancelling through cancel()
   * so the refund rule applies, and pausing isn't offered (nothing would
   * stop the plan's time running out).
   */
  async adminUpdate(id: string, data: { status?: string; autoRenewal?: boolean; cancelReason?: string }) {
    const sub = await this.prisma.customerSubscription.findUnique({ where: { id }, select: { status: true } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (data.status && !(data.status === 'ACTIVE' && sub.status === 'PAUSED')) {
      throw new BadRequestException('Only a paused plan can be resumed here. Cancel uses the cancel action.');
    }
    return this.prisma.customerSubscription.update({
      where: { id },
      data: { ...(data.status ? { status: 'ACTIVE' } : {}), ...(data.autoRenewal !== undefined ? { autoRenewal: data.autoRenewal } : {}), ...(data.cancelReason !== undefined ? { cancelReason: data.cancelReason } : {}) },
    });
  }

  /** Admin updates the dog a customer told them about (by phone or email). */
  async adminUpdateDog(id: string, d: { name?: string; size?: string | null; allergies?: string[]; specialNotes?: string | null }) {
    const sub = await this.prisma.customerSubscription.findUnique({ where: { id }, select: { userId: true, dogId: true } });
    if (!sub) throw new NotFoundException('Subscription not found');
    const data: any = {
      ...(d.name !== undefined ? { name: d.name.trim() } : {}),
      ...(d.size !== undefined ? { size: d.size || null } : {}),
      ...(d.allergies !== undefined ? { allergies: [...new Set(d.allergies.map((a) => a.trim()).filter(Boolean))] } : {}),
      ...(d.specialNotes !== undefined ? { specialNotes: d.specialNotes?.trim() || null } : {}),
    };
    if (sub.dogId) return this.prisma.dog.update({ where: { id: sub.dogId }, data });
    if (!data.name) throw new BadRequestException('Give the dog a name');
    const dog = await this.prisma.dog.create({ data: { userId: sub.userId, ...data } });
    await this.prisma.customerSubscription.update({ where: { id }, data: { dogId: dog.id } });
    return dog;
  }
}
