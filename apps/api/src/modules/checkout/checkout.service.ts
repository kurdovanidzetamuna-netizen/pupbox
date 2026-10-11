import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { Prisma } from '@prisma/client';
import { releaseStock, reserveStock } from '../products/stock';
import { cancelUnpaidOrder } from '../orders/order-lifecycle';

export interface GiftDetails {
  recipientName: string;
  recipientEmail?: string;
  message?: string;
  /** When the gift starts (first box, and the note to the friend); absent = now. */
  deliverOn?: string;
  dog: {
    name: string; size: any; allergies?: string[]; breed?: string; gender?: any; weightKg?: number;
    foodPreferences?: string[]; toyPreferences?: string[]; chewingStrength?: string; specialNotes?: string;
  };
}

/** Today's date in Tbilisi (UTC+4, no daylight saving), as YYYY-MM-DD. */
const tbilisiToday = () => new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10);

/**
 * When a gift starts: null = as soon as it's paid. A chosen day means 09:00
 * Tbilisi time that day — the plan starts then, the first box goes in that
 * month's dispatch, and the friend's note (if any) is sent that morning.
 * Today or within a year; anything else is refused.
 */
function giftSendDate(raw?: string): Date | null {
  if (!raw) return null;
  const day = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new BadRequestException('Choose a valid start date for the gift');
  const today = tbilisiToday();
  const max = new Date(Date.now() + 4 * 3600_000 + 365 * 86400_000).toISOString().slice(0, 10);
  if (day < today) throw new BadRequestException('The gift can’t start in the past');
  if (day > max) throw new BadRequestException('A gift can start up to a year ahead');
  return day === today ? null : new Date(`${day}T09:00:00+04:00`);
}

