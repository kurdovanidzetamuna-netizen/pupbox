import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { shopSettings } from '../settings/settings';
import { r2 as round } from '../../common/money';

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
 *
 * A plan can be paid for more than one term ahead (a renewal paid early, or
 * "Extend"). The boxes that won't ship are refunded from the newest payment
 * back, each at its own price per box and never more than is left of it.
 */
export async function planCancellation(prisma: PrismaService, subscriptionId: string, now = new Date()): Promise<{ plan: CancelPlan; orderId: string | null; paid: number; refunds: { orderId: string; amount: number }[] }> {
  const sub = await prisma.customerSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true, status: true, boxesTotal: true, boxesDelivered: true, startDate: true,
      plan: { select: { boxCount: true } },
      shipments: { where: { status: { not: 'CANCELLED' } }, select: { year: true, month: true, status: true } },
      // Every paid term — the first purchase and each renewal — newest first.
      orders: {
        where: { status: { in: ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, refundDueAmount: true,
          items: { where: { subscriptionPlanId: { not: null } }, select: { total: true } },
          payments: { where: { status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } }, select: { paidAt: true, refunds: { select: { amount: true } } }, take: 1 },
        },
      },
    },
  });
  if (!sub) throw new BadRequestException('Subscription not found');
  const terms = sub.orders.map((o) => {
    const paid = Number(o.items.reduce((s, i) => s + Number(i.total), 0));
    // Already given back or owed on this order: not refunded twice.
    const back = Number(o.refundDueAmount ?? 0) + (o.payments[0]?.refunds ?? []).reduce((s, r) => s + Number(r.amount), 0);
    return { id: o.id, paid, left: Math.max(0, paid - back), paidAt: o.payments[0]?.paidAt ?? null };
  });
  const latest = terms[0] ?? null;
  const paid = latest?.paid ?? 0;
  const firstPaidAt = terms.length ? terms[terms.length - 1].paidAt ?? sub.startDate ?? now : sub.startDate ?? now;
  const freeHours = await freeCancelHours(prisma);
  // Free only while every payment on it is within the hours.
  const freeUntil = new Date(firstPaidAt.getTime() + freeHours * 3600_000);

  const sent = Math.max(sub.boxesDelivered, sub.shipments.filter((s) => SENT.includes(s.status)).length);
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const thisMonth = sub.shipments.find((s) => s.year === y && s.month === m);
  // This month's box is still coming if it's listed and not sent, or not listed yet but due.
  const thisMonthBoxComing = thisMonth ? !SENT.includes(thisMonth.status) : sent < sub.boxesTotal && sub.status === 'ACTIVE';

  if (now <= freeUntil && sent === 0) {
    const refunds = terms.filter((t) => t.left > 0).map((t) => ({ orderId: t.id, amount: round(t.left) }));
    return { plan: { kind: 'free', refund: round(refunds.reduce((s, r) => s + r.amount, 0)), keptBoxes: 0, boxesTotal: sub.boxesTotal, thisMonthBoxComing: false, freeHours, freeUntil }, orderId: latest?.id ?? null, paid, refunds };
  }
  const keptBoxes = Math.min(sub.boxesTotal, sent + (thisMonthBoxComing ? 1 : 0));
  // The boxes that won't ship, taken off the newest terms first at that term's price per box.
  let stopped = sub.boxesTotal - keptBoxes;
  const perTerm = Math.max(1, sub.plan.boxCount);
  const refunds: { orderId: string; amount: number }[] = [];
  for (const t of terms) {
    if (stopped <= 0) break;
    const n = Math.min(stopped, perTerm);
    stopped -= n;
    const amount = round(Math.min(t.left, (t.paid / perTerm) * n));
    if (amount > 0) refunds.push({ orderId: t.id, amount });
  }
  return {
    plan: { kind: 'keep', refund: round(refunds.reduce((s, r) => s + r.amount, 0)), keptBoxes, boxesTotal: sub.boxesTotal, thisMonthBoxComing, freeHours, freeUntil: null },
    orderId: latest?.id ?? null,
    paid,
    refunds,
  };
}


/** Last moment of the current calendar month. */
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
