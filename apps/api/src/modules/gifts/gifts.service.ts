import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { sendDueGiftCards, sendGiftCard } from './gift-card';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * Gift plans. The buyer gives the friend's name, dog and delivery address at
 * checkout, so a gift ships like any plan and stays in the buyer's account.
 * What's left here: the optional "a gift is on its way" note to the friend.
 */
@Injectable()
export class GiftsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GiftsService.name);

  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService, private email: EmailService) {}

  /** Notes for gifts starting later go out on their day: checked shortly after start-up, then hourly. */
  onModuleInit() {
    const run = () =>
      sendDueGiftCards(this.prisma, this.email)
        .then((n) => { if (n) this.logger.log(`Sent ${n} scheduled gift note(s)`); })
        .catch((e) => this.logger.error(`Scheduled gift notes failed: ${e.message}`));
    setTimeout(run, 20_000).unref();
    this.timer = setInterval(run, 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** For the dashboard card: gift plans running now, and those starting later. */
  async adminSummary() {
    const now = new Date();
    const [activeCount, startingLaterCount] = await Promise.all([
      this.prisma.customerSubscription.count({ where: { isGift: true, status: 'ACTIVE', startDate: { lte: now } } }),
      this.prisma.customerSubscription.count({ where: { isGift: true, status: 'ACTIVE', startDate: { gt: now } } }),
    ]);
    return { activeCount, startingLaterCount };
  }

  /** Re-send the note to the friend — e.g. after the buyer corrected the email. */
  async resend(subscriptionId: string) {
    const sub = await this.prisma.customerSubscription.findUnique({
      where: { id: subscriptionId },
      select: { isGift: true, cancelledAt: true, orders: { where: { type: { not: 'RENEWAL' } }, select: { id: true, giftRecipientEmail: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!sub?.isGift) throw new NotFoundException('Not a gift subscription');
    if (sub.cancelledAt) throw new BadRequestException('This gift was cancelled');
    const order = sub.orders[0];
    if (!order?.giftRecipientEmail) throw new BadRequestException('The buyer didn’t give the friend’s email, so there is no note to send.');
    if (!this.email.isConfigured) throw new BadRequestException('Email is not set up yet (no Resend key), so nothing can be sent.');

    // Sends now even if the gift starts later, and records it as sent.
    const result = await sendGiftCard(this.prisma, this.email, order.id, { again: true });
    if (!result.sent) throw new BadRequestException('This gift note can’t be sent: the order isn’t paid.');
    this.logger.log(`Gift note resent for subscription ${subscriptionId}`);
    return result;
  }
}
