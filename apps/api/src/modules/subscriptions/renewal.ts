import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { EmailService } from '../email/email.service';
import { shopSettings } from '../settings/settings';
import { subscriptionPeriod } from './subscription-period';
import { cancelUnpaidOrder } from '../orders/order-lifecycle';

const logger = new Logger('Renewals');
const DAY = 86400_000;

/**
 * Renewal by payment link. The customer chose to renew; a few days before
 * the term ends we create a RENEWAL order at the plan's current price and
 * email them a link to pay it. Paying extends the plan (see
 * extendAfterRenewal); not paying within the grace days ends it. When Flitt
 * card-on-file is set up, the same order can be charged automatically.
 */
export async function createDueRenewals(prisma: PrismaService, email: EmailService, now = new Date()) {
  const { renewalNoticeDays, renewalGraceDays } = await shopSettings(prisma);
  const due = await prisma.customerSubscription.findMany({
    where: {
      status: 'ACTIVE', autoRenewal: true, cancelledAt: null, isGift: false,
      // Due within the notice days — but not already past the time to pay
      // (those end instead; a reminder for a closed window would only confuse).
      nextRenewalAt: { not: null, lte: new Date(now.getTime() + renewalNoticeDays * DAY), gt: new Date(now.getTime() - renewalGraceDays * DAY) },
    },
    select: {
      id: true, userId: true, addressId: true, dogId: true, nextRenewalAt: true,
      plan: { select: { id: true, name: true, slug: true, price: true, isActive: true, deletedAt: true, translations: true } },
      user: { select: { email: true, firstName: true, language: true, deletedAt: true } },
    },
  });

  let created = 0;
  for (const s of due) {
    // One renewal order per term.
    const exists = await prisma.order.count({ where: { subscriptionId: s.id, type: 'RENEWAL', renewalFor: s.nextRenewalAt!, status: { notIn: ['CANCELLED', 'FAILED'] } } });
    if (exists || s.user.deletedAt) continue;
    if (!s.plan.isActive || s.plan.deletedAt) {
      // The plan is no longer sold: it can't renew; it simply ends at its date.
      await prisma.customerSubscription.update({ where: { id: s.id }, data: { autoRenewal: false, nextRenewalAt: null } });
      continue;
    }
    const price = Number(s.plan.price);
    const order = await prisma.order.create({
      data: {
        userId: s.userId, subscriptionId: s.id, addressId: s.addressId, dogId: s.dogId,
        type: 'RENEWAL', status: 'PENDING', renewalFor: s.nextRenewalAt,
        subtotal: price, deliveryCost: 0, discountAmount: 0, total: price,
        items: { create: [{ subscriptionPlanId: s.plan.id, name: s.plan.name, price, quantity: 1, total: price }] },
      },
      select: { id: true },
    });
    created++;
    const kaName = (s.plan.translations as any)?.ka?.name?.trim();
    email.sendRenewalDue({
      email: s.user.email, firstName: s.user.firstName, language: s.user.language,
      planName: (s.user.language !== 'en' && kaName) || s.plan.name, amount: price, renewsOn: s.nextRenewalAt!, orderId: order.id,
    }).catch((e) => logger.error(`Renewal email failed for ${s.id}: ${e.message}`));
  }
  if (created) logger.log(`Created ${created} renewal order(s)`);
  return created;
}

/**
 * The customer asks to add another term now ("Extend"), whether or not the
 * plan renews by itself. It's the same RENEWAL order the renewal job makes —
 * for the term after the current one — so paying it extends the plan the
 * same way, and the job won't make a second one for that term.
 */
export async function createExtension(prisma: PrismaService, subscriptionId: string, userId: string) {
  const s = await prisma.customerSubscription.findFirst({
    where: { id: subscriptionId, userId },
    select: {
      id: true, status: true, cancelledAt: true, addressId: true, dogId: true, endDate: true,
      plan: { select: { id: true, name: true, price: true, isActive: true, deletedAt: true } },
    },
  });
  if (!s) throw new NotFoundException('Subscription not found');
  if (s.status !== 'ACTIVE' || s.cancelledAt) throw new BadRequestException('Only a running plan can be extended. Choose a new plan instead.');
  if (!s.plan.isActive || s.plan.deletedAt) throw new BadRequestException('This plan is no longer sold, so it can’t be extended. Choose a new plan instead.');
  const open = await prisma.order.findFirst({ where: { subscriptionId: s.id, type: 'RENEWAL', status: 'PENDING' }, select: { id: true, total: true } });
  if (open) return { orderId: open.id, total: Number(open.total) };
  const price = Number(s.plan.price);
  const order = await prisma.order.create({
    data: {
      userId, subscriptionId: s.id, addressId: s.addressId, dogId: s.dogId,
      type: 'RENEWAL', status: 'PENDING', renewalFor: s.endDate ?? new Date(),
      subtotal: price, deliveryCost: 0, discountAmount: 0, total: price,
      items: { create: [{ subscriptionPlanId: s.plan.id, name: s.plan.name, price, quantity: 1, total: price }] },
    },
    select: { id: true },
  });
  return { orderId: order.id, total: price };
}

/** A renewal was paid: the plan continues for another term from where the last one ended. */
export async function extendAfterRenewal(prisma: PrismaService, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { type: true, renewalFor: true, subscriptionId: true },
  });
  if (order?.type !== 'RENEWAL' || !order.subscriptionId) return false;
  const sub = await prisma.customerSubscription.findUnique({
    where: { id: order.subscriptionId },
    select: { id: true, endDate: true, autoRenewal: true, plan: { select: { boxCount: true, durationValue: true, durationUnit: true } } },
  });
  if (!sub) return false;
  const from = order.renewalFor ?? sub.endDate ?? new Date();
  const period = subscriptionPeriod(from, sub.plan, sub.autoRenewal);
  await prisma.customerSubscription.update({
    where: { id: sub.id },
    data: {
      status: 'ACTIVE',
      boxesTotal: { increment: sub.plan.boxCount },
      endDate: period.endDate,
      nextRenewalAt: period.nextRenewalAt,
    },
  });
  logger.log(`Subscription ${sub.id} renewed until ${period.endDate.toISOString().slice(0, 10)}`);
  return true;
}

/**
 * Renewals not paid within the grace days after the term ended: the open
 * renewal order is cancelled and the plan ends, so it doesn't stay
 * "active" forever with no boxes left.
 */
export async function endUnpaidRenewals(prisma: PrismaService, now = new Date()) {
  const { renewalGraceDays } = await shopSettings(prisma);
  const overdue = await prisma.customerSubscription.findMany({
    where: { status: 'ACTIVE', autoRenewal: true, cancelledAt: null, nextRenewalAt: { lte: new Date(now.getTime() - renewalGraceDays * DAY) } },
    select: { id: true, nextRenewalAt: true },
  });
  for (const s of overdue) {
    const open = await prisma.order.findMany({ where: { subscriptionId: s.id, type: 'RENEWAL', status: 'PENDING' }, select: { id: true } });
    for (const o of open) await cancelUnpaidOrder(prisma, o.id, 'Renewal not paid in time; the plan ended.');
    await prisma.customerSubscription.update({ where: { id: s.id }, data: { status: 'EXPIRED', autoRenewal: false, nextRenewalAt: null } });
  }
  if (overdue.length) logger.log(`Ended ${overdue.length} plan(s) whose renewal wasn't paid`);
  return overdue.length;
}
