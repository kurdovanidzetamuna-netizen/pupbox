import { OrderStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { releaseStock } from '../products/stock';

/**
 * Where an order may go next from admin. Payment moves PENDING → PAID (the
 * bank says so, not admin); everything after that is fulfilment. Stepping
 * back one step is allowed to undo a mis-click. A paid order can be
 * cancelled until it ships; once out of the door it ends as DELIVERED or,
 * if refunded, REFUNDED.
 */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING', 'PACKED', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['PAID', 'PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  SHIPPED: ['PACKED', 'DELIVERED'],
  DELIVERED: ['SHIPPED', 'REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  FAILED: [],
};

/** Paid and not (fully) refunded yet. */
export const wasPaid = (payments: { status: string }[]) => payments.some((p) => p.status === 'PAID');

export function allowedNext(status: OrderStatus, paid: boolean): OrderStatus[] {
  // A cancelled order that had been paid still owes the customer their money.
  if (status === 'CANCELLED' && paid) return ['REFUNDED'];
  return NEXT[status] ?? [];
}

/**
 * Cancels an order that was never paid: its stock goes back on sale, the
 * coupon can be used again, its pending subscription is dropped. Guarded on
 * PENDING, so a payment landing at the same moment wins. Returns false if
 * the order wasn't pending any more.
 */
export async function cancelUnpaidOrder(prisma: PrismaService, orderId: string, note: string): Promise<boolean> {
  const { count } = await prisma.order.updateMany({ where: { id: orderId, status: 'PENDING' }, data: { status: 'CANCELLED', internalNotes: note } });
  if (!count) return false;
  const o = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { couponId: true, subscriptionId: true, items: { where: { productId: { not: null } }, select: { productId: true, quantity: true } } },
  });
  await releaseStock(prisma, o.items.map((i) => ({ productId: i.productId!, quantity: i.quantity })));
  await prisma.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'FAILED' } });
  if (o.subscriptionId) await prisma.customerSubscription.updateMany({ where: { id: o.subscriptionId, status: 'PENDING' }, data: { status: 'CANCELLED', cancelReason: 'Not paid' } });
  if (o.couponId) {
    const { count: used } = await prisma.couponUsage.deleteMany({ where: { orderId } });
    if (used) await prisma.coupon.update({ where: { id: o.couponId }, data: { usedCount: { decrement: used } } });
  }
  return true;
}
