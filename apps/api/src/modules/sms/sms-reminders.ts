import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService, type SmsKind } from './sms.service';
import { smsSettings, smsText, quietUntil, REMINDER_KINDS, type SmsSettings, type SMS_TEXTS } from './sms-settings';

const DEMO = /@pupbox\.(dev|test)$/i;
const HOUR = 3600_000, DAY = 24 * HOUR;
const no = (o: { orderNumber?: string | null; id: string }) => (o.orderNumber || o.id).slice(-8).toUpperCase();
const gel = (v: unknown) => `₾${Number(v ?? 0).toFixed(2).replace(/\.00$/, '')}`;
const day = (d: Date, lang: string | null) => d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'ka-GE', { timeZone: 'Asia/Tbilisi', day: 'numeric', month: 'long' });
/** Events this recent get their "shipped"/"delivered" text; older ones (e.g. before the switch was on) don't. */
const FRESH = DAY;

type Person = { id: string; email: string; firstName: string; phone: string | null; phoneVerified: boolean; language: string | null };
const PERSON = { id: true, email: true, firstName: true, phone: true, phoneVerified: true, language: true } as const;
type Kind = keyof SmsSettings['customer'];

/**
 * Text messages that go on a schedule, set in admin → Text messages:
 * renewal coming, plan ending, order not paid, basket left, shipped,
 * delivered, and "how did the dog like it". Runs every few minutes; each
 * message has a key (SmsLog.ref) so it goes once, and only the latest step
 * that's due goes (a step missed while the server was down isn't sent late).
 * Reminders keep to the daily limit and the gap between texts; anything
 * over waits rather than being dropped.
 */
