import { Injectable, Logger, OnModuleDestroy, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { FlittService } from './flitt.service';
import { SmsNotify } from '../sms/sms-notify';
import { notify } from '../notifications/notify';
import { cancelUnpaidOrder } from '../orders/order-lifecycle';
import { smsSettings } from '../sms/sms-settings';

const HOUR = 3600_000;
/*
 * When each try happens, counted from the first one, and which tries text the
 * customer, are set in admin → Text messages (sms-settings.ts). Default:
 * +3 h, +7 h, next day, the day after, then weekly for three weeks — 8 tries
 * over ~3 weeks, the customer told on tries 1, 4, 6, 7 and 8 (not every
 * 3-hour retry — that would be spam). After the last, the plan ends.
 */
/** A decline no retry can fix: the card is gone or blocked. Retrying only gets the shop flagged. */
const HARD = /expired|lost|stolen|restricted|closed|invalid card|do not hono|blocked|fraud|pick ?up|not permitted|revoked/i;

/**
 * Automatic renewals on a saved card, with retries when the bank says no.
 *
 * A renewal order is created a few days before the term ends (renewal.ts).
 * If the customer has a saved card, it's charged on the renewal date. A
 * soft decline (no funds, limit) is tried again on the RETRY_AFTER ladder;
 * a hard one (expired, stolen, blocked card) stops at once and asks the
 * customer to pay the link with another card. While it's unpaid the plan is
 * PAYMENT_FAILED: no boxes go out for a term nobody paid for. Paid on a
 * later try → the plan continues as if nothing happened. Out of tries → the
 * renewal is cancelled and the plan ends.
 *
 * Every try is a Payment row (attempt, card, reason), so admin sees the
 * whole story on the order. One job, every 10 minutes; each order is claimed
 * before it's charged, so two runs never charge the same try twice.
 */
@Injectable()
export class AutoRenewService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoRenewService.name);
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService, private flitt: FlittService, private config: ConfigService, private sms: SmsNotify) {}

  onModuleInit() {
    const run = () => this.chargeDue().catch((e) => this.logger.error(`Auto-renew run failed: ${e.message}`));
    setTimeout(run, 20_000).unref();
    this.timer = setInterval(run, 10 * 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { clearInterval(this.timer); }

  async chargeDue(now = new Date()) {
    const due = await this.prisma.order.findMany({
      where: { type: 'RENEWAL', status: 'PENDING', nextChargeAt: { lte: now } },
      select: { id: true }, orderBy: { nextChargeAt: 'asc' }, take: 25,
    });
    let charged = 0;
    for (const o of due) if (await this.tryCharge(o.id, now).catch((e) => { this.logger.error(`Charge ${o.id}: ${e.message}`); return false; })) charged++;
    return { tried: due.length, charged };
  }

  /** Admin's "Charge now": one try straight away, outside the ladder. */
  async chargeNow(orderId: string) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, select: { type: true, status: true } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.type !== 'RENEWAL' || o.status !== 'PENDING') throw new BadRequestException('Only an unpaid renewal can be charged.');
    await this.prisma.order.update({ where: { id: orderId }, data: { nextChargeAt: new Date() } });
    await this.tryCharge(orderId, new Date(), true);
  }

  private async tryCharge(orderId: string, now: Date, manual = false) {
    // Claim it: only one run charges this try.
    const { count } = await this.prisma.order.updateMany({ where: { id: orderId, status: 'PENDING', nextChargeAt: { lte: now } }, data: { nextChargeAt: null } });
    if (!count) return false;
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { id: true, userId: true, total: true, chargeAttempts: true, subscriptionId: true, createdAt: true, orderNumber: true, internalNotes: true },
    });
    const card = await this.prisma.savedCard.findFirst({ where: { userId: order.userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
    if (!card) {
      await this.prisma.order.update({ where: { id: orderId }, data: { lastChargeError: 'No saved card — waiting for the customer to pay the link.' } });
      return false;
    }
    const attempt = order.chargeAttempts + 1;
    const mask = `${card.brand} •••• ${card.last4}`;
    const payment = await this.prisma.payment.create({
      data: { orderId, userId: order.userId, provider: this.flitt.configured ? 'FLITT' : 'DEV_SIMULATED', amount: order.total, currency: 'GEL', status: 'PENDING', attempt, method: 'Saved card (automatic)', cardBrand: card.brand, cardMask: mask },
    });

    let outcome: { ok: boolean; pending?: boolean; reason: string; paymentId?: string; raw?: any };
    try {
      if (this.flitt.configured) {
        const api = this.config.get('NEXT_PUBLIC_API_URL') || 'http://localhost:4000/api/v1';
        const r = await this.flitt.chargeSavedCard({ orderId, attempt, amount: Number(order.total), token: card.token, description: `Pupbox renewal #${(order.orderNumber || order.id).slice(-8).toUpperCase()}`, serverCallbackUrl: `${api}/payments/webhook/flitt` });
        outcome = { ok: r.status === 'approved', pending: r.status === 'processing' || r.status === 'created', reason: r.reason || r.status, paymentId: r.paymentId, raw: r.raw };
      } else {
        // Development stand-in, like test cards: a card ending 0002 has no
        // money, 0003 is blocked; any other card goes through.
        outcome = card.last4 === '0002' ? { ok: false, reason: 'Insufficient funds' } : card.last4 === '0003' ? { ok: false, reason: 'Card blocked / restricted' } : { ok: true, reason: 'approved', paymentId: `dev-renew-${Date.now()}` };
      }
    } catch (e: any) {
      outcome = { ok: false, reason: e.message || 'Bank did not answer' };
    }

    if (outcome.pending) {
      // The bank is still deciding; its callback will settle it. Check again in an hour.
      await this.prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentId: outcome.paymentId || null } });
      await this.prisma.order.update({ where: { id: orderId }, data: { chargeAttempts: attempt, nextChargeAt: new Date(now.getTime() + HOUR) } });
      return false;
    }

    if (outcome.ok) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { providerPaymentId: outcome.paymentId || `auto-${payment.id}` } });
      await this.prisma.order.update({ where: { id: orderId }, data: { chargeAttempts: attempt, lastChargeError: null } });
      // The same path a bank callback takes: order paid, plan extended, emails, texts.
      await this.applyPaid(orderId, outcome.paymentId || `auto-${payment.id}`, outcome.raw);
      if (attempt > 1) this.sms.renewalRecovered(orderId);
      this.logger.log(`Renewal ${orderId} paid on try ${attempt}${manual ? ' (by admin)' : ''}`);
      return true;
    }

    // Declined.
    const { retries } = await smsSettings(this.prisma);
    const RETRY_AFTER = retries.afterHours.map((h) => h * HOUR);
    const MAX_TRIES = RETRY_AFTER.length + 1;
    const TELL_CUSTOMER = new Set(retries.textOnTries);
    const hard = HARD.test(outcome.reason);
    const first = await this.prisma.payment.findFirst({ where: { orderId, attempt: 1 }, select: { createdAt: true } });
    const start = (first?.createdAt ?? now).getTime();
    const last = hard || attempt >= MAX_TRIES;
    const next = last ? null : new Date(Math.max(start + RETRY_AFTER[attempt - 1], now.getTime() + 30 * 60_000));
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failReason: outcome.reason.slice(0, 300) } });
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        chargeAttempts: attempt, nextChargeAt: next, lastChargeError: `${hard ? 'Card refused for good' : 'Declined'}: ${outcome.reason}`.slice(0, 300),
        internalNotes: [order.internalNotes, `${now.toISOString().slice(0, 16).replace('T', ' ')}: automatic charge try ${attempt} declined (${outcome.reason})${next ? ` — next try ${next.toISOString().slice(0, 16).replace('T', ' ')}` : hard ? ' — card refused for good, no more tries' : ' — out of tries'}`].filter(Boolean).join('\n'),
      },
    });
    if (order.subscriptionId) await this.prisma.customerSubscription.updateMany({ where: { id: order.subscriptionId, status: 'ACTIVE' }, data: { status: 'PAYMENT_FAILED' } });
    notify(this.prisma, order.userId, 'PAYMENT_FAILED', { orderId, total: Number(order.total), kind: 'RENEWAL' }, '/account/subscriptions');

    if (attempt >= MAX_TRIES) {
      // Out of tries: the renewal is cancelled and the plan ends.
      await cancelUnpaidOrder(this.prisma, orderId, `Renewal not paid after ${attempt} tries; the plan ended.`);
      if (order.subscriptionId) await this.prisma.customerSubscription.update({ where: { id: order.subscriptionId }, data: { status: 'EXPIRED', autoRenewal: false, nextRenewalAt: null, cancelReason: 'Renewal payment failed' } });
    }
    if (TELL_CUSTOMER.has(attempt) || hard) this.sms.renewalFailed(orderId, { attempt, next, hard, final: attempt >= MAX_TRIES, toCustomer: true, toTeam: attempt === 1 || last });
    else if (last) this.sms.renewalFailed(orderId, { attempt, next, hard, final: attempt >= MAX_TRIES, toCustomer: false, toTeam: true });
    this.logger.warn(`Renewal ${orderId} try ${attempt} declined: ${outcome.reason}${next ? `; next ${next.toISOString()}` : ''}`);
    return false;
  }

  /** Set by PaymentsService so a successful charge runs the normal "paid" path. */
  applyPaid: (orderId: string, paymentId: string, raw?: any) => Promise<unknown> = async () => undefined;
}
