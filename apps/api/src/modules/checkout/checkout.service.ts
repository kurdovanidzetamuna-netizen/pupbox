import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { Prisma } from '@prisma/client';
import { releaseStock, reserveStock } from '../products/stock';
import { cancelUnpaidOrder } from '../orders/order-lifecycle';
import { customBoxPlan, quoteSavedBox } from '../custom-box/custom-box';
import { shopSettings } from '../settings/settings';
import { checkReferralCode, referralDiscount } from '../referrals/referral-promo';
import { couponDiscount, couponGap, hasPaidBefore } from '../coupons/coupon-discount';

export interface GiftDetails {
  recipientName: string;
  recipientEmail?: string;
  message?: string;
  /** When the gift starts (first box, and the note to the friend); absent = now. */
  deliverOn?: string;
  dog: {
    name: string; size: any; allergies?: string[]; breed?: string; gender?: any; weightKg?: number;
    foodPreferences?: string[]; toyPreferences?: string[]; chewingStrength?: string; likedCategoryIds?: string[]; specialNotes?: string; birthday?: string | null;
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
      : c.firstOrderOnly && (await hasPaidBefore(this.prisma, userId)) ? 'is for a first order only'
      : null;
    if (problem) {
      await this.prisma.cart.update({ where: { id: cartId }, data: { couponId: null } });
      throw new BadRequestException(`Your promo code ${problem}, so we removed it. Check the new total and try again.`);
    }
  }

  constructor(private prisma: PrismaService, private cartService: CartService) {}

