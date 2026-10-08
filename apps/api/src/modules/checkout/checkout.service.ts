import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { Prisma } from '@prisma/client';

export interface GiftDetails {
  recipientName: string;
  recipientEmail: string;
  message?: string;
  /** When the gift card email should go out; null/absent means immediately. */
  deliverOn?: string;
}

@Injectable()
export class CheckoutService {
  constructor(private prisma: PrismaService, private cartService: CartService) {}

  async prepare(userId: string, data: { deliveryMethodId: string; addressId?: string; dogId?: string; couponCode?: string }) {
    const cart = await this.cartService.getOrCreate(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const deliveryMethod = await this.prisma.deliveryMethod.findFirst({ where: { id: data.deliveryMethodId, isActive: true } });
    if (!deliveryMethod) throw new BadRequestException('Invalid delivery method');

    const deliveryCost = this.cartService.deliveryCostFor(deliveryMethod, cart, await this.cartService.cheapestDeliveryPrice());
    const total = cart.total + deliveryCost;

    return {
      cart,
      deliveryMethod: { ...deliveryMethod, effectivePrice: deliveryCost },
      totals: { subtotal: cart.subtotal, discount: cart.discountAmount, delivery: deliveryCost, total: +total.toFixed(2) },
    };
  }

  async createOrder(userId: string, data: {
    deliveryMethodId: string;
    addressId?: string;
    dogId?: string;
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    addressLine1: string;
    addressLine2?: string;
    autoRenewal?: boolean;
    gift?: GiftDetails;
  }) {
    const cart = await this.cartService.getOrCreate(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const gift = data.gift;
    if (gift) {
      if (!gift.recipientName?.trim()) throw new BadRequestException('Recipient name is required for a gift');
      if (!/^\S+@\S+\.\S+$/.test(gift.recipientEmail ?? '')) throw new BadRequestException('A valid recipient email is required for a gift');

      const planItems = cart.items.filter((i: any) => i.subscriptionPlanId);
      if (planItems.length === 0) throw new BadRequestException('Only subscriptions can be gifted');

      // Respect the per-plan switch rather than assuming every plan is giftable.
      const plans = await this.prisma.subscriptionPlan.findMany({
        where: { id: { in: planItems.map((i: any) => i.subscriptionPlanId) } },
        select: { id: true, name: true, slug: true, giftable: true },
      });
      const blocked = plans.find((p) => !p.giftable);
      if (blocked) throw new BadRequestException(`"${blocked.name || blocked.slug}" cannot be given as a gift`);
    }

    const deliveryMethod = await this.prisma.deliveryMethod.findFirst({ where: { id: data.deliveryMethodId, isActive: true } });
    if (!deliveryMethod) throw new BadRequestException('Invalid delivery method');

    const deliveryCost = this.cartService.deliveryCostFor(deliveryMethod, cart, await this.cartService.cheapestDeliveryPrice());
    const total = +(cart.total + deliveryCost).toFixed(2);

    // Determine order type
    const hasSubscription = cart.items.some((i: any) => i.subscriptionPlanId);
    const hasProducts = cart.items.some((i: any) => i.productId);
    const orderType = hasSubscription && hasProducts ? 'MIXED' : hasSubscription ? 'SUBSCRIPTION' : 'PRODUCT';

    // Create or find address
    let address = data.addressId ? await this.prisma.address.findUnique({ where: { id: data.addressId } }) : null;
    if (!address) {
      address = await this.prisma.address.create({
        data: { userId, firstName: data.firstName, lastName: data.lastName, phone: data.phone, city: data.city, addressLine1: data.addressLine1, addressLine2: data.addressLine2 },
      });
    }

    // Create order
    const order = await this.prisma.order.create({
      data: {
        userId,
        // A gift is for someone else's dog, which is not in our database yet.
        dogId: gift ? null : data.dogId || null,
        addressId: address.id,
        deliveryMethodId: data.deliveryMethodId,
        couponId: cart.couponId || null,
        type: orderType as any,
        status: 'PENDING',
        isGift: !!gift,
        giftRecipientName: gift?.recipientName?.trim() || null,
        giftRecipientEmail: gift?.recipientEmail?.trim().toLowerCase() || null,
        giftMessage: gift?.message?.trim() || null,
        giftDeliverOn: gift?.deliverOn ? new Date(gift.deliverOn) : null,
        subtotal: cart.subtotal,
        deliveryCost,
        discountAmount: cart.discountAmount,
        total,
        items: {
          create: cart.items.map((item: any) => ({
            productId: item.productId || null,
            subscriptionPlanId: item.subscriptionPlanId || null,
            name: item.product?.name || item.subscriptionPlan?.name || 'Item',
            sku: item.product?.sku || null,
            price: item.price,
            quantity: item.quantity,
            total: +(Number(item.price) * item.quantity).toFixed(2),
            personalisation: item.personalisation ?? Prisma.DbNull,
          })),
        },
      },
      include: { items: true, address: true, deliveryMethod: true },
    });

    // Create pending subscription if subscription in cart
    if (hasSubscription) {
      let firstSubscriptionId: string | null = null;
      for (const item of cart.items.filter((i: any) => i.subscriptionPlanId)) {
        const created = await this.prisma.customerSubscription.create({
          data: {
            // Until claimed a gift belongs to the buyer: they paid for it, and
            // the recipient has no account yet.
            userId,
            planId: item.subscriptionPlanId,
            dogId: gift ? null : data.dogId || null,
            status: 'PENDING',
            boxesTotal: item.subscriptionPlan.boxCount,
            isGift: !!gift,
            purchasedByUserId: gift ? userId : null,
            // Opaque, unguessable — this token is the only credential guarding
            // the claim link that arrives by email.
            giftClaimToken: gift ? crypto.randomBytes(24).toString('base64url') : null,
            // Never keep billing the buyer for someone else's dog; otherwise
            // honour what the customer chose at checkout.
            // Renewal only on an explicit yes: defaulting to true would renew
            // "by default", which consumer law voids (Art. 22(3)(i)).
            autoRenewal: !gift && item.subscriptionPlan.autoRenewal !== false && data.autoRenewal === true,
          },
          select: { id: true },
        });
        if (!firstSubscriptionId) firstSubscriptionId = created.id;
      }
      // Link the order to its subscription so the payment webhook can activate
      // exactly this one. It previously activated every PENDING subscription
      // belonging to the user, which fired on unrelated purchases.
      if (firstSubscriptionId) {
        await this.prisma.order.update({ where: { id: order.id }, data: { subscriptionId: firstSubscriptionId } });
      }
    }

    // Reserve inventory for products
    for (const item of cart.items.filter((i: any) => i.productId)) {
      await this.prisma.inventory.update({
        where: { productId: item.productId },
        data: { reservedQty: { increment: item.quantity } },
      });
    }

    // Record coupon usage
    if (cart.couponId) {
      await this.prisma.couponUsage.create({ data: { couponId: cart.couponId, userId, orderId: order.id } });
      await this.prisma.coupon.update({ where: { id: cart.couponId }, data: { usedCount: { increment: 1 } } });
    }

    // Clear cart
    await this.cartService.clear(cart.id);

    return order;
  }
}
