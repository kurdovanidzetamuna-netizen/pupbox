import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { smsText, smsSettings, quietUntil, type SmsSettings, type TeamTopic } from './sms-settings';
import { SmsService, type SmsKind } from './sms.service';

const DEMO = /@pupbox\.dev$/i;
const no = (o: { orderNumber?: string | null; id: string }) => (o.orderNumber || o.id).slice(-8).toUpperCase();
const gel = (v: unknown) => `₾${Number(v ?? 0).toFixed(2).replace(/\.00$/, '')}`;

/**
 * The text messages that tell people something happened: paid orders, new
 * accounts, renewal payments, refunds, extra payments. Admin → Text messages
 * has a main switch, a switch per customer message, the team's numbers (each
 * choosing orders / sign-ups / payments) and quiet hours, when customer
 * messages wait for the morning. Customers only get one on a confirmed
 * phone number.
 * Never throws: a message that can't go out is logged and the order or
 * sign-up carries on.
 */
@Injectable()
export class SmsNotify {
  private readonly logger = new Logger(SmsNotify.name);
  constructor(private prisma: PrismaService, private sms: SmsService) {}

  private async to(phone: string, text: string, kind: SmsKind, ids: { userId?: string; orderId?: string }, sendAt?: Date | null) {
    try { await this.sms.send(phone, text, { kind, ...ids }, { sendAt }); }
    catch (e: any) { this.logger.warn(`${kind} SMS not sent: ${e?.reason || e?.message}`); }
  }
  /** To a customer, if messages are on and this one is switched on; held during quiet hours. */
  private async customer(cfg: SmsSettings, kind: keyof SmsSettings['customer'], phone: string, text: string, ids: { userId?: string; orderId?: string }) {
    if (!cfg.enabled || !cfg.customer[kind]) return;
    await this.to(phone, text, kind, ids, quietUntil(cfg.quiet));
  }
  /** To every active team number that wants this topic. */
  private async team(cfg: SmsSettings, topic: TeamTopic, text: string, kind: SmsKind, ids: { userId?: string; orderId?: string }) {
    if (!cfg.enabled) return;
    const at = cfg.quiet.team ? quietUntil(cfg.quiet) : null;
    for (const t of cfg.team) if (t.active && t.topics.includes(topic)) await this.to(t.phone, text, kind, ids, at);
  }

