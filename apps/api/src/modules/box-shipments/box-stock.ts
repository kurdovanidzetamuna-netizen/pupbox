import { BoxShipmentStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Packing (or shipping straight from "to pack") takes the box's products out
 * of stock; going back to "to pack" or cancelling puts them back. Guarded by
 * stockTakenAt so each happens once per box.
 */
export async function moveBoxStock(prisma: PrismaService, shipmentId: string, status: BoxShipmentStatus) {
  const take = status === 'PACKED' || status === 'SHIPPED' || status === 'DELIVERED';
  const give = status === 'TO_PACK' || status === 'CANCELLED';
  if (!take && !give) return;
  const { count } = await prisma.boxShipment.updateMany({
    where: { id: shipmentId, stockTakenAt: take ? null : { not: null } },
    data: { stockTakenAt: take ? new Date() : null },
  });
  if (!count) return;
  const box = await prisma.boxShipment.findUnique({
    where: { id: shipmentId },
    select: {
      campaign: { select: { products: { select: { productId: true, quantity: true } } } },
      subscription: { select: { customBox: { select: { items: { where: { product: { deletedAt: null } }, select: { productId: true, quantity: true } } } } } },
    },
  });
  for (const p of box?.subscription.customBox?.items ?? box?.campaign?.products ?? []) {
    const n = take ? -p.quantity : p.quantity;
    await prisma.$executeRaw`UPDATE "Inventory" SET "quantity" = GREATEST(0, "quantity" + ${n}), "updatedAt" = now() WHERE "productId" = ${p.productId}`;
    const inv = await prisma.inventory.findUnique({ where: { productId: p.productId }, select: { quantity: true } });
    // Keep the shop's "out of stock" in line with the shelf.
    if (inv?.quantity === 0) await prisma.product.updateMany({ where: { id: p.productId, status: 'ACTIVE' }, data: { status: 'OUT_OF_STOCK' } });
    else if (inv && inv.quantity > 0) await prisma.product.updateMany({ where: { id: p.productId, status: 'OUT_OF_STOCK' }, data: { status: 'ACTIVE' } });
  }
}

/**
 * A plan stopped before its next box went out (cancelled or refunded):
 * boxes not yet sent are cancelled, and anything already packed into them
 * goes back on the shelf.
 */
export async function cancelOpenBoxes(prisma: PrismaService, subscriptionId: string) {
  const open = await prisma.boxShipment.findMany({ where: { subscriptionId, status: { in: ['TO_PACK', 'PACKED'] } }, select: { id: true } });
  for (const { id } of open) {
    const { count } = await prisma.boxShipment.updateMany({ where: { id, status: { in: ['TO_PACK', 'PACKED'] } }, data: { status: 'CANCELLED' } });
    if (count) await moveBoxStock(prisma, id, 'CANCELLED');
  }
}
