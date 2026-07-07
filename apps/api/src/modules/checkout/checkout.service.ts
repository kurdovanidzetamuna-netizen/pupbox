import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class CheckoutService {
  constructor(private prisma: PrismaService, private cartService: CartService) {}

  async prepare(userId: string, data: { deliveryMethodId: string; addressId?: string; dogId?: string; couponCode?: string }) {
    const cart = await this.cartService.getOrCreate(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const deliveryMethod = await this.prisma.deliveryMethod.findFirst({ where: { id: data.deliveryMethodId, isActive: true } });
    if (!deliveryMethod) throw new BadRequestException('Invalid delivery method');

    const deliveryCost = deliveryMethod.freeThreshold && cart.subtotal >= Number(deliveryMethod.freeThreshold) ? 0 : Number(deliveryMethod.price);
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
  }) {
    const cart = await this.cartService.getOrCreate(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const deliveryMethod = await this.prisma.deliveryMethod.findFirst({ where: { id: data.deliveryMethodId, isActive: true } });
    if (!deliveryMethod) throw new BadRequestException('Invalid delivery method');

    const deliveryCost = deliveryMethod.freeThreshold && cart.subtotal >= Number(deliveryMethod.freeThreshold) ? 0 : Number(deliveryMethod.price);
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
        dogId: data.dogId || null,
        addressId: address.id,
        deliveryMethodId: data.deliveryMethodId,
        couponId: cart.couponId || null,
        type: orderType as any,
        status: 'PENDING',
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
          })),
        },
      },
      include: { items: true, address: true, deliveryMethod: true },
    });

    // Create pending subscription if subscription in cart
    if (hasSubscription) {
      for (const item of cart.items.filter((i: any) => i.subscriptionPlanId)) {
        await this.prisma.customerSubscription.create({
          data: { userId, planId: item.subscriptionPlanId, dogId: data.dogId || null, status: 'PENDING', boxesTotal: item.subscriptionPlan.boxCount },
        });
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