@Injectable()
export class CheckoutService {
  private async assertCouponStillValid(couponId: string, cartId: string, userId: string) {
    const now = new Date();
    const c = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    const problem = !c || !c.isActive ? 'is no longer active'
      : c.expiresAt && c.expiresAt < now ? 'has expired'
      : c.startsAt && c.startsAt > now ? 'is not valid yet'
      : c.usageLimit && c.usedCount >= c.usageLimit ? 'has been used up'
      : c.perUserLimit && (await this.prisma.couponUsage.count({ where: { couponId, userId } })) >= c.perUserLimit ? 'was already used on your account'
      : null;
    if (problem) {
      await this.prisma.cart.update({ where: { id: cartId }, data: { couponId: null } });
      throw new BadRequestException(`Your coupon ${problem}, so we removed it. Check the new total and try again.`);
    }
  }

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
    latitude?: number;
    longitude?: number;
    autoRenewal?: boolean;
    gift?: GiftDetails;
  }) {
    // Sign-up finishes with an email and SMS code; no order before that.
    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true, phoneVerified: true } });
    if (!me?.emailVerified || !me.phoneVerified) throw new ForbiddenException({ message: 'Please confirm your email and phone first.', code: 'VERIFY_REQUIRED' });

    const cart = await this.cartService.getOrCreate(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const gift = data.gift;
    if (gift) {
      if (!gift.recipientName?.trim()) throw new BadRequestException('Recipient name is required for a gift');
      if (!gift.dog?.name?.trim() || !gift.dog.size) throw new BadRequestException('Tell us the name and size of the dog the gift is for');

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
    const giftDeliverOn = gift ? giftSendDate(gift.deliverOn) : null;

    const deliveryMethod = await this.prisma.deliveryMethod.findFirst({ where: { id: data.deliveryMethodId, isActive: true } });
    if (!deliveryMethod) throw new BadRequestException('Invalid delivery method');

    const deliveryCost = this.cartService.deliveryCostFor(deliveryMethod, cart, await this.cartService.cheapestDeliveryPrice());
    const total = +(cart.total + deliveryCost).toFixed(2);

    // Determine order type
    const hasSubscription = cart.items.some((i: any) => i.subscriptionPlanId);
    const hasProducts = cart.items.some((i: any) => i.productId);
    const orderType = hasSubscription && hasProducts ? 'MIXED' : hasSubscription ? 'SUBSCRIPTION' : 'PRODUCT';

    // A coupon is checked again now: it may have expired, run out, or been
    // added before signing in (when the once-per-customer limit couldn't apply).
    if (cart.couponId) await this.assertCouponStillValid(cart.couponId, cart.id, userId);

    // Hold the stock first: if something sold out meanwhile, stop before any
    // order, address or subscription is created.
    const productLines = cart.items.filter((i: any) => i.productId)
      .map((i: any) => ({ productId: i.productId, quantity: i.quantity, name: i.product?.name }));
    await reserveStock(this.prisma, productLines);

    // Create or find address — only one of this customer's own. For a gift
    // these are the friend's delivery details, entered by the buyer.
    let address = data.addressId ? await this.prisma.address.findFirst({ where: { id: data.addressId, userId, deletedAt: null } }) : null;
    if (!address) {
      address = await this.prisma.address.create({
        data: { userId, firstName: data.firstName, lastName: data.lastName, phone: data.phone, city: data.city, addressLine1: data.addressLine1, addressLine2: data.addressLine2, latitude: data.latitude ?? null, longitude: data.longitude ?? null },
      });
    }

    // The friend's dog, kept with the gift plan (not in the buyer's "My dogs").
    let giftDog: { id: string } | null = null;
    try {
      if (gift) {
        giftDog = await this.prisma.dog.create({
          data: {
            userId, forGift: true, name: gift.dog.name.trim(), size: gift.dog.size,
            allergies: [...new Set((gift.dog.allergies ?? []).map((a) => a.trim()).filter(Boolean))],
            breed: gift.dog.breed || null, gender: gift.dog.gender ?? null, weightKg: gift.dog.weightKg ?? null,
            foodPreferences: gift.dog.foodPreferences ?? [], toyPreferences: gift.dog.toyPreferences ?? [],
            chewingStrength: gift.dog.chewingStrength || null, specialNotes: gift.dog.specialNotes?.trim() || null,
          },
          select: { id: true },
        });
      }
    } catch (e) {
      await releaseStock(this.prisma, productLines);
      throw e;
    }
    const dogId = giftDog?.id ?? (data.dogId ? (await this.prisma.dog.findFirst({ where: { id: data.dogId, userId, deletedAt: null }, select: { id: true } }))?.id ?? null : null);

    // Create order — and hand the held stock back if that fails.
    let order: Prisma.OrderGetPayload<{ include: { items: true; address: true; deliveryMethod: true } }>;
    try {
      order = await this.prisma.order.create({
        data: {
          userId,
          dogId,
          addressId: address.id,
          deliveryMethodId: data.deliveryMethodId,
          couponId: cart.couponId || null,
          type: orderType as any,
          status: 'PENDING',
          isGift: !!gift,
          giftRecipientName: gift?.recipientName?.trim() || null,
          giftRecipientEmail: gift?.recipientEmail?.trim().toLowerCase() || null,
          giftMessage: gift?.message?.trim() || null,
          giftDeliverOn,
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
    } catch (e) {
      await releaseStock(this.prisma, productLines);
      if (giftDog) await this.prisma.dog.delete({ where: { id: giftDog.id } }).catch(() => {});
      throw e;
    }

    // Create pending subscription if subscription in cart
    if (hasSubscription) {
      let firstSubscriptionId: string | null = null;
      for (const item of cart.items.filter((i: any) => i.subscriptionPlanId)) {
        const created = await this.prisma.customerSubscription.create({
          data: {
            // A gift stays the buyer's: it shows in their account, where they
            // can change the friend's address or cancel it.
            userId,
            planId: item.subscriptionPlanId,
            dogId,
            addressId: address.id,
            status: 'PENDING',
            boxesTotal: item.subscriptionPlan.boxCount,
            isGift: !!gift,
            purchasedByUserId: gift ? userId : null,
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

    // Record coupon usage. The count only goes up while under the limit, so
    // two shoppers at once can't take a coupon past its last use.
    if (cart.couponId) {
      const c = await this.prisma.coupon.findUnique({ where: { id: cart.couponId }, select: { usageLimit: true } });
      const { count } = await this.prisma.coupon.updateMany({
        where: { id: cart.couponId, ...(c?.usageLimit ? { usedCount: { lt: c.usageLimit } } : {}) },
        data: { usedCount: { increment: 1 } },
      });
      if (!count) {
        await cancelUnpaidOrder(this.prisma, order.id, 'Coupon ran out while ordering.');
        throw new BadRequestException('That coupon has just been used up. Remove it from your cart and try again.');
      }
      await this.prisma.couponUsage.create({ data: { couponId: cart.couponId, userId, orderId: order.id } });
    }

    // Clear cart
    await this.cartService.clear(cart.id);

    return order;
  }
}
