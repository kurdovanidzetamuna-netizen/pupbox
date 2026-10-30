import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { notify } from '../notifications/notify';
import { allowedNext, cancelUnpaidOrder, wasPaid } from './order-lifecycle';
import { OrdersService } from './orders.service';
import { OrderRefundsService } from './order-refunds.service';

/** Admin moves an order along: packing, shipping, delivery, cancelling. */
@Injectable()
export class OrderStatusService {
  private readonly logger = new Logger(OrderStatusService.name);

  constructor(private prisma: PrismaService, private email: EmailService, private orders: OrdersService, private refunds: OrderRefundsService) {}

  /**
   * Moves an order along fulfilment. Only steps in allowedNext are accepted.
   * Cancelling puts stock back (held stock if unpaid, sold stock if paid and
   * not shipped) and, for a paid order, leaves it "refund due" until the
   * refund is recorded with REFUNDED.
   */
  async adminUpdateStatus(id: string, status: string, opts: { refundAmount?: number; reason?: string } = {}) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
        items: { where: { productId: { not: null } }, select: { productId: true, quantity: true } },
        user: { select: { email: true, firstName: true, language: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const paid = wasPaid(order.payments);
    const to = status as OrderStatus;
    if (!allowedNext(order.status, paid).includes(to)) {
      throw new BadRequestException(`An order that is ${order.status.toLowerCase()} can't be marked ${String(status).toLowerCase()}.`);
    }
    const note = opts.reason?.trim();

    if (to === 'CANCELLED' && !paid) {
      await cancelUnpaidOrder(this.prisma, id, note ? `Cancelled by admin: ${note}` : 'Cancelled by admin.');
      return this.orders.adminGetOne(id);
    }

    if (to === 'CANCELLED') {
      // Paid, not shipped: what was sold goes back on the shelf.
      for (const i of order.items) {
        const inv = await this.prisma.inventory.update({ where: { productId: i.productId! }, data: { quantity: { increment: i.quantity } } });
        if (inv.quantity > 0) await this.prisma.product.updateMany({ where: { id: i.productId!, status: 'OUT_OF_STOCK' }, data: { status: 'ACTIVE' } });
      }
      if (order.subscriptionId) {
        await this.prisma.customerSubscription.update({ where: { id: order.subscriptionId }, data: { status: 'CANCELLED', cancelReason: note || 'Order cancelled by admin', nextRenewalAt: null } });
        await this.prisma.boxShipment.updateMany({ where: { subscriptionId: order.subscriptionId, status: { in: ['TO_PACK', 'PACKED'] } }, data: { status: 'CANCELLED' } });
      }
      await this.prisma.order.update({ where: { id }, data: { status: 'CANCELLED', internalNotes: [order.internalNotes, `Cancelled by admin after payment${note ? `: ${note}` : ''}. Refund due.`].filter(Boolean).join('\n') } });
      return this.orders.adminGetOne(id);
    }

    if (to === 'REFUNDED') {
      const payment = order.payments.find((p) => p.status === 'PAID');
      if (!payment) throw new BadRequestException('This order has no payment to refund.');
      await this.refunds.recordRefund(id, opts.refundAmount ?? Number(payment.amount), note);
      // Even a partial refund ends a cancelled or delivered order.
      await this.prisma.order.update({ where: { id }, data: { status: 'REFUNDED' } });
      return this.orders.adminGetOne(id);
    }

    const now = new Date();
    await this.prisma.order.update({
      where: { id },
      data: {
        status: to,
        ...(to === 'SHIPPED' && !order.shippedAt ? { shippedAt: now } : {}),
        ...(to === 'DELIVERED' ? { deliveredAt: now } : {}),
      },
    });
    // Tell the customer once, when the order first leaves.
    if (to === 'SHIPPED' && !order.shippedAt) {
      this.email.sendOrderShipped({ ...order.user, orderId: order.id, trackingNumber: order.trackingNumber })
        .catch((e) => this.logger.error(`Order shipped email failed for ${id}: ${e.message}`));
      notify(this.prisma, order.userId, 'ORDER_SHIPPED', { orderId: order.id, tracking: order.trackingNumber ?? null }, '/account/orders');
    }
    if (to === 'DELIVERED' && order.status !== 'DELIVERED') notify(this.prisma, order.userId, 'ORDER_DELIVERED', { orderId: order.id }, '/account/orders');
    return this.orders.adminGetOne(id);
  }
}