  /** A paid order: a thank-you with the essentials to the customer, a summary to the team. */
  async orderPaid(orderId: string) {
    try {
      const o = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, phoneVerified: true, language: true } }, items: { select: { name: true, quantity: true } }, address: { select: { city: true, phone: true } } },
      });
      if (!o || DEMO.test(o.user.email)) return;
      const cfg = await smsSettings(this.prisma);
      const count = o.items.reduce((n, i) => n + i.quantity, 0);
      const list = o.items.slice(0, 2).map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') + (o.items.length > 2 ? ` +${o.items.length - 2}` : '');
      if (o.user.phone && o.user.phoneVerified) {
        const items = o.user.language === 'en' ? `${count} item${count === 1 ? '' : 's'}` : `${count} ნივთი`;
        const text = smsText(cfg, 'ORDER_CUSTOMER', o.user.language, { firstName: o.user.firstName, orderId: no(o), items, total: gel(o.total) });
        await this.customer(cfg, 'ORDER_CUSTOMER', o.user.phone, text, { userId: o.user.id, orderId });
      }
      const text = `PupBox new order #${no(o)}: ${gel(o.total)} · ${o.user.firstName} ${o.user.lastName} ${o.address?.phone || o.user.phone || ''}${o.address?.city ? ` · ${o.address.city}` : ''} · ${list}`;
      await this.team(cfg, 'orders', text, 'ORDER_ADMIN', { userId: o.user.id, orderId });
    } catch (e: any) { this.logger.error(`Order SMS failed for ${orderId}: ${e.message}`); }
  }

  /** A new account: welcome to the customer (on a confirmed number), a heads-up to the team. */
  async newCustomer(userId: string) {
    try {
      const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, phoneVerified: true, language: true } });
      if (!u || DEMO.test(u.email)) return;
      const cfg = await smsSettings(this.prisma);
      if (u.phone && u.phoneVerified) {
        const text = smsText(cfg, 'WELCOME', u.language, { firstName: u.firstName });
        await this.customer(cfg, 'WELCOME', u.phone, text, { userId });
      }
      await this.team(cfg, 'signups', `PupBox new customer: ${u.firstName} ${u.lastName} · ${u.phone || 'no phone'}${u.phoneVerified ? ' ✓' : ''} · ${u.email}`, 'NEW_CUSTOMER_ADMIN', { userId });
    } catch (e: any) { this.logger.error(`Sign-up SMS failed for ${userId}: ${e.message}`); }
  }

  /** An automatic renewal charge was declined: the customer (with what happens next) and/or the team. */
  async renewalFailed(orderId: string, o: { attempt: number; next: Date | null; hard: boolean; final: boolean; toCustomer: boolean; toTeam: boolean }) {
    try {
      const ord = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, phoneVerified: true, language: true } } } });
      if (!ord || DEMO.test(ord.user.email)) return;
      const cfg = await smsSettings(this.prisma);
      const en = ord.user.language === 'en';
      const when = o.next ? o.next.toLocaleString(en ? 'en-GB' : 'ka-GE', { timeZone: 'Asia/Tbilisi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      if (o.toCustomer && ord.user.phone && ord.user.phoneVerified) {
        const text = smsText(cfg, o.final ? 'RENEWAL_ENDED' : o.hard ? 'RENEWAL_REFUSED' : 'RENEWAL_RETRY', ord.user.language, { amount: gel(ord.total), nextTry: when, tries: o.attempt });
        await this.customer(cfg, 'PAYMENT_FAILED', ord.user.phone, text, { userId: ord.user.id, orderId });
      }
      if (o.toTeam) {
        const text = `PupBox renewal #${no(ord)} ${gel(ord.total)} — ${ord.user.firstName} ${ord.user.lastName}: ${o.final ? `failed ${o.attempt}×, plan ended` : o.hard ? 'card refused for good, waiting for the customer' : `declined (try ${o.attempt}), next ${when}`}`;
        await this.team(cfg, 'payments', text, 'PAYMENT_FAILED_ADMIN', { userId: ord.user.id, orderId });
      }
    } catch (e: any) { this.logger.error(`Renewal-failed SMS for ${orderId}: ${e.message}`); }
  }

  /** Paid on a later try: tell the customer it's sorted. */
  async renewalRecovered(orderId: string) {
    try {
      const ord = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { id: true, email: true, phone: true, phoneVerified: true, language: true } } } });
      if (!ord || DEMO.test(ord.user.email) || !ord.user.phone || !ord.user.phoneVerified) return;
      const cfg = await smsSettings(this.prisma);
      const text = smsText(cfg, 'PAYMENT_RECOVERED', ord.user.language, { amount: gel(ord.total) });
      await this.customer(cfg, 'PAYMENT_RECOVERED', ord.user.phone, text, { userId: ord.user.id, orderId });
    } catch (e: any) { this.logger.error(`Renewal-recovered SMS for ${orderId}: ${e.message}`); }
  }

  /** Money given back: tell the customer how much and where it goes. */
  async refunded(orderId: string, amount: number, cardMask?: string | null) {
    try {
      const ord = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { id: true, email: true, phone: true, phoneVerified: true, language: true } } } });
      if (!ord || DEMO.test(ord.user.email) || !ord.user.phone || !ord.user.phoneVerified) return;
      const card = cardMask ? cardMask.replace(/^.*?(\d{4})$/, '••$1') : '';
      const cfg = await smsSettings(this.prisma);
      const en = ord.user.language === 'en';
      const text = smsText(cfg, 'REFUND', ord.user.language, { amount: gel(amount), orderId: no(ord), card: card ? (en ? ` to your card ${card}` : ` ბარათზე ${card}`) : '' });
      await this.customer(cfg, 'REFUND', ord.user.phone, text, { userId: ord.user.id, orderId });
    } catch (e: any) { this.logger.error(`Refund SMS for ${orderId}: ${e.message}`); }
  }

  /** Things added to a paid order: the customer pays the difference by link. */
  async extraCharge(extraOrderId: string, total: number, parentOrderNumber: string) {
    try {
      const ord = await this.prisma.order.findUnique({ where: { id: extraOrderId }, include: { user: { select: { id: true, email: true, phone: true, phoneVerified: true, language: true } } } });
      if (!ord || DEMO.test(ord.user.email) || !ord.user.phone || !ord.user.phoneVerified) return;
      const n = parentOrderNumber.slice(-8).toUpperCase();
      const cfg = await smsSettings(this.prisma);
      const text = smsText(cfg, 'EXTRA_CHARGE', ord.user.language, { orderId: n, amount: gel(total) });
      await this.customer(cfg, 'EXTRA_CHARGE', ord.user.phone, text, { userId: ord.user.id, orderId: extraOrderId });
    } catch (e: any) { this.logger.error(`Extra-charge SMS for ${extraOrderId}: ${e.message}`); }
  }
}
