import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const cartInclude = {
  items: {
    include: {
      product: { include: { images: { where: { isPrimary: true }, take: 1 }, inventory: true } },
      subscriptionPlan: true,
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
      cart = await this.prisma.cart.create({ data: { userId, sessionId }, include: cartInclude });
    }
    return this.withTotals(cart);
  }

  async addItem(cartId: string, data: { productId?: string; subscriptionPlanId?: string; quantity?: number }) {
    const { productId, subscriptionPlanId, quantity = 1 } = data;

    if (!productId && !subscriptionPlanId) throw new BadRequestException('Provide productId or subscriptionPlanId');

    let price = 0;

    if (productId) {
      const product = await this.prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE', deletedAt: null }, include: { inventory: true } });
      if (!product) throw new NotFoundException('Product not found or unavailable');
      if (product.inventory && product.inventory.quantity < quantity) throw new BadRequestException('Insufficient stock');
      price = Number(product.salePrice ?? product.price);

      const existing = await this.prisma.cartItem.findFirst({ where: { cartId, productId } });
      if (existing) {
        await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
      } else {
        await this.prisma.cartItem.create({ data: { cartId, productId, price, quantity } });
      }
    }

    if (subscriptionPlanId) {
      const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id: subscriptionPlanId, isActive: true, deletedAt: null } });
      if (!plan) throw new NotFoundException('Subscription plan not found');
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

  async updateItem(cartId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException('Cart item not found');
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

  async getDeliveryMethods(cartTotal: number) {
    const methods = await this.prisma.deliveryMethod.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    return methods.map(m => ({
      ...m,
      effectivePrice: m.freeThreshold && cartTotal >= Number(m.freeThreshold) ? 0 : Number(m.price),
      isFree: !!(m.freeThreshold && cartTotal >= Number(m.freeThreshold)),
    }));
  }

  private async getCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude });
    if (!cart) throw new NotFoundException('Cart not found');
    return this.withTotals(cart);
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
    const hasSubscription = cart.items.some((i: any) => i.subscriptionPlanId);

    return { ...cart, subtotal: +subtotal.toFixed(2), discountAmount: +discountAmount.toFixed(2), total: +total.toFixed(2), hasSubscription, itemCount: cart.items.reduce((s: number, i: any) => s + i.quantity, 0) };
  }
}
