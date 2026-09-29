import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h] ?? '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      }).join(',')
    ),
  ];
  return lines.join('\n');
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async ordersReport(from?: string, to?: string): Promise<string> {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        address: { select: { city: true, addressLine1: true } },
        payments: { select: { status: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const rows = orders.map(o => ({
      order_id: o.id.slice(-8).toUpperCase(),
      date: o.createdAt.toISOString().slice(0, 10),
      customer_email: o.user?.email ?? '',
      customer_name: `${o.user?.firstName ?? ''} ${o.user?.lastName ?? ''}`.trim(),
      city: o.address?.city ?? '',
      type: o.type,
      status: o.status,
      payment_status: o.payments[0]?.status ?? 'NONE',
      subtotal: Number(o.subtotal).toFixed(2),
      discount: Number(o.discountAmount).toFixed(2),
      delivery: Number(o.deliveryCost).toFixed(2),
      total: Number(o.total).toFixed(2),
    }));

    return toCsv(rows);
  }

  async customersReport(): Promise<string> {
    const users = await this.prisma.user.findMany({
      include: {
        _count: { select: { orders: true } },
        subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const rows = users.map(u => ({
      user_id: u.id.slice(-8).toUpperCase(),
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      phone: u.phone ?? '',
      status: u.status,
      email_verified: u.emailVerified,
      orders: u._count.orders,
      has_active_subscription: u.subscriptions.length > 0,
      referral_code: u.referralCode,
      created_at: u.createdAt.toISOString().slice(0, 10),
    }));

    return toCsv(rows);
  }

  async subscriptionsReport(): Promise<string> {
    const subs = await this.prisma.customerSubscription.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        plan: { select: { name: true, price: true, durationUnit: true, durationValue: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const rows = subs.map(s => ({
      subscription_id: s.id.slice(-8).toUpperCase(),
      customer_email: s.user?.email ?? '',
      customer_name: `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim(),
      plan: s.plan?.name ?? '',
      billing_cycle: s.plan ? `${s.plan.durationValue} ${s.plan.durationUnit}` : '',
      price: Number(s.plan?.price ?? 0).toFixed(2),
      status: s.status,
      boxes_delivered: s.boxesDelivered,
      boxes_total: s.boxesTotal ?? '',
      start_date: s.startDate?.toISOString().slice(0, 10) ?? '',
      next_renewal: s.nextRenewalAt?.toISOString().slice(0, 10) ?? '',
      created_at: s.createdAt.toISOString().slice(0, 10),
    }));

    return toCsv(rows);
  }

  async revenueReport(from?: string, to?: string): Promise<string> {
    const where: any = { status: 'PAID' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: { order: { select: { type: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const rows = payments.map(p => ({
      payment_id: p.id.slice(-8).toUpperCase(),
      date: p.createdAt.toISOString().slice(0, 10),
      order_id: p.orderId.slice(-8).toUpperCase(),
      order_type: p.order?.type ?? '',
      provider: p.provider,
      amount: Number(p.amount).toFixed(2),
      currency: p.currency,
      status: p.status,
      paid_at: p.paidAt?.toISOString().slice(0, 16) ?? '',
    }));

    return toCsv(rows);
  }
}
