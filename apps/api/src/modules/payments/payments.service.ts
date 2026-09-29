import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FlittService } from './flitt.service';
import { EmailService } from '../email/email.service';
import { ReferralsService } from '../referrals/referrals.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private flitt: FlittService,
    private config: ConfigService,
    private email: EmailService,
    private referrals: ReferralsService,
    private products: ProductsService,
  ) {}

  async initiatePayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, status: 'PENDING' },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found or already paid');

    const apiUrl = this.config.get('NEXT_PUBLIC_API_URL') || 'http://localhost:4000/api/v1';
    const siteUrl = this.config.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';

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

  async handleWebhook(body: Record<string, any>) {
    const { order_id, payment_id, order_status, actual_amount, currency, ...rest } = body;

    if (!this.flitt.verifySignature(body)) {
      this.logger.warn(`Flitt webhook signature mismatch for order ${order_id}`);
      throw new BadRequestException('Invalid signature');
    }

    const order = await this.prisma.order.findUnique({ where: { id: order_id } });
    if (!order) {
      this.logger.warn(`Webhook: order not found ${order_id}`);
      return { status: 'ignored' };
    }

    const paymentStatus = this.mapFlittStatus(order_status);

    await this.prisma.payment.updateMany({
      where: { orderId: order_id, providerPaymentId: payment_id },
      data: {
        status: paymentStatus,
        paidAt: paymentStatus === 'PAID' ? new Date() : null,
        webhookData: body,
      },
    });

    if (paymentStatus === 'PAID') {
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
          select: { id: true, isGift: true, giftClaimToken: true },
        });

        if (sub && !sub.isGift) {
          await this.prisma.customerSubscription.update({
            where: { id: sub.id },
            data: { status: 'ACTIVE', startDate: new Date() },
          });
        } else if (sub?.isGift) {
          // A paid gift stays PENDING: there is no dog and no address yet, so
          // it is not shippable. It activates when the recipient claims it.
          const full = await this.prisma.order.findUnique({
            where: { id: order_id },
            include: { user: { select: { firstName: true, lastName: true } }, items: { select: { name: true, subscriptionPlanId: true } } },
          });
          const planName = full?.items.find((i) => i.subscriptionPlanId)?.name ?? 'a Pupbox subscription';
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
        include: { user: { select: { email: true, firstName: true } } },
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
              const inviter = await this.prisma.user.findUnique({ where: { id: inviterReferral.inviterId }, select: { email: true, firstName: true } });
              if (inviter) {
                this.email.sendReferralReward({ email: inviter.email, firstName: inviter.firstName, couponCode: result.couponCode }).catch(() => {});
              }
            }
          }
        }
      }
    } else if (paymentStatus === 'FAILED') {
      await this.prisma.order.update({ where: { id: order_id }, data: { status: 'CANCELLED' } });
      // Release reserved inventory
      const productItems = await this.prisma.orderItem.findMany({
        where: { orderId: order_id, productId: { not: null } },
      });
      for (const item of productItems) {
        if (item.productId) {
          await this.prisma.inventory.update({
            where: { productId: item.productId },
            data: { reservedQty: { decrement: item.quantity } },
          });
        }
      }
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