@Injectable()
export class SmsReminders implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsReminders.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(private prisma: PrismaService, private sms: SmsService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => this.run().catch((e) => this.logger.error(`Reminder run failed: ${e.message}`)), 5 * 60_000);
  }
  onModuleDestroy() { clearInterval(this.timer); }

  async run(now = new Date()) {
    if (this.running) return 0;
    this.running = true;
    try {
      const cfg = await smsSettings(this.prisma);
      if (!cfg.enabled) return 0;
      let n = 0;
      for (const job of [this.renewals, this.endings, this.unpaid, this.baskets, this.deliveries, this.afterDelivery]) {
        try { n += await job.call(this, cfg, now); } catch (e: any) { this.logger.error(`${job.name}: ${e.message}`); }
      }
      if (n) this.logger.log(`Sent or queued ${n} scheduled text(s)`);
      return n;
    } finally { this.running = false; }
  }

  /** One text to a customer, once per ref; held for quiet hours and the limits. */
  private async send(cfg: SmsSettings, kind: Kind, words: keyof typeof SMS_TEXTS & string, u: Person, vars: Record<string, string | number>, ref: string, orderId?: string) {
    if (!cfg.customer[kind] || !u.phone || !u.phoneVerified || DEMO.test(u.email)) return 0;
    if (await this.prisma.smsLog.count({ where: { ref } })) return 0;
    const text = smsText(cfg, words, u.language, vars);
    const quiet = quietUntil(cfg.quiet);
    const limit = (REMINDER_KINDS as readonly string[]).includes(kind) ? await this.limitUntil(cfg, u.phone) : null;
    const at = [quiet, limit].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;
    try { await this.sms.send(u.phone, text, { kind: kind as SmsKind, userId: u.id, orderId, ref }, { sendAt: at }); }
    catch (e: any) { this.logger.warn(`${kind} SMS not sent: ${e?.reason || e?.message}`); }
    return 1;
  }

  /** When the next reminder to this number may go: after the gap, and with fewer than perDay in the 24 hours before it. */
  private async limitUntil(cfg: SmsSettings, phone: string): Promise<Date | null> {
    if (!cfg.limits.enabled) return null;
    const rows = await this.prisma.smsLog.findMany({
      where: { to: phone, kind: { in: [...REMINDER_KINDS] }, status: { in: ['SENT', 'QUEUED', 'SENDING'] }, createdAt: { gte: new Date(Date.now() - 3 * DAY) } },
      select: { createdAt: true, sendAt: true },
    });
    const times = rows.map((r) => (r.sendAt ?? r.createdAt).getTime()).sort((a, b) => a - b);
    let t = Date.now();
    for (let i = 0; i < 12; i++) {
      const last = times.filter((x) => x <= t).at(-1);
      if (last != null && t < last + cfg.limits.gapMinutes * 60_000) { t = last + cfg.limits.gapMinutes * 60_000; continue; }
      const inDay = times.filter((x) => x > t - DAY && x <= t);
      if (inDay.length >= cfg.limits.perDay) { t = inDay[0] + DAY + 60_000; continue; }
      // Also leave room before reminders already waiting later on.
      const next = times.find((x) => x > t);
      if (next != null && next - t < cfg.limits.gapMinutes * 60_000) { t = next + cfg.limits.gapMinutes * 60_000; continue; }
      break;
    }
    return t > Date.now() + 60_000 ? new Date(t) : null;
  }

  /** The step due now: of "N before" steps, the nearest one already reached. */
  private static stepBefore(steps: number[], left: number, unit: number) {
    const reached = steps.filter((d) => left <= d * unit);
    return reached.length ? Math.min(...reached) : null;
  }
  /** Of "N after" steps, the latest one already reached. */
  private static stepAfter(steps: number[], age: number, unit: number) {
    const reached = steps.filter((h) => age >= h * unit);
    return reached.length ? Math.max(...reached) : null;
  }

  /** A renewing plan's date is coming: what will happen (saved card) or a link to pay. */
  private async renewals(cfg: SmsSettings, now: Date) {
    if (!cfg.customer.RENEWAL_SOON || !cfg.schedule.renewalDays.length) return 0;
    const subs = await this.prisma.customerSubscription.findMany({
      where: { status: 'ACTIVE', autoRenewal: true, cancelledAt: null, isGift: false, nextRenewalAt: { gt: now, lte: new Date(now.getTime() + Math.max(...cfg.schedule.renewalDays) * DAY) } },
      select: { id: true, userId: true, nextRenewalAt: true, plan: { select: { name: true, price: true, translations: true } }, user: { select: PERSON } },
    });
    let n = 0;
    for (const s of subs) {
      const step = SmsReminders.stepBefore(cfg.schedule.renewalDays, s.nextRenewalAt!.getTime() - now.getTime(), DAY);
      if (step == null) continue;
      const paid = await this.prisma.order.count({ where: { subscriptionId: s.id, type: 'RENEWAL', renewalFor: s.nextRenewalAt!, status: { in: ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] } } });
      if (paid) continue;
      const open = await this.prisma.order.findFirst({ where: { subscriptionId: s.id, type: 'RENEWAL', renewalFor: s.nextRenewalAt!, status: 'PENDING' }, select: { total: true } });
      const card = (await this.prisma.savedCard.count({ where: { userId: s.userId } })) > 0;
      const plan = (s.user.language !== 'en' && (s.plan.translations as any)?.ka?.name?.trim()) || s.plan.name;
      n += await this.send(cfg, 'RENEWAL_SOON', card ? 'RENEWAL_SOON_CARD' : 'RENEWAL_SOON_PAY', s.user,
        { firstName: s.user.firstName, plan, date: day(s.nextRenewalAt!, s.user.language), amount: gel(open?.total ?? s.plan.price) },
        `renew:${s.id}:${s.nextRenewalAt!.toISOString().slice(0, 10)}:${step}`);
    }
    return n;
  }

  /** A plan that doesn't renew is ending: an invitation to carry on. */
  private async endings(cfg: SmsSettings, now: Date) {
    if (!cfg.customer.PLAN_ENDING || !cfg.schedule.endingDays.length) return 0;
    const subs = await this.prisma.customerSubscription.findMany({
      where: { status: 'ACTIVE', autoRenewal: false, cancelledAt: null, isGift: false, endDate: { gt: now, lte: new Date(now.getTime() + Math.max(...cfg.schedule.endingDays) * DAY) } },
      select: { id: true, userId: true, endDate: true, plan: { select: { name: true, translations: true } }, user: { select: PERSON } },
    });
    let n = 0;
    for (const s of subs) {
      const step = SmsReminders.stepBefore(cfg.schedule.endingDays, s.endDate!.getTime() - now.getTime(), DAY);
      if (step == null) continue;
      // Already carrying on: another plan, or this one extended.
      const more = await this.prisma.customerSubscription.count({ where: { userId: s.userId, id: { not: s.id }, status: 'ACTIVE', endDate: { gt: s.endDate! } } })
        + await this.prisma.order.count({ where: { subscriptionId: s.id, type: 'RENEWAL', status: { in: ['PENDING', 'PAID'] } } });
      if (more) continue;
      const plan = (s.user.language !== 'en' && (s.plan.translations as any)?.ka?.name?.trim()) || s.plan.name;
      n += await this.send(cfg, 'PLAN_ENDING', 'PLAN_ENDING', s.user, { firstName: s.user.firstName, plan, date: day(s.endDate!, s.user.language) },
        `ending:${s.id}:${s.endDate!.toISOString().slice(0, 10)}:${step}`);
    }
    return n;
  }

  /** An order placed but not paid (renewals and extra payments have their own messages). */
  private async unpaid(cfg: SmsSettings, now: Date) {
    const steps = cfg.schedule.unpaidHours;
    if (!cfg.customer.UNPAID_ORDER || !steps.length) return 0;
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING', type: { in: ['SUBSCRIPTION', 'PRODUCT', 'MIXED'] }, parentOrderId: null,
        createdAt: { lte: new Date(now.getTime() - Math.min(...steps) * HOUR), gte: new Date(now.getTime() - (Math.max(...steps) + 48) * HOUR) },
      },
      select: { id: true, orderNumber: true, total: true, createdAt: true, user: { select: PERSON } },
    });
    let n = 0;
    for (const o of orders) {
      const step = SmsReminders.stepAfter(steps, now.getTime() - o.createdAt.getTime(), HOUR);
      if (step == null) continue;
      n += await this.send(cfg, 'UNPAID_ORDER', 'UNPAID_ORDER', o.user, { firstName: o.user.firstName, orderId: no(o), total: gel(o.total) }, `unpaid:${o.id}:${step}`, o.id);
    }
    return n;
  }

  /** Things left in the basket — an offer, so only to customers who agreed to SMS offers. */
  private async baskets(cfg: SmsSettings, now: Date) {
    const steps = cfg.schedule.cartHours;
    if (!cfg.customer.CART_REMINDER || !steps.length) return 0;
    const carts = await this.prisma.cart.findMany({
      where: {
        userId: { not: null }, items: { some: {} }, user: { marketingSms: true, deletedAt: null },
        updatedAt: { lte: new Date(now.getTime() - Math.min(...steps) * HOUR), gte: new Date(now.getTime() - (Math.max(...steps) + 48) * HOUR) },
      },
      select: { id: true, userId: true, updatedAt: true, items: { select: { quantity: true } }, user: { select: PERSON } },
    });
    let n = 0;
    for (const c of carts) {
      const step = SmsReminders.stepAfter(steps, now.getTime() - c.updatedAt.getTime(), HOUR);
      if (step == null || !c.user) continue;
      // Ordered since: nothing to remind about.
      if (await this.prisma.order.count({ where: { userId: c.userId!, createdAt: { gte: new Date(c.updatedAt.getTime() - 60_000) } } })) continue;
      const count = c.items.reduce((k, i) => k + i.quantity, 0);
      const items = c.user.language === 'en' ? `${count} item${count === 1 ? '' : 's'}` : `${count} ნივთი`;
      n += await this.send(cfg, 'CART_REMINDER', 'CART_REMINDER', c.user, { firstName: c.user.firstName, items }, `cart:${c.id}:${c.updatedAt.getTime()}:${step}`);
    }
    return n;
  }

  /** Shop orders and monthly boxes that just shipped or arrived. */
  private async deliveries(cfg: SmsSettings, now: Date) {
    if (!cfg.customer.SHIPPED && !cfg.customer.DELIVERED) return 0;
    const since = new Date(now.getTime() - FRESH);
    let n = 0;
    const orders = await this.prisma.order.findMany({
      where: { isGift: false, OR: [{ shippedAt: { gte: since } }, { deliveredAt: { gte: since } }] },
      select: { id: true, orderNumber: true, shippedAt: true, deliveredAt: true, trackingNumber: true, status: true, user: { select: PERSON } },
    });
    for (const o of orders) {
      const en = o.user.language === 'en';
      const what = en ? `order #${no(o)}` : `შეკვეთა #${no(o)}`;
      if (o.deliveredAt && o.deliveredAt >= since && o.status === 'DELIVERED') n += await this.send(cfg, 'DELIVERED', 'DELIVERED', o.user, { what }, `delivered:o:${o.id}`, o.id);
      else if (o.shippedAt && o.shippedAt >= since && o.status === 'SHIPPED') n += await this.send(cfg, 'SHIPPED', 'SHIPPED', o.user, { what, tracking: o.trackingNumber ? (en ? ` Tracking: ${o.trackingNumber}` : ` თრექინგი: ${o.trackingNumber}`) : '' }, `shipped:o:${o.id}`, o.id);
    }
    const boxes = await this.prisma.boxShipment.findMany({
      where: { subscription: { isGift: false }, OR: [{ shippedAt: { gte: since } }, { deliveredAt: { gte: since } }] },
      select: { id: true, status: true, boxNumber: true, shippedAt: true, deliveredAt: true, trackingNumber: true, subscription: { select: { boxesTotal: true, dog: { select: { name: true } }, user: { select: PERSON } } } },
    });
    for (const b of boxes) {
      const u = b.subscription.user;
      if (!u) continue;
      const en = u.language === 'en', dog = b.subscription.dog?.name;
      const what = en ? `${dog ? `${dog}’s ` : ''}box (${b.boxNumber} of ${b.subscription.boxesTotal})` : `ყუთი${dog ? ` ${dog}-ისთვის` : ''} (${b.boxNumber}/${b.subscription.boxesTotal})`;
      if (b.deliveredAt && b.deliveredAt >= since && b.status === 'DELIVERED') n += await this.send(cfg, 'DELIVERED', 'DELIVERED', u, { what }, `delivered:b:${b.id}`);
      else if (b.shippedAt && b.shippedAt >= since && b.status === 'SHIPPED') n += await this.send(cfg, 'SHIPPED', 'SHIPPED', u, { what, tracking: b.trackingNumber ? (en ? ` Tracking: ${b.trackingNumber}` : ` თრექინგი: ${b.trackingNumber}`) : '' }, `shipped:b:${b.id}`);
    }
    return n;
  }

  /** Some time after a delivery: how did the dog like it? At most once a month per customer. */
  private async afterDelivery(cfg: SmsSettings, now: Date) {
    if (!cfg.customer.AFTER_DELIVERY) return 0;
    const h = cfg.schedule.afterDeliveryHours;
    const window = { lte: new Date(now.getTime() - h * HOUR), gte: new Date(now.getTime() - (h + 48) * HOUR) };
    const items: { ref: string; u: Person; dog?: string | null; orderId?: string }[] = [];
    const orders = await this.prisma.order.findMany({ where: { status: 'DELIVERED', isGift: false, deliveredAt: window }, select: { id: true, dog: { select: { name: true } }, user: { select: PERSON } } });
    for (const o of orders) items.push({ ref: `after:o:${o.id}`, u: o.user, dog: o.dog?.name, orderId: o.id });
    const boxes = await this.prisma.boxShipment.findMany({ where: { status: 'DELIVERED', subscription: { isGift: false }, deliveredAt: window }, select: { id: true, subscription: { select: { dog: { select: { name: true } }, user: { select: PERSON } } } } });
    for (const b of boxes) if (b.subscription.user) items.push({ ref: `after:b:${b.id}`, u: b.subscription.user, dog: b.subscription.dog?.name });
    let n = 0;
    for (const x of items) {
      if (await this.prisma.smsLog.count({ where: { userId: x.u.id, kind: 'AFTER_DELIVERY', createdAt: { gte: new Date(now.getTime() - 30 * DAY) } } })) continue;
      n += await this.send(cfg, 'AFTER_DELIVERY', 'AFTER_DELIVERY', x.u, { firstName: x.u.firstName, dog: x.dog || (x.u.language === 'en' ? 'your dog' : 'თქვენს ძაღლს') }, x.ref, x.orderId);
    }
    return n;
  }
}