  async prepare(userId: string, data: { deliveryMethodId: string; addressId?: string; dogId?: string; couponCode?: string }) {
    const cart = await this.cartService.getOrCreate(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const deliveryMethod = await this.prisma.deliveryMethod.findFirst({ where: { id: data.deliveryMethodId, isActive: true } });
    if (!deliveryMethod) throw new BadRequestException('Invalid delivery method');

    const deliveryCost = this.cartService.deliveryCostFor(deliveryMethod, cart, await this.cartService.cheapestDeliveryPrice());
    const off = cart.coupon ? couponDiscount(cart.coupon, cart.items, deliveryCost) : { items: cart.discountAmount, delivery: 0 };
    const total = Math.max(0, cart.subtotal - off.items) + deliveryCost - off.delivery;

    return {
      cart,
      deliveryMethod: { ...deliveryMethod, effectivePrice: deliveryCost },
      totals: { subtotal: cart.subtotal, discount: +(off.items + off.delivery).toFixed(2), delivery: deliveryCost, total: +total.toFixed(2) },
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
    addressLabel?: string;
    makeMainAddress?: boolean;
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
    if (gift && cart.items.some((i: any) => i.customBoxId)) throw new BadRequestException('A box you built can’t be sent as a gift yet. Remove it to send a gift.');
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
    let total = +(cart.total + deliveryCost).toFixed(2);

    // Built boxes, priced and checked once more: a one-time box becomes its
    // products (stock held, sellers paid) plus the packing fee; a monthly box
    // becomes a subscription whose boxes hold those products.
    const boxes = await Promise.all(cart.items.filter((i: any) => i.customBoxId).map(async (i: any) => ({
      line: i, monthly: !!i.customBox?.monthly, quote: (await quoteSavedBox(this.prisma, i.customBoxId, !!i.customBox?.monthly)).quote,
    })));
    const boxPlan = boxes.some((b) => b.monthly) ? await customBoxPlan(this.prisma) : null;

    // Determine order type
    const hasSubscription = cart.items.some((i: any) => i.subscriptionPlanId) || boxes.some((b) => b.monthly);
    const hasProducts = cart.items.some((i: any) => i.productId) || boxes.some((b) => !b.monthly);
    const orderType = hasSubscription && hasProducts ? 'MIXED' : hasSubscription ? 'SUBSCRIPTION' : 'PRODUCT';

    // A coupon is checked again now: it may have expired, run out, or been
    // added before signing in (when the once-per-customer limit couldn't apply).
    if (cart.couponId) await this.assertCouponStillValid(cart.couponId, cart.id, userId);

    // A friend's code, checked again now we know who's ordering (first order,
    // not their own code) and priced for what this order is (a plan as a gift
    // counts as a gift).
    let discountAmount = cart.discountAmount;
    // The coupon priced for what this order is: a plan as a gift counts as a
    // gift, and a coupon that covers delivery takes its part off the fee.
    if (cart.coupon) {
      // A code that takes nothing off isn't used up on this order: take it out and say why.
      const gap = couponGap(cart.coupon, cart.items, { delivery: deliveryCost, gift: !!gift });
      if (gap) {
        await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
        const why = gap.reason === 'MIN' ? `needs an order of at least ₾${Number(cart.coupon.minOrderAmount)}`
          : gap.reason === 'GIFT' ? 'only works on a box sent as a gift'
          : 'doesn’t cover anything in this order';
        throw new BadRequestException(`Your promo code ${why}, so we removed it. Check the new total and try again.`);
      }
      const off = couponDiscount(cart.coupon, cart.items, deliveryCost, { gift: !!gift });
      discountAmount = +(off.items + off.delivery).toFixed(2);
      total = +(Math.max(0, cart.subtotal - off.items) + deliveryCost - off.delivery).toFixed(2);
    }
    let referral: { inviterId: string; code: string; discount: number } | null = null;
    if (cart.referralCode) {
      const offer = (await shopSettings(this.prisma)).referral;
      const drop = async (why: string) => {
        await this.prisma.cart.update({ where: { id: cart.id }, data: { referralCode: null } });
        throw new BadRequestException(`${why} We removed the code — check the new total and try again.`);
      };
      const inviter = await checkReferralCode(this.prisma, offer, cart.referralCode, userId).catch((e) => drop(e.message));
      if (!inviter) await drop('That friend code no longer works.');
      discountAmount = referralDiscount(offer, cart.items, { gift: !!gift });
      referral = { inviterId: inviter!.id, code: inviter!.referralCode, discount: discountAmount };
      total = +(Math.max(0, cart.subtotal - discountAmount) + deliveryCost).toFixed(2);
    }

    // Hold the stock first: if something sold out meanwhile, stop before any
    // order, address or subscription is created.
    const productLines = [
      ...cart.items.filter((i: any) => i.productId).map((i: any) => ({ productId: i.productId, quantity: i.quantity, name: i.product?.name })),
      ...boxes.filter((b) => !b.monthly).flatMap((b) => b.quote.items.map((x) => ({ productId: x.productId, quantity: x.quantity, name: x.name }))),
    ];
    await reserveStock(this.prisma, productLines);

    // Create or find address — only one of this customer's own. For a gift
    // these are the friend's delivery details, entered by the buyer.
    let address = data.addressId ? await this.prisma.address.findFirst({ where: { id: data.addressId, userId, deletedAt: null } }) : null;
    // The same address typed again: use the saved one, so "My addresses" doesn't fill with copies.
    if (!address && !data.addressId) {
      address = await this.prisma.address.findFirst({
        where: { userId, deletedAt: null, isGift: !!gift, firstName: data.firstName, lastName: data.lastName, phone: data.phone, city: data.city, addressLine1: data.addressLine1, ...(data.addressLine2 ? { addressLine2: data.addressLine2 } : { OR: [{ addressLine2: null }, { addressLine2: '' }] }) },
        orderBy: { createdAt: 'desc' },
      });
    }
    // Their own address, named if they named it; the first one (or one they
    // ask for) becomes their main address, shown first next time.
    const makeMain = !gift && (!!data.makeMainAddress || !(await this.prisma.address.count({ where: { userId, deletedAt: null, isGift: false } })));
    if (makeMain && !(address?.isDefault)) await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    if (address && !gift && (makeMain || (data.addressLabel && !address.label))) {
      address = await this.prisma.address.update({ where: { id: address.id }, data: { ...(makeMain ? { isDefault: true } : {}), ...(data.addressLabel && !address.label ? { label: data.addressLabel } : {}) } });
    }
    if (!address) {
      address = await this.prisma.address.create({
        data: {
          ...(!gift ? { label: data.addressLabel || null, isDefault: makeMain } : {}),
          userId, firstName: data.firstName, lastName: data.lastName, phone: data.phone, city: data.city, addressLine1: data.addressLine1, addressLine2: data.addressLine2, latitude: data.latitude ?? null, longitude: data.longitude ?? null,
          // A friend's address for a gift: tagged and kept apart in the buyer's list.
          ...(gift ? { isGift: true, label: `Gift · ${gift.recipientName.trim()}`.slice(0, 40) } : {}),
        },
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
            likedCategoryIds: gift.dog.likedCategoryIds?.length ? (await this.prisma.productCategory.findMany({ where: { id: { in: gift.dog.likedCategoryIds }, deletedAt: null }, select: { id: true } })).map((c) => c.id) : [],
            chewingStrength: gift.dog.chewingStrength || null, specialNotes: gift.dog.specialNotes?.trim() || null,
            birthday: gift.dog.birthday ? new Date(gift.dog.birthday) : null,
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
    // Sellers' prices for their products in this basket (admin-only figures).
    const productIds = [...cart.items.map((i: any) => i.productId).filter(Boolean), ...boxes.flatMap((b) => b.quote.items.map((x) => x.productId))] as string[];
    const supplies = new Map(
      (productIds.length ? await this.prisma.productSupply.findMany({ where: { productId: { in: productIds } }, select: { productId: true, sellerPrice: true } }) : [])
        .map((x) => [x.productId, x.sellerPrice] as const),
    );
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
          discountAmount,
          referralCode: referral?.code ?? null,
          referralDiscount: referral?.discount ?? null,
          total,
          items: {
            create: [...cart.items.filter((item: any) => !item.customBoxId).map((item: any) => ({
              productId: item.productId || null,
              subscriptionPlanId: item.subscriptionPlanId || null,
              name: item.product?.name || item.subscriptionPlan?.name || 'Item',
              sku: item.product?.sku || null,
              price: item.price,
              quantity: item.quantity,
              total: +(Number(item.price) * item.quantity).toFixed(2),
              personalisation: item.personalisation ?? Prisma.DbNull,
              // What we owe the seller for it, as agreed at the time of sale.
              sellerId: item.product?.sellerId ?? null,
              sellerPrice: item.productId ? supplies.get(item.productId) ?? null : null,
            })),
            ...boxes.flatMap((b) => b.monthly
              ? [{ subscriptionPlanId: boxPlan!.id, customBoxId: b.line.customBoxId, name: boxPlan!.name, price: b.quote.total, quantity: 1, total: b.quote.total }]
              : [
                  ...b.quote.items.map((x) => ({
                    productId: x.productId, customBoxId: b.line.customBoxId, name: x.name, sku: x.sku, price: x.unit, quantity: x.quantity, total: x.total,
                    sellerId: x.sellerId, sellerPrice: supplies.get(x.productId) ?? null,
                  })),
                  // Surprise items: admin picks them when packing; the customer never sees which.
                  ...(b.quote.mystery.count ? [{ customBoxId: b.line.customBoxId, name: 'Mystery item', price: b.quote.mystery.unit, quantity: b.quote.mystery.count, total: b.quote.mystery.total }] : []),
                  ...(b.quote.packingFee ? [{ customBoxId: b.line.customBoxId, name: 'Custom box — packing', price: b.quote.packingFee, quantity: 1, total: b.quote.packingFee }] : []),
                ]),
            ],
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
      // A monthly box the customer built: a box a month, renewing monthly on
      // their explicit yes at checkout, like any plan.
      for (const b of boxes.filter((x) => x.monthly)) {
        const created = await this.prisma.customerSubscription.create({
          data: {
            userId, planId: boxPlan!.id, customBoxId: b.line.customBoxId, dogId, addressId: address.id,
            status: 'PENDING', boxesTotal: 1, autoRenewal: data.autoRenewal === true,
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

    // A friend's code links this customer to the friend (once): when this
    // first order sticks, the friend gets their reward.
    if (referral && !(await this.prisma.referral.findFirst({ where: { invitedId: userId }, select: { id: true } }))) {
      await this.prisma.referral.create({ data: { inviterId: referral.inviterId, invitedId: userId, status: 'REGISTERED' } });
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
        throw new BadRequestException('That promo code has just been used up. Remove it from your cart and try again.');
      }
      await this.prisma.couponUsage.create({ data: { couponId: cart.couponId, userId, orderId: order.id } });
    }

    // Clear cart
    await this.cartService.clear(cart.id);

    return order;
  }
}
