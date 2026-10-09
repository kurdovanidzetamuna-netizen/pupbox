import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { shopSettings } from '../settings/settings';

export async function freeCancelHours(prisma: PrismaService): Promise<number> {
  return (await shopSettings(prisma)).freeCancelHours;
}

export interface CancelPlan {
  /** "free": within the window, nothing kept, everything back. "keep": this month's box ships, later months are refunded. */
  kind: 'free' | 'keep';
  refund: number;
  /** Boxes the customer ends up with in total (already sent + this month's). */
  keptBoxes: number;
  boxesTotal: number;
  /** Is this month's box still to ship? */
  thisMonthBoxComing: boolean;
  freeHours: number;
  /** Until when cancelling is still free (only for "free"). */
  freeUntil: Date | null;
}

const SENT = ['SHIPPED', 'DELIVERED'];

/**
 * What cancelling now means, from the shop's rule:
 * - within `freeHours` of paying, with nothing shipped yet: free — full refund, no box;
 * - after that: the customer keeps the box for the month they cancel in, the
 *   remaining months stop, and they get back those months at the plan's own
 *   monthly price (what they paid ÷ boxes in the plan).
 */
export async function planCancellation(prisma: PrismaService, subscriptionId: string, now = new Date()): Promise<{ plan: CancelPlan; orderId: string | null; paid: number }> {
  const sub = await prisma.customerSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true, status: true, boxesTotal: true, boxesDelivered: true, startDate: true,
      plan: { select: { boxCount: true } },
      shipments: { where: { status: { not: 'CANCELLED' } }, select: { year: true, month: true, status: true } },
      // The latest paid order — the first purchase, or the renewal that started this term.
      orders: {
        where: { status: { in: ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, items: { where: { subscriptionPlanId: { not: null } }, select: { total: true } }, payments: { where: { status: 'PAID' }, select: { paidAt: true }, take: 1 } },
      },
    },
  });
  if (!sub) throw new BadRequestException('Subscription not found');
  const order = sub.orders[0] ?? null;
  const paid = Number(order?.items.reduce((s, i) => s + Number(i.total), 0) ?? 0);
  const paidAt = order?.payments[0]?.paidAt ?? sub.startDate ?? now;
  const freeHours = await freeCancelHours(prisma);
  const freeUntil = new Date(paidAt.getTime() + freeHours * 3600_000);

  const sent = Math.max(sub.boxesDelivered, sub.shipments.filter((s) => SENT.includes(s.status)).length);
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const thisMonth = sub.shipments.find((s) => s.year === y && s.month === m);
  // This month's box is still coming if it's listed and not sent, or not listed yet but due.
  const thisMonthBoxComing = thisMonth ? !SENT.includes(thisMonth.status) : sent < sub.boxesTotal && sub.status === 'ACTIVE';

  if (now <= freeUntil && sent === 0) {
    return { plan: { kind: 'free', refund: round(paid), keptBoxes: 0, boxesTotal: sub.boxesTotal, thisMonthBoxComing: false, freeHours, freeUntil }, orderId: order?.id ?? null, paid };
  }
  const keptBoxes = Math.min(sub.boxesTotal, sent + (thisMonthBoxComing ? 1 : 0));
  // Price of one box in the term that was paid for (a renewal adds a term's boxes on top).
  const perBox = paid / Math.max(1, sub.plan.boxCount);
  return {
    plan: { kind: 'keep', refund: round(Math.min(paid, perBox * (sub.boxesTotal - keptBoxes))), keptBoxes, boxesTotal: sub.boxesTotal, thisMonthBoxComing, freeHours, freeUntil: null },
    orderId: order?.id ?? null,
    paid,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Last moment of the current calendar month. */
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
