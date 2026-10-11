import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CSV that opens correctly in Excel: a UTF-8 marker so Georgian isn't garbled,
 * and text that starts like a formula (=, +, -, @) prefixed with ' so a
 * customer named "=HYPERLINK(...)" can't run anything when the file is opened.
 */
export function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '\uFEFF';
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s) && !/^\+\d{6,15}$/.test(s)) s = `'${s}`;
    s = s.replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  return '\uFEFF' + [headers.join(','), ...rows.map((row) => headers.map((h) => cell(row[h])).join(','))].join('\r\n');
}

/** "2026-10-01".."2026-10-31" → that whole span, the last day included. */
export function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const parse = (v: string, label: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v))) throw new BadRequestException(`"${label}" must be a date like 2026-10-01`);
    return new Date(`${v}T00:00:00+04:00`); // Tbilisi
  };
  const range: { gte?: Date; lt?: Date } = {};
  if (from) range.gte = parse(from, 'from');
  if (to) range.lt = new Date(parse(to, 'to').getTime() + 86400_000);
  if (range.gte && range.lt && range.gte >= range.lt) throw new BadRequestException('"from" must be before "to"');
  return range;
}

const refundedOf = (payments: { refunds: { amount: unknown }[] }[]) =>
  payments.reduce((s, p) => s + p.refunds.reduce((t, r) => t + Number(r.amount), 0), 0);

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async ordersReport(from?: string, to?: string): Promise<string> {
    const createdAt = dateRange(from, to);
    const where: any = createdAt ? { createdAt } : {};

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        address: { select: { city: true, addressLine1: true } },
        payments: { select: { status: true, refunds: { select: { amount: true } } }, orderBy: { createdAt: 'desc' } },
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
      refunded: refundedOf(o.payments).toFixed(2),
      refund_due: o.refundDueAmount != null ? Number(o.refundDueAmount).toFixed(2) : '',
    }));

    return toCsv(rows);
  }

  async customersReport(): Promise<string> {
    const users = await this.prisma.user.findMany({
      // Deleted accounts are anonymised and not customers any more.
      where: { deletedAt: null },
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
    // Every payment that took money, including ones later refunded in part or full.
    const createdAt = dateRange(from, to);
    const where: any = { status: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] }, ...(createdAt ? { createdAt } : {}) };

    const payments = await this.prisma.payment.findMany({
      where,
      include: { order: { select: { type: true, status: true } }, refunds: { select: { amount: true } } },
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
      refunded: refundedOf([p]).toFixed(2),
      kept: (Number(p.amount) - refundedOf([p])).toFixed(2),
      currency: p.currency,
      status: p.status,
      paid_at: p.paidAt?.toISOString().slice(0, 16) ?? '',
    }));

    return toCsv(rows);
  }
}
