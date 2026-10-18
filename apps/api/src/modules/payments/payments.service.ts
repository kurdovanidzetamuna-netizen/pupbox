import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { notify } from '../notifications/notify';
import { saveCardFromBank } from './saved-cards';
import { PrismaService } from '../prisma/prisma.service';
import { FlittService } from './flitt.service';
import { EmailService } from '../email/email.service';
import { ProductsService } from '../products/products.service';
import { subscriptionPeriod } from '../subscriptions/subscription-period';
import { cancelUnpaidOrder } from '../orders/order-lifecycle';
import { sendGiftCard } from '../gifts/gift-card';
import { extendAfterRenewal } from '../subscriptions/renewal';
import { shopSettings } from '../settings/settings';

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
      // Renewal orders wait for their own deadline (renewal.ts), not 2 hours.
      where: { status: 'PENDING', type: { not: 'RENEWAL' }, createdAt: { lt: new Date(Date.now() - UNPAID_TTL_MS) }, payments: { none: { status: 'PAID' } } },
      select: { id: true },
    });
    let expired = 0;
    for (const o of stale) {
      if (await cancelUnpaidOrder(this.prisma, o.id, 'Cancelled automatically: not paid within 2 hours.')) expired++;
    }
    if (expired) this.logger.log(`Cancelled ${expired} order(s) left unpaid for 2 hours`);
    return { expired };
  }

  async initiatePayment(orderId: string, userId: string, { saveCard = false } = {}) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, status: 'PENDING' },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found or already paid');

    const apiUrl = this.config.get('NEXT_PUBLIC_API_URL') || 'http://localhost:4000/api/v1';
    const siteUrl = this.config.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';

    // Nothing to pay (a 100% coupon): banks can't take ₾0, so it's simply paid.
    if (Number(order.total) <= 0) return this.completeFreeOrder(order, userId, siteUrl);

    if (this.simulatesPayments()) return this.simulatePayment(order, userId, siteUrl);

    const { checkoutUrl, paymentId } = await this.flitt.createCheckout({
      orderId: order.id,
      amount: Number(order.total),
      description: `Pupbox order #${order.id.slice(-8).toUpperCase()}`,
      serverCallbackUrl: `${apiUrl}/payments/webhook/flitt`,
      responseUrl: `${siteUrl}/checkout/thank-you?order=${order.id}`,
      saveCard,
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

  private async completeFreeOrder(order: { id: string; total: any }, userId: string, siteUrl: string) {
    const paymentId = `free-${Date.now()}`;
    await this.prisma.payment.create({ data: { orderId: order.id, userId, provider: 'NONE', providerPaymentId: paymentId, amount: 0, currency: 'GEL', status: 'PENDING' } });
    await this.applyPaymentResult({ order_id: order.id, payment_id: paymentId, order_status: 'approved', simulated: true });
    return { checkoutUrl: `${siteUrl}/checkout/thank-you?order=${order.id}&payment_status=approved`, paymentId };
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

  /** Tells the shop a paid order came in, if admin → Settings has an address for it. */
  private async notifyShop(orderId: string) {
    const { orderNotifyEmail } = await shopSettings(this.prisma);
    if (!orderNotifyEmail) return;
    const o = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, type: true, total: true, isGift: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        address: { select: { city: true } },
        items: { select: { name: true, quantity: true, personalisation: true } },
      },
    });
    if (!o) return;
    await this.email.sendNewOrderAlert(orderNotifyEmail, {
      id: o.id, type: o.type, total: Number(o.total), isGift: o.isGift,
      customer: [o.user.firstName, o.user.lastName].filter(Boolean).join(' '), customerEmail: o.user.email,
      city: o.address?.city, items: o.items,
    });
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

    let paymentStatus = this.mapFlittStatus(order_status);

    // The bank must have taken exactly this order's total, in lari. Anything
    // else is not a payment for this order: keep it unpaid and flag it.
    // (The development stand-in carries no amount and is trusted.)
    if (paymentStatus === 'PAID' && !body.simulated) {
      const expected = Math.round(Number(order.total) * 100);
      const got = Number(body.amount ?? body.actual_amount);
      const currency = String(body.currency ?? body.actual_currency ?? 'GEL').toUpperCase();
      if (got !== expected || currency !== 'GEL') {
        this.logger.error(`Order ${order_id}: bank reported ${got} ${currency}, expected ${expected} GEL — not marked paid`);
        await this.prisma.order.update({
          where: { id: order_id },
          data: { internalNotes: [order.internalNotes, `Payment amount mismatch: bank reported ${got / 100} ${currency}, order total ${Number(order.total).toFixed(2)} GEL. Check in Flitt before shipping.`].filter(Boolean).join('\n') },
        });
        return { status: 'amount-mismatch' };
      }
    }

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
      if (order.type === 'RENEWAL') {
        // Paying a renewal extends the plan for another term.
        await extendAfterRenewal(this.prisma, order_id);
      } else if (order.subscriptionId) {
        const sub = await this.prisma.customerSubscription.findUnique({
          where: { id: order.subscriptionId },
          select: { id: true, isGift: true, autoRenewal: true, plan: { select: { durationValue: true, durationUnit: true } } },
        });

        if (sub) {
          // A gift has the friend's dog and address already, so it starts like
          // any plan — on the buyer's chosen day if they picked one (its first
          // box then goes in that month's dispatch). Gifts never renew.
          const now = new Date();
          const start = sub.isGift && order.giftDeliverOn && order.giftDeliverOn > now ? order.giftDeliverOn : now;
          await this.prisma.customerSubscription.update({
            where: { id: sub.id },
            data: { status: 'ACTIVE', ...subscriptionPeriod(start, sub.plan, sub.isGift ? false : sub.autoRenewal) },
          });
        }
        if (sub?.isGift) {
          // The friend's "a gift is on its way" note, if the buyer gave their
          // email: now, or on the chosen day (hourly sender).
          sendGiftCard(this.prisma, this.email, order_id)
            .catch((e) => this.logger.error(`Gift note email failed for order ${order_id}: ${e.message}`));
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

      // Send confirmation email
      const fullOrder = await this.prisma.order.findUnique({
        where: { id: order_id },
        include: { user: { select: { email: true, firstName: true, language: true } } },
      });
      if (fullOrder?.user) {
        this.email.sendPaymentConfirmation({ id: order_id, total: Number(order.total), user: fullOrder.user }).catch(() => {});
        if (body.rectoken) await saveCardFromBank(this.prisma, order.userId, body);
        notify(this.prisma, order.userId, 'ORDER_PAID', { orderId: order_id, total: Number(order.total), kind: order.type, gift: !!order.isGift }, '/account/orders');
        this.notifyShop(order_id).catch((e) => this.logger.error(`New order email failed for ${order_id}: ${e.message}`));
        // The inviter's referral reward follows once this order is past the
        // free-cancellation window (ReferralsService.grantDueRewards).
      }
    } else if (paymentStatus === 'FAILED' && order.status === 'PENDING') {
      // A declined card leaves the order waiting for payment, stock still
      // held, so the customer can try again (another card, more funds). The
      // basket was emptied at checkout, so cancelling here made them rebuild
      // it. Never paid, it expires like any unpaid order (expireUnpaid; for a
      // renewal, endUnpaidRenewals).
      notify(this.prisma, order.userId, 'PAYMENT_FAILED', { orderId: order_id, total: Number(order.total), kind: order.type }, order.type === 'RENEWAL' ? '/account/subscriptions' : '/account/orders');
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
