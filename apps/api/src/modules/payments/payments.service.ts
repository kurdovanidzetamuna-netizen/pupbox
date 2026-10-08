import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FlittService } from './flitt.service';
import { EmailService } from '../email/email.service';
import { ReferralsService } from '../referrals/referrals.service';
import { ProductsService } from '../products/products.service';
import { subscriptionPeriod } from '../subscriptions/subscription-period';
import { releaseStock } from '../products/stock';

/** How long an order may wait for payment before its stock and coupon are freed (checked every 15 minutes). */
const UNPAID_TTL_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private flitt: FlittService,
    private config: ConfigService,
    private email: EmailService,
    private referrals: ReferralsService,
    private products: ProductsService,
  ) {}

  private timer?: NodeJS.Timeout;

  onModuleInit() {
    const run = () => this.expireUnpaid().catch((e) => this.logger.error(`Unpaid-order expiry failed: ${e.message}`));
    setTimeout(run, 15_000).unref();
    this.timer = setInterval(run, 15 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /**
   * Orders left unpaid for two hours (payment page closed, card abandoned)
   * are cancelled: their stock goes back on sale, the coupon can be used
   * again, and the subscription they created is dropped. A payment that still
   * arrives later reinstates the order (see applyPaymentResult).
   */
  async expireUnpaid() {
    const stale = await this.prisma.order.findMany({
      where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - UNPAID_TTL_MS) }, payments: { none: { status: 'PAID' } } },
      select: { id: true, couponId: true, subscriptionId: true, items: { where: { productId: { not: null } }, select: { productId: true, quantity: true } } },
    });
    let expired = 0;
    for (const o of stale) {
      // Guarded on PENDING so a payment landing at this moment wins.
      const { count } = await this.prisma.order.updateMany({
        where: { id: o.id, status: 'PENDING' },
        data: { status: 'CANCELLED', internalNotes: 'Cancelled automatically: not paid within 2 hours.' },
      });
      if (!count) continue;
      expired++;
      await releaseStock(this.prisma, o.items.map((i) => ({ productId: i.productId!, quantity: i.quantity })));
      await this.prisma.payment.updateMany({ where: { orderId: o.id, status: 'PENDING' }, data: { status: 'FAILED' } });
      if (o.subscriptionId) await this.prisma.customerSubscription.updateMany({ where: { id: o.subscriptionId, status: 'PENDING' }, data: { status: 'CANCELLED', cancelReason: 'Not paid' } });
      if (o.couponId) {
        const { count: used } = await this.prisma.couponUsage.deleteMany({ where: { orderId: o.id } });
        if (used) await this.prisma.coupon.update({ where: { id: o.couponId }, data: { usedCount: { decrement: used } } });
      }
    }
    if (expired) this.logger.log(`Cancelled ${expired} order(s) left unpaid for 2 hours`);
    return { expired };
  }

  async initiatePayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, status: 'PENDING' },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found or already paid');

    const apiUrl = this.config.get('NEXT_PUBLIC_API_URL') || 'http://localhost:4000/api/v1';
    const siteUrl = this.config.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';

    if (this.simulatesPayments()) return this.simulatePayment(order, userId, siteUrl);

    const { checkoutUrl, paymentId } = await this.flitt.createCheckout({
      orderId: order.id,
      amount: Number(order.total),
      description: `Pupbox order #${order.id.slice(-8).toUpperCase()}`,
      serverCallbackUrl: `${apiUrl}/payments/webhook/flitt`,
      responseUrl: `${siteUrl}/checkout/thank-you?order=${order.id}`,
    });

    // Record pending payment
    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        provider: 'FLITT',
        providerPaymentId: paymentId,
        amount: order.total,
        currency: 'GEL',
        status: 'PENDING',
      },
    });

    return { checkoutUrl, paymentId };
  }

  /**
   * Development without a Flitt account: there is nowhere to send the
   * customer, so pretend the bank answered and run the same code a real
   * payment confirmation runs. Never in production — there a missing
   * merchant id is a configuration error, not a free order.
   */
  private simulatesPayments(): boolean {
    if (this.config.get('FLITT_MERCHANT_ID')) return false;
    if (this.config.get('NODE_ENV') === 'production') {
      throw new BadRequestException('Payments are not configured');
    }
    return true;
  }

  /** DEV_PAYMENT_RESULT=declined rehearses a refused card; anything else approves. */
  private async simulatePayment(order: { id: string; total: any }, userId: string, siteUrl: string) {
    const outcome = this.config.get('DEV_PAYMENT_RESULT') === 'declined' ? 'declined' : 'approved';
    const paymentId = `dev-${Date.now()}`;
    this.logger.warn(`Simulated ${outcome} payment for order ${order.id} (no FLITT_MERCHANT_ID; development only)`);

    await this.prisma.payment.create({
      data: { orderId: order.id, userId, provider: 'DEV_SIMULATED', providerPaymentId: paymentId, amount: order.total, currency: 'GEL', status: 'PENDING' },
    });
    await this.applyPaymentResult({ order_id: order.id, payment_id: paymentId, order_status: outcome, simulated: true });

    return { checkoutUrl: `${siteUrl}/checkout/thank-you?order=${order.id}&payment_status=${outcome}`, paymentId };
  }

  async handleWebhook(body: Record<string, any>) {
    if (!this.flitt.verifySignature(body)) {
      this.logger.warn(`Flitt webhook signature mismatch for order ${body.order_id}`);
      throw new BadRequestException('Invalid signature');
    }
    return this.applyPaymentResult(body);
  }

  /** What a payment outcome does to the order. Callers must have trusted `body` first. */
  private async applyPaymentResult(body: Record<string, any>) {
    const { order_id, payment_id, order_status } = body;

    const order = await this.prisma.order.findUnique({ where: { id: order_id } });
    if (!order) {
      this.logger.warn(`Webhook: order not found ${order_id}`);
      return { status: 'ignored' };
    }

    const paymentStatus = this.mapFlittStatus(order_status);

    // Flitt repeats callbacks; a second "approved" must not take the stock
    // or send the emails twice.
    if (paymentStatus === 'PAID' && order.status !== 'PENDING' && order.status !== 'CANCELLED') return { status: 'ok' };

    await this.prisma.payment.updateMany({
      where: { orderId: order_id, providerPaymentId: payment_id },
      data: {
        status: paymentStatus,
        paidAt: paymentStatus === 'PAID' ? new Date() : null,
        webhookData: body,
      },
    });

    if (paymentStatus === 'PAID') {
      if (order.status === 'CANCELLED') {
        // Paid after it expired unpaid: the money is in, so honour the order.
        // Its stock was released at expiry; hold it again so the deduction
        // below balances (this may oversell — admin sees the warning).
        this.logger.warn(`Order ${order_id} was paid after expiring unpaid; reinstating it`);
        const lines = await this.prisma.orderItem.findMany({ where: { orderId: order_id, productId: { not: null } }, select: { productId: true, quantity: true } });
        for (const l of lines) await this.prisma.inventory.update({ where: { productId: l.productId! }, data: { reservedQty: { increment: l.quantity } } });
        if (order.subscriptionId) await this.prisma.customerSubscription.updateMany({ where: { id: order.subscriptionId, status: 'CANCELLED' }, data: { status: 'PENDING' } });
      }
      await this.prisma.order.update({
        where: { id: order_id },
        data: { status: 'PAID' },
      });

      // Activate this order's subscription — and only this one. Matching on
      // "any PENDING subscription for this user" activated unrelated ones the
      // customer had not paid for yet.
      if (order.subscriptionId) {
        const sub = await this.prisma.customerSubscription.findUnique({
          where: { id: order.subscriptionId },
          select: { id: true, isGift: true, giftClaimToken: true, autoRenewal: true, plan: { select: { durationValue: true, durationUnit: true } } },
        });

        if (sub && !sub.isGift) {
          await this.prisma.customerSubscription.update({
            where: { id: sub.id },
            data: { status: 'ACTIVE', ...subscriptionPeriod(new Date(), sub.plan, sub.autoRenewal) },
          });
        } else if (sub?.isGift) {
          // A paid gift stays PENDING: there is no dog and no address yet, so
          // it is not shippable. It activates when the recipient claims it.
          const full = await this.prisma.order.findUnique({
            where: { id: order_id },
            include: {
              user: { select: { firstName: true, lastName: true, language: true } },
              items: { select: { name: true, subscriptionPlanId: true, subscriptionPlan: { select: { translations: true } } } },
            },
          });
          const planItem = full?.items.find((i) => i.subscriptionPlanId);
          const kaPlanName = (planItem?.subscriptionPlan?.translations as any)?.ka?.name?.trim();
          const planName = (full?.user?.language !== 'en' && kaPlanName) || planItem?.name || 'Pupbox';
          const buyerName = [full?.user?.firstName, full?.user?.lastName].filter(Boolean).join(' ') || 'A friend';

          // Honour a scheduled send date; a dated gift is delivered by the
          // scheduled job rather than immediately.
          const sendNow = !full?.giftDeliverOn || full.giftDeliverOn <= new Date();
          if (sendNow && full?.giftRecipientEmail && sub.giftClaimToken) {
            this.email.sendGiftCard({
              recipientEmail: full.giftRecipientEmail,
              recipientName: full.giftRecipientName ?? 'there',
              buyerName,
              planName,
              message: full.giftMessage ?? undefined,
              claimToken: sub.giftClaimToken,
              language: full.user?.language,
            }).catch((e) => this.logger.error(`Gift card email failed for order ${order_id}: ${e.message}`));
          }
        }
      }

      // Deduct reserved inventory from actual stock
      const productItems = await this.prisma.orderItem.findMany({
        where: { orderId: order_id, productId: { not: null } },
      });
      for (const item of productItems) {
        if (item.productId) {
          const inv = await this.prisma.inventory.update({
            where: { productId: item.productId },
            data: {
              quantity: { decrement: item.quantity },
              reservedQty: { decrement: item.quantity },
            },
          });
          await this.products.syncStatusFromStock(item.productId, inv.quantity);
        }
      }

      // Send confirmation email & check referral completion
      const fullOrder = await this.prisma.order.findUnique({
        where: { id: order_id },
        include: { user: { select: { email: true, firstName: true, language: true } } },
      });
      if (fullOrder?.user) {
        this.email.sendPaymentConfirmation({ id: order_id, total: Number(order.total), user: fullOrder.user }).catch(() => {});
        // Complete referral if this is the referred user's first confirmed order
        const confirmedOrders = await this.prisma.order.count({ where: { userId: order.userId, status: 'PAID' } });
        if (confirmedOrders === 1) {
          const result = await this.referrals.completeReferral(order.userId).catch(() => null);
          if (result?.couponCode) {
            const inviterReferral = await this.prisma.referral.findFirst({ where: { invitedId: order.userId } });
            if (inviterReferral) {
              const inviter = await this.prisma.user.findUnique({ where: { id: inviterReferral.inviterId }, select: { email: true, firstName: true, language: true } });
              if (inviter) {
                this.email.sendReferralReward({ email: inviter.email, firstName: inviter.firstName, language: inviter.language, couponCode: result.couponCode }).catch(() => {});
              }
            }
          }
        }
      }
    } else if (paymentStatus === 'FAILED' && order.status === 'PENDING') {
      // Only a still-open order: an expired one already gave its stock back.
      await this.prisma.order.update({ where: { id: order_id }, data: { status: 'CANCELLED' } });
      const lines = await this.prisma.orderItem.findMany({ where: { orderId: order_id, productId: { not: null } }, select: { productId: true, quantity: true } });
      await releaseStock(this.prisma, lines.map((l) => ({ productId: l.productId!, quantity: l.quantity })));
    }

    return { status: 'ok' };
  }

  async getOrderPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        address: true,
        deliveryMethod: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private mapFlittStatus(flittStatus: string): PaymentStatus {
    switch (flittStatus) {
      case 'approved':
        return 'PAID';
      case 'declined':
      case 'expired':
        return 'FAILED';
      case 'reversed':
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }
}
