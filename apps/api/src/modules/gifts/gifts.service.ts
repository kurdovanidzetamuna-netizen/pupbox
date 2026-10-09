import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { sendDueGiftCards, sendGiftCard } from './gift-card';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { DogGender, DogSize } from '@prisma/client';
import { subscriptionPeriod } from '../subscriptions/subscription-period';

/**
 * Claiming a gifted subscription.
 *
 * A gift is bought for someone else's dog, which does not exist in our
 * database at purchase time — the buyer generally knows neither its size and
 * allergies nor the shipping address. So between payment and claim the
 * subscription sits PENDING, owned by the buyer, with no dog: paid for but
 * unshippable. Claiming is what completes it.
 */
@Injectable()
export class GiftsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GiftsService.name);

  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService, private email: EmailService) {}

  /** Gift cards dated for later go out on their day: checked shortly after start-up, then hourly. */
  onModuleInit() {
    const run = () => sendDueGiftCards(this.prisma, this.email)
      .then((n) => { if (n) this.logger.log(`Sent ${n} scheduled gift card(s)`); })
      .catch((e) => this.logger.error(`Scheduled gift cards failed: ${e.message}`));
    setTimeout(run, 20_000).unref();
    this.timer = setInterval(run, 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** Public preview shown on the claim page. Deliberately reveals nothing about the buyer beyond their name. */
  async preview(token: string) {
    const sub = await this.prisma.customerSubscription.findUnique({
      where: { giftClaimToken: token },
      select: {
        id: true,
        giftClaimedAt: true,
        boxesTotal: true,
        plan: { select: { name: true, slug: true, boxCount: true, durationValue: true, durationUnit: true, benefits: true } },
        purchasedBy: { select: { firstName: true, lastName: true } },
        orders: { select: { giftRecipientName: true, giftMessage: true }, take: 1 },
      },
    });
    if (!sub) throw new NotFoundException('This gift link is not valid');

    const order = sub.orders[0];
    return {
      alreadyClaimed: sub.giftClaimedAt !== null,
      recipientName: order?.giftRecipientName ?? null,
      message: order?.giftMessage ?? null,
      buyerName: [sub.purchasedBy?.firstName, sub.purchasedBy?.lastName].filter(Boolean).join(' ') || 'A friend',
      plan: {
        name: sub.plan.name?.trim() || sub.plan.slug,
        boxCount: sub.plan.boxCount,
        duration: `${sub.plan.durationValue} ${sub.plan.durationUnit.toLowerCase()}${sub.plan.durationValue > 1 ? 's' : ''}`,
        benefits: sub.plan.benefits,
      },
    };
  }

  /**
   * Transfers the subscription to the recipient and activates it.
   *
   * The recipient must be signed in — they need an account to manage the
   * subscription afterwards — and supplies the two things the buyer could not:
   * the dog and the delivery address.
   */
  async claim(token: string, userId: string, data: {
    dogId?: string;
    dog?: { name: string; breed?: string; size?: DogSize; gender?: DogGender; weightKg?: number; allergies?: string[] };
    address?: { firstName: string; lastName: string; phone: string; city: string; addressLine1: string; addressLine2?: string; postalCode?: string };
  }) {
    const sub = await this.prisma.customerSubscription.findUnique({
      where: { giftClaimToken: token },
      select: { id: true, giftClaimedAt: true, status: true, purchasedByUserId: true, boxesTotal: true, plan: { select: { name: true, slug: true, durationValue: true, durationUnit: true } } },
    });
    if (!sub) throw new NotFoundException('This gift link is not valid');
    if (sub.giftClaimedAt) throw new BadRequestException('This gift has already been claimed');
    if (!data.dogId && !data.dog?.name?.trim()) throw new BadRequestException('Tell us about the dog this box is for');

    // Everything below must land together: a half-claimed gift would be owned
    // by the recipient but still unshippable, with the token already spent.
    return this.prisma.$transaction(async (tx) => {
      let dogId = data.dogId ?? null;

      if (dogId) {
        // Never let a claim attach someone else's dog.
        const owned = await tx.dog.findFirst({ where: { id: dogId, userId, deletedAt: null }, select: { id: true } });
        if (!owned) throw new BadRequestException('That dog does not belong to your account');
      } else if (data.dog) {
        const dog = await tx.dog.create({
          data: {
            userId,
            name: data.dog.name.trim(),
            breed: data.dog.breed || null,
            size: data.dog.size ?? null,
            gender: data.dog.gender ?? null,
            weightKg: data.dog.weightKg ?? null,
            allergies: data.dog.allergies ?? [],
          },
          select: { id: true },
        });
        dogId = dog.id;
      }

      if (data.address) {
        await tx.address.create({
          data: {
            userId,
            firstName: data.address.firstName,
            lastName: data.address.lastName,
            phone: data.address.phone,
            city: data.address.city,
            addressLine1: data.address.addressLine1,
            addressLine2: data.address.addressLine2 || null,
            postalCode: data.address.postalCode || null,
            isDefault: true,
          },
        });
      }

      const now = new Date();
      const claimed = await tx.customerSubscription.update({
        where: { id: sub.id },
        data: {
          // Ownership moves to the recipient; purchasedByUserId keeps the trail
          // back to whoever paid, and the spent token is cleared so the link
          // cannot be replayed.
          userId,
          dogId,
          status: 'ACTIVE',
          // A gift is a fixed term: it runs from the claim and does not renew.
          ...subscriptionPeriod(now, sub.plan, false),
          giftClaimedAt: now,
          giftClaimToken: null,
          autoRenewal: false,
        },
        select: { id: true, boxesTotal: true, plan: { select: { name: true, slug: true } } },
      });

      return {
        subscriptionId: claimed.id,
        planName: claimed.plan.name?.trim() || claimed.plan.slug,
        boxesTotal: claimed.boxesTotal,
      };
    });
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  /** Unclaimed gifts are an operational queue: money taken, nothing shipped. */
  async adminList(claimed?: boolean) {
    const gifts = await this.prisma.customerSubscription.findMany({
      where: {
        isGift: true,
        ...(claimed === true ? { giftClaimedAt: { not: null } } : {}),
        ...(claimed === false ? { giftClaimedAt: null } : {}),
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        giftClaimedAt: true,
        boxesTotal: true,
        plan: { select: { name: true, slug: true, price: true } },
        purchasedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        user: { select: { id: true, email: true } },
        dog: { select: { name: true, size: true } },
        orders: { select: { id: true, orderNumber: true, total: true, giftRecipientName: true, giftRecipientEmail: true, giftMessage: true, giftDeliverOn: true, giftSentAt: true }, take: 1 },
      },
      orderBy: { createdAt: 'asc' }, // oldest unclaimed first — those need chasing
    });

    const now = Date.now();
    return gifts.map((g) => {
      const order = g.orders[0];
      return {
        subscriptionId: g.id,
        status: g.status,
        purchasedAt: g.createdAt,
        claimedAt: g.giftClaimedAt,
        claimed: g.giftClaimedAt !== null,
        // Age is the signal: 2 days unclaimed is normal, 14 means the email
        // bounced or went to spam.
        daysOutstanding: g.giftClaimedAt ? null : Math.floor((now - g.createdAt.getTime()) / 86400000),
        planName: g.plan.name?.trim() || g.plan.slug,
        value: Number(order?.total ?? g.plan.price),
        buyer: g.purchasedBy ? { email: g.purchasedBy.email, name: [g.purchasedBy.firstName, g.purchasedBy.lastName].filter(Boolean).join(' ') } : null,
        recipientName: order?.giftRecipientName ?? null,
        recipientEmail: order?.giftRecipientEmail ?? null,
        message: order?.giftMessage ?? null,
        deliverOn: order?.giftDeliverOn ?? null,
        cardSentAt: order?.giftSentAt ?? null,
        orderId: order?.id ?? null,
        orderNumber: order?.orderNumber ?? null,
        claimedByEmail: g.giftClaimedAt ? g.user.email : null,
        dog: g.dog ? { name: g.dog.name, size: g.dog.size } : null,
      };
    });
  }

  /** Summary for the dashboard card — unclaimed gifts are an unfulfilled obligation. */
  async adminSummary() {
    const unclaimed = await this.prisma.customerSubscription.findMany({
      where: { isGift: true, giftClaimedAt: null },
      select: { createdAt: true, plan: { select: { price: true } }, orders: { select: { total: true }, take: 1 } },
    });
    const now = Date.now();
    const value = unclaimed.reduce((s, g) => s + Number(g.orders[0]?.total ?? g.plan.price), 0);
    const stale = unclaimed.filter((g) => now - g.createdAt.getTime() > 14 * 86400000).length;
    return {
      unclaimedCount: unclaimed.length,
      unclaimedValue: Math.round(value * 100) / 100,
      staleCount: stale,
      claimedCount: await this.prisma.customerSubscription.count({ where: { isGift: true, giftClaimedAt: { not: null } } }),
    };
  }

  /** Re-send the gift card — the usual fix when a recipient never received it. */
  async resend(subscriptionId: string) {
    const sub = await this.prisma.customerSubscription.findUnique({
      where: { id: subscriptionId },
      select: { isGift: true, giftClaimedAt: true, giftClaimToken: true, orders: { select: { id: true, giftRecipientEmail: true }, take: 1 } },
    });
    if (!sub?.isGift) throw new NotFoundException('Not a gift subscription');
    if (sub.giftClaimedAt) throw new BadRequestException('This gift has already been claimed');
    if (!sub.giftClaimToken) throw new BadRequestException('This gift has no active claim link');
    const order = sub.orders[0];
    if (!order?.giftRecipientEmail) throw new BadRequestException('No recipient email recorded for this gift');
    if (!this.email.isConfigured) throw new BadRequestException('Email is not set up yet (no Resend key), so nothing can be sent.');

    // Sends now even if the card was dated for later, and records it as sent.
    const result = await sendGiftCard(this.prisma, this.email, order.id, { again: true });
    if (!result.sent) throw new BadRequestException('This gift card can’t be sent: the order isn’t paid.');
    this.logger.log(`Gift card resent for subscription ${subscriptionId}`);
    return result;
  }

}
