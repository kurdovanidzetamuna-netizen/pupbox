import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { consentUpdate } from '../users/consent';

export type Channel = 'email' | 'sms';

/**
 * Who agreed to offers by email and by SMS — the audiences the CRM may
 * contact. The team can switch a channel OFF for a customer who asks (never
 * on: only the customer can opt in).
 */
@Injectable()
export class ConsentsService {
  constructor(private prisma: PrismaService) {}

  private where(q: { channel?: Channel; status?: 'on' | 'off'; search?: string }): Prisma.UserWhereInput {
    const field = q.channel === 'sms' ? 'marketingSms' : 'marketingEmail';
    return {
      deletedAt: null,
      ...(q.channel && q.status ? { [field]: q.status === 'on' } : {}),
      ...(!q.channel && q.status ? { marketingConsent: q.status === 'on' } : {}),
      ...(q.search ? {
        OR: [
          { email: { contains: q.search, mode: 'insensitive' } },
          { firstName: { contains: q.search, mode: 'insensitive' } },
          { lastName: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search } },
        ],
      } : {}),
    };
  }

  async summary() {
    const base = { deletedAt: null };
    const [customers, email, sms, both, none] = await Promise.all([
      this.prisma.user.count({ where: base }),
      this.prisma.user.count({ where: { ...base, marketingEmail: true } }),
      this.prisma.user.count({ where: { ...base, marketingSms: true } }),
      this.prisma.user.count({ where: { ...base, marketingEmail: true, marketingSms: true } }),
      this.prisma.user.count({ where: { ...base, marketingEmail: false, marketingSms: false } }),
    ]);
    // An SMS audience needs a confirmed phone; an email one a confirmed email.
    const [smsReachable, emailReachable] = await Promise.all([
      this.prisma.user.count({ where: { ...base, marketingSms: true, phoneVerified: true } }),
      this.prisma.user.count({ where: { ...base, marketingEmail: true, emailVerified: true } }),
    ]);
    return { customers, email, sms, both, none, emailReachable, smsReachable };
  }

  async list(q: { channel?: Channel; status?: 'on' | 'off'; search?: string }, page = 1, limit = 50) {
    page = Math.max(1, page); limit = Math.min(200, Math.max(1, limit));
    const where = this.where(q);
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true, language: true, createdAt: true,
          emailVerified: true, phoneVerified: true, marketingEmail: true, marketingSms: true, marketingEmailAt: true, marketingSmsAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  /** On a customer's request: switch a channel off. */
  async optOut(userId: string, channels: { email?: boolean; sms?: boolean }) {
    if (channels.email !== false && channels.sms !== false) throw new BadRequestException('Only switching off is possible here; customers switch offers on themselves.');
    const u = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { marketingEmail: true, marketingSms: true } });
    if (!u) throw new NotFoundException('Customer not found');
    const change = { ...(channels.email === false ? { email: false } : {}), ...(channels.sms === false ? { sms: false } : {}) };
    return this.prisma.user.update({ where: { id: userId }, data: consentUpdate(u, change), select: { id: true, marketingEmail: true, marketingSms: true } });
  }

  /** The audience for one channel, as CSV for a campaign tool: confirmed contacts only. */
  async exportCsv(channel: Channel) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, ...(channel === 'sms' ? { marketingSms: true, phoneVerified: true } : { marketingEmail: true, emailVerified: true }) },
      orderBy: { createdAt: 'asc' },
      select: { firstName: true, lastName: true, email: true, phone: true, language: true, marketingEmailAt: true, marketingSmsAt: true },
    });
    const cell = (v: unknown) => {
      let s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s) && !/^\+\d{6,15}$/.test(s)) s = `'${s}`;
      s = s.replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };
    const head = channel === 'sms' ? ['phone', 'first_name', 'last_name', 'language', 'consent_since'] : ['email', 'first_name', 'last_name', 'language', 'consent_since'];
    const rows = users.map((u) => (channel === 'sms'
      ? [u.phone, u.firstName, u.lastName, u.language, u.marketingSmsAt]
      : [u.email, u.firstName, u.lastName, u.language, u.marketingEmailAt]).map(cell).join(','));
    return '﻿' + [head.join(','), ...rows].join('\r\n');
  }
}
