import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { checkChoice, sameChoice } from '../products/personalisation';
import { quoteBox, quoteSavedBox, tidy, type BoxLine } from '../custom-box/custom-box';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      // The main photo (else the first), and the category for a picture when there's none.
      product: { include: { images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 }, inventory: true, category: { select: { slug: true, name: true } } } },
      subscriptionPlan: true,
      // A built box: what's in it, with names and pictures for the basket.
      customBox: { include: { items: { orderBy: { id: 'asc' as const }, include: { product: { select: { id: true, name: true, slug: true, translations: true, price: true, salePrice: true, images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 }, category: { select: { slug: true, name: true } } } } } } } },
    },
  },
  coupon: true,
};

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getOrCreate(userId?: string, sessionId?: string) {
    const where = userId ? { userId } : { sessionId };
    let cart = await this.prisma.cart.findFirst({ where, include: cartInclude, orderBy: { createdAt: 'desc' } });
    if (!cart) {
      // An account cart carries no session id, so it can never be mistaken
      // for a guest cart by the merge below.
      cart = await this.prisma.cart.create({ data: userId ? { userId } : { sessionId }, include: cartInclude });
    }
    // A shopper who signs in mid-way still sends their guest session id. Fold
    // that guest cart into the account cart, or everything they added before
    // signing in silently disappears and checkout finds an empty cart.
    if (userId && sessionId) cart = await this.mergeGuestCart(cart, sessionId);
    return this.withTotals(await this.refresh(cart));
  }

  private async mergeGuestCart(userCart: any, sessionId: string) {
    const guest = await this.prisma.cart.findFirst({ where: { sessionId, userId: null }, include: cartInclude });
    if (!guest || guest.id === userCart.id) return userCart;

    for (const item of guest.items) {
      // A built box moves over as it is.
      if (item.customBoxId) {
        await this.prisma.cartItem.update({ where: { id: item.id }, data: { cartId: userCart.id } });
        await this.prisma.customBox.update({ where: { id: item.customBoxId }, data: { userId: userCart.userId } });
        continue;
      }
      const match = userCart.items.find((i: any) =>
        item.productId ? i.productId === item.productId && sameChoice(i.personalisation, item.personalisation) : i.subscriptionPlanId === item.subscriptionPlanId);
      if (!match) {
        await this.prisma.cartItem.update({ where: { id: item.id }, data: { cartId: userCart.id } });
      } else if (item.productId) {
        await this.prisma.cartItem.update({ where: { id: match.id }, data: { quantity: match.quantity + item.quantity } });
      }
      // The same plan already in the account cart: one subscription per plan.
    }
    if (guest.couponId && !userCart.couponId) {
      await this.prisma.cart.update({ where: { id: userCart.id }, data: { couponId: guest.couponId } });
    }
    await this.prisma.cartItem.deleteMany({ where: { cartId: guest.id } });
    await this.prisma.cart.delete({ where: { id: guest.id } });
    return this.prisma.cart.findUniqueOrThrow({ where: { id: userCart.id }, include: cartInclude });
  }

  async addItem(cartId: string, data: { productId?: string; subscriptionPlanId?: string; quantity?: number; personalisation?: unknown }) {
    const { productId, subscriptionPlanId, quantity = 1 } = data;

    if (!productId && !subscriptionPlanId) throw new BadRequestException('Provide productId or subscriptionPlanId');

    let price = 0;

    if (productId) {
      const product = await this.prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE', deletedAt: null }, include: { inventory: true } });
      if (!product) throw new NotFoundException('Product not found or unavailable');
      // What's free to sell: stock minus what unpaid orders are holding.
      if (product.inventory && product.inventory.quantity - product.inventory.reservedQty < quantity) throw new BadRequestException('Insufficient stock');
      price = Number(product.salePrice ?? product.price);
      const personalisation = checkChoice(product.personalisation, data.personalisation);

      // A bowl engraved "Rex" and one engraved "Luna" are two lines, not quantity 2.
      const lines = await this.prisma.cartItem.findMany({ where: { cartId, productId } });
      const existing = lines.find((l) => sameChoice(l.personalisation, personalisation));
      if (existing) {
        await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
      } else {
        await this.prisma.cartItem.create({ data: { cartId, productId, price, quantity, personalisation: personalisation ?? Prisma.DbNull } });
      }
    }

    if (subscriptionPlanId) {
      // The monthly custom box plan is only bought by building a box.
      const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id: subscriptionPlanId, isActive: true, deletedAt: null, isCustomBox: false } });
      if (!plan) throw new NotFoundException('Subscription plan not found');
      if (await this.prisma.cartItem.count({ where: { cartId, customBox: { monthly: true } } })) {
        throw new BadRequestException('Your basket already has a monthly box. Check that one out first, or remove it, then add a plan.');
      }
      price = Number(plan.price);

      const existing = await this.prisma.cartItem.findFirst({ where: { cartId, subscriptionPlanId } });
      if (existing) {
        // only 1 subscription per cart
        return this.getCart(cartId);
      }
      await this.prisma.cartItem.create({ data: { cartId, subscriptionPlanId, price, quantity: 1 } });
    }

    return this.getCart(cartId);
  }

  /**
   * Puts a box the customer built in the basket (or replaces the one they
   * were editing). A monthly box is a subscription, so it can't share the
   * basket with another monthly box or a plan.
   */
  async addBox(cartId: string, userId: string | undefined, data: { items: BoxLine[]; monthly: boolean; mystery?: number; replaceItemId?: string }) {
    const monthly = !!data.monthly;
    const quote = await quoteBox(this.prisma, data.items, monthly, { mystery: data.mystery });
    const lines = await this.prisma.cartItem.findMany({ where: { cartId }, select: { id: true, customBoxId: true, subscriptionPlanId: true, customBox: { select: { monthly: true } } } });
    const replacing = data.replaceItemId ? lines.find((l) => l.id === data.replaceItemId && l.customBoxId) : undefined;
    if (data.replaceItemId && !replacing) throw new NotFoundException('That box is no longer in your basket');
    if (monthly && lines.some((l) => l.id !== replacing?.id && (l.subscriptionPlanId || l.customBox?.monthly))) {
      throw new BadRequestException('Your basket already has a subscription. Check that one out first, or remove it, then add your monthly box.');
    }
    const box = await this.prisma.customBox.create({
      data: { userId: userId ?? null, monthly, mysteryCount: quote.mystery.count, items: { create: tidy(data.items).map((l) => ({ productId: l.productId, quantity: l.quantity })) } },
      select: { id: true },
    });
    if (replacing) {
      await this.prisma.cartItem.update({ where: { id: replacing.id }, data: { customBoxId: box.id, price: quote.total, quantity: 1 } });
      await this.prisma.customBox.deleteMany({ where: { id: replacing.customBoxId!, orderItems: { none: {} }, subscriptions: { none: {} } } });
    } else {
      await this.prisma.cartItem.create({ data: { cartId, customBoxId: box.id, price: quote.total, quantity: 1 } });
    }
    return this.getCart(cartId);
  }

  async updateItem(cartId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException('Cart item not found');
    // A box is one box; its contents change in the builder.
    if (item.customBoxId && quantity > 1) throw new BadRequestException('To change a box, edit what’s in it.');
    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }
    return this.getCart(cartId);
  }

  async removeItem(cartId: string, itemId: string) {
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
    return this.getCart(cartId);
  }

  async applyCoupon(cartId: string, code: string, userId?: string) {
    const now = new Date();
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        isActive: true,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        ],
      },
    });
    if (!coupon) throw new BadRequestException('Invalid or expired coupon code');

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (userId && coupon.perUserLimit) {
      const used = await this.prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
      if (used >= coupon.perUserLimit) throw new BadRequestException('You have already used this coupon');
    }

    await this.prisma.cart.update({ where: { id: cartId }, data: { couponId: coupon.id } });
    return this.getCart(cartId);
  }

  async removeCoupon(cartId: string) {
    await this.prisma.cart.update({ where: { id: cartId }, data: { couponId: null } });
    return this.getCart(cartId);
  }

  async clear(cartId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    await this.prisma.cart.update({ where: { id: cartId }, data: { couponId: null } });
  }

  /**
   * What a delivery method costs for this cart. A plan sold with delivery
   * included ("Free delivery" on its pricing card) covers the standard
   * (cheapest) option; a faster one costs only the difference. Anything else
   * in the same order ships with the plan's first box.
   */
  deliveryCostFor(method: { price: any; freeThreshold: any }, cart: { subtotal: number; deliveryIncluded?: boolean }, cheapest: number) {
    if (cart.deliveryIncluded) return +Math.max(0, Number(method.price) - cheapest).toFixed(2);
    if (method.freeThreshold && cart.subtotal >= Number(method.freeThreshold)) return 0;
    return Number(method.price);
  }

  /** Price of the cheapest active delivery method: what a plan's included delivery covers. */
  async cheapestDeliveryPrice(): Promise<number> {
    const agg = await this.prisma.deliveryMethod.aggregate({ where: { isActive: true }, _min: { price: true } });
    return Number(agg._min.price ?? 0);
  }

  async getDeliveryMethods(cart: { subtotal: number; deliveryIncluded?: boolean }) {
    const methods = await this.prisma.deliveryMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const cheapest = Math.min(...methods.map(m => Number(m.price)));
    return methods.map(m => {
      const effectivePrice = this.deliveryCostFor(m, cart, cheapest);
      return {
        ...m,
        effectivePrice,
        isFree: effectivePrice === 0,
        // "Included with your plan" only where the plan fully covers it.
        includedWithPlan: !!cart.deliveryIncluded && effectivePrice === 0,
        upgradeFromPlan: !!cart.deliveryIncluded && effectivePrice > 0,
      };
    });
  }

  private async getCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.withTotals(await this.refresh(cart));
  }

  /**
   * Prices are today's, not the day an item was added: a price changed in
   * admin applies to carts already holding the item, and products or plans
   * no longer sold drop out. `pricesUpdated` lets the cart say so.
   */
  private async refresh(cart: any) {
    let changed = false;
    for (const item of cart.items) {
      if (item.customBoxId) {
        // A built box: today's prices; products no longer allowed (or sold
        // out) drop out, and a box left too small leaves the basket.
        const { lines, quote: q } = await quoteSavedBox(this.prisma, item.customBoxId, !!item.customBox?.monthly, { strict: false });
        if (!q.ok) {
          await this.prisma.cartItem.deleteMany({ where: { id: item.id } }); // two requests at once may both try
          changed = true;
          continue;
        }
        if (q.items.length !== lines.length) {
          await this.prisma.customBoxItem.deleteMany({ where: { boxId: item.customBoxId, productId: { notIn: q.items.map((i) => i.productId) } } });
          changed = true;
        }
        if (Number(item.price) !== q.total) {
          await this.prisma.cartItem.update({ where: { id: item.id }, data: { price: q.total } });
          changed = true;
        }
        continue;
      }
      const p = item.product, plan = item.subscriptionPlan;
      const gone = p
        ? !!p.deletedAt || !['ACTIVE', 'OUT_OF_STOCK'].includes(p.status) || !p.standaloneSale
        : plan ? !!plan.deletedAt || !plan.isActive : true;
      if (gone) {
        await this.prisma.cartItem.deleteMany({ where: { id: item.id } }); // two requests at once may both try
        changed = true;
        continue;
      }
      const now = Number(p ? (p.salePrice ?? p.price) : plan.price);
      if (Number(item.price) !== now) {
        await this.prisma.cartItem.update({ where: { id: item.id }, data: { price: now } });
        changed = true;
      }
    }
    if (!changed) return cart;
    const fresh = await this.prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
    return { ...fresh, pricesUpdated: true };
  }

  private withTotals(cart: any) {
    const subtotal = cart.items.reduce((sum: number, item: any) => sum + Number(item.price) * item.quantity, 0);
    let discountAmount = 0;

    if (cart.coupon) {
      const c = cart.coupon;
      if (c.discountType === 'PERCENTAGE') {
        discountAmount = subtotal * (Number(c.discountValue) / 100);
      } else {
        discountAmount = Math.min(Number(c.discountValue), subtotal);
      }
    }

    const total = Math.max(0, subtotal - discountAmount);
    // A monthly box is a subscription with delivery included, like a plan.
    const hasSubscription = cart.items.some((i: any) => i.subscriptionPlanId || i.customBox?.monthly);
    const deliveryIncluded = cart.items.some((i: any) => i.subscriptionPlan?.deliveryIncluded || i.customBox?.monthly);

    return { ...cart, subtotal: +subtotal.toFixed(2), discountAmount: +discountAmount.toFixed(2), total: +total.toFixed(2), hasSubscription, deliveryIncluded, itemCount: cart.items.reduce((s: number, i: any) => s + i.quantity, 0) };
  }
}
