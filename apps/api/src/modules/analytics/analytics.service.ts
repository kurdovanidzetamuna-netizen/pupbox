import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      newUsersThisMonth,
      newUsersPrevMonth,
      totalOrders,
      ordersThisMonth,
      ordersPrevMonth,
      activeSubscriptions,
      totalRevenue,
      revenueThisMonth,
      revenuePrevMonth,
      ordersToday,
      pendingOrders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } } }),
      this.prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth }, status: { not: 'CANCELLED' } } }),
      this.prisma.customerSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' as any }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' as any, createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'PAID' as any, createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } }, _sum: { amount: true } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
    ]);

    function pctChange(current: number, previous: number) {
      if (previous === 0) return current > 0 ? 100 : 0;
      return +((((current - previous) / previous) * 100).toFixed(1));
    }

    return {
      users: { total: totalUsers, thisMonth: newUsersThisMonth, change: pctChange(newUsersThisMonth, newUsersPrevMonth) },
      orders: { total: totalOrders, thisMonth: ordersThisMonth, today: ordersToday, pending: pendingOrders, change: pctChange(ordersThisMonth, ordersPrevMonth) },
      subscriptions: { active: activeSubscriptions },
      revenue: {
        total: Number(totalRevenue._sum.amount ?? 0),
        thisMonth: Number(revenueThisMonth._sum.amount ?? 0),
        prevMonth: Number(revenuePrevMonth._sum.amount ?? 0),
        change: pctChange(Number(revenueThisMonth._sum.amount ?? 0), Number(revenuePrevMonth._sum.amount ?? 0)),
      },
    };
  }

  async getRevenueChart(months = 6) {
    const data: { month: string; revenue: number; orders: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [revenue, orders] = await Promise.all([
        this.prisma.payment.aggregate({ where: { status: 'PAID' as any, createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
        this.prisma.order.count({ where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } } }),
      ]);

      data.push({
        month: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Number(revenue._sum.amount ?? 0),
        orders,
      });
    }
    return data;
  }

  async getTopProducts(limit = 10) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      where: { productId: { not: null } },
      _sum: { quantity: true, total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    return items.map(item => ({
      productId: item.productId,
      name: item.name,
      totalRevenue: Number(item._sum.total ?? 0),
      totalQty: item._sum.quantity ?? 0,
      orderCount: item._count.id,
    }));
  }

  async getOrderStatusBreakdown() {
    const statuses = await this.prisma.order.groupBy({ by: ['status'], _count: { id: true } });
    return statuses.map(s => ({ status: s.status, count: s._count.id }));
  }
}
