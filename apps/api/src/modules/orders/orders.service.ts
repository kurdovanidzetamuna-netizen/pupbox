import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } },
          address: true,
          deliveryMethod: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return { orders, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, subscriptionPlan: true } },
        address: true,
        deliveryMethod: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async adminList(page = 1, limit = 20, status?: string, type?: string, search?: string, sortBy = 'createdAt', sortDir = 'desc', planId?: string, dateFrom?: string, dateTo?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (planId) where.items = { some: { subscriptionPlanId: planId } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); where.createdAt.lte = d; }
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          address: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
          items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, subscriptionPlan: true } },
          dog: true,
          subscription: { include: { plan: true } },
          deliveryMethod: true,
          coupon: true,
        },
        orderBy: { [['createdAt', 'total'].includes(sortBy) ? sortBy : 'createdAt']: sortDir === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { orders, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminGetOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { include: { dogs: { where: { deletedAt: null } }, addresses: { where: { deletedAt: null } } } },
        address: true,
        payments: { orderBy: { createdAt: 'desc' }, include: { refunds: true } },
        items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, subscriptionPlan: true } },
        dog: true,
        subscription: { include: { plan: true } },
        deliveryMethod: true,
        coupon: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async adminUpdateStatus(id: string, status: string) {
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }

  async adminUpdateTracking(id: string, trackingNumber: string, internalNotes?: string) {
    return this.prisma.order.update({ where: { id }, data: { trackingNumber, ...(internalNotes !== undefined ? { internalNotes } : {}) } });
  }
}
