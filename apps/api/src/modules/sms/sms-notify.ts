import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { smsSettings, quietUntil, type SmsSettings, type TeamTopic } from './sms-settings';
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
        const text = o.user.language === 'en'
          ? `PupBox: Thank you, ${o.user.firstName}! Order #${no(o)} is paid — ${count} item${count === 1 ? '' : 's'}, ${gel(o.total)}. We'll let you know when it ships.`
          : `PupBox: მადლობა, ${o.user.firstName}! შეკვეთა #${no(o)} გადახდილია — ${count} ნივთი, ${gel(o.total)}. გაგზავნისას შეგატყობინებთ.`;
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
        const text = u.language === 'en'
          ? `PupBox: Welcome, ${u.firstName}! Your account is ready. Tell us about your dog and pick a box: pupbox.ge`
          : `PupBox: მოგესალმებით, ${u.firstName}! ანგარიში შექმნილია. მოგვიყევით თქვენს ძაღლზე და აირჩიეთ კოლოფი: pupbox.ge`;
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
        const text = o.final
          ? (en ? `PupBox: We couldn't renew your plan — the card was declined ${o.attempt} times, so it has ended. Restart any time: pupbox.ge/account` : `PupBox: გეგმის განახლება ვერ მოხერხდა — ბარათმა ${o.attempt}-ჯერ უარი თქვა, ამიტომ გეგმა დასრულდა. თავიდან დაწყება ნებისმიერ დროს: pupbox.ge/account`)
          : o.hard
            ? (en ? `PupBox: Your card was declined for your plan renewal (${gel(ord.total)}). Please pay with another card: pupbox.ge/account/subscriptions` : `PupBox: გეგმის განახლებისას (${gel(ord.total)}) ბარათმა უარი თქვა. გთხოვთ, გადაიხადოთ სხვა ბარათით: pupbox.ge/account/subscriptions`)
            : (en ? `PupBox: Your plan renewal (${gel(ord.total)}) didn't go through. We'll try again ${when}, or pay now: pupbox.ge/account/subscriptions` : `PupBox: გეგმის განახლება (${gel(ord.total)}) ვერ გადაიხადა. ხელახლა ვცდით ${when}, ან გადაიხადეთ ახლა: pupbox.ge/account/subscriptions`);
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
      const text = ord.user.language === 'en' ? `PupBox: Payment received (${gel(ord.total)}) — your plan continues. Thank you!` : `PupBox: გადახდა მიღებულია (${gel(ord.total)}) — თქვენი გეგმა გრძელდება. მადლობა!`;
      await this.customer(await smsSettings(this.prisma), 'PAYMENT_RECOVERED', ord.user.phone, text, { userId: ord.user.id, orderId });
    } catch (e: any) { this.logger.error(`Renewal-recovered SMS for ${orderId}: ${e.message}`); }
  }

  /** Money given back: tell the customer how much and where it goes. */
  async refunded(orderId: string, amount: number, cardMask?: string | null) {
    try {
      const ord = await this.prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { id: true, email: true, phone: true, phoneVerified: true, language: true } } } });
      if (!ord || DEMO.test(ord.user.email) || !ord.user.phone || !ord.user.phoneVerified) return;
      const card = cardMask ? cardMask.replace(/^.*?(\d{4})$/, '••$1') : '';
      const text = ord.user.language === 'en'
        ? `PupBox: We've refunded ${gel(amount)} for order #${no(ord)}${card ? ` to your card ${card}` : ''}. It can take 3–5 working days to show.`
        : `PupBox: შეკვეთა #${no(ord)}-ზე დაგიბრუნეთ ${gel(amount)}${card ? ` ბარათზე ${card}` : ''}. ასახვას 3–5 სამუშაო დღე შეიძლება დასჭირდეს.`;
      await this.customer(await smsSettings(this.prisma), 'REFUND', ord.user.phone, text, { userId: ord.user.id, orderId });
    } catch (e: any) { this.logger.error(`Refund SMS for ${orderId}: ${e.message}`); }
  }

  /** Things added to a paid order: the customer pays the difference by link. */
  async extraCharge(extraOrderId: string, total: number, parentOrderNumber: string) {
    try {
      const ord = await this.prisma.order.findUnique({ where: { id: extraOrderId }, include: { user: { select: { id: true, email: true, phone: true, phoneVerified: true, language: true } } } });
      if (!ord || DEMO.test(ord.user.email) || !ord.user.phone || !ord.user.phoneVerified) return;
      const n = parentOrderNumber.slice(-8).toUpperCase();
      const text = ord.user.language === 'en'
        ? `PupBox: We added items to your order #${n} as you asked. Please pay the difference of ${gel(total)} here: pupbox.ge/account/orders`
        : `PupBox: თქვენი თხოვნით შეკვეთა #${n}-ს ნივთები დავამატეთ. გთხოვთ, გადაიხადოთ სხვაობა ${gel(total)} აქ: pupbox.ge/account/orders`;
      await this.customer(await smsSettings(this.prisma), 'EXTRA_CHARGE', ord.user.phone, text, { userId: ord.user.id, orderId: extraOrderId });
    } catch (e: any) { this.logger.error(`Extra-charge SMS for ${extraOrderId}: ${e.message}`); }
  }
}
