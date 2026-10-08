import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

type Line = { productId: string; quantity: number; name?: string };

/** One row per product, quantities added up (a cart can hold the same product on two personalised lines). */
function combine(lines: Line[]) {
  const by = new Map<string, Line>();
  for (const l of lines) {
    const row = by.get(l.productId);
    if (row) row.quantity += l.quantity;
    else by.set(l.productId, { ...l });
  }
  return [...by.values()];
}

/**
 * Holds stock for an order until it is paid or expires. Each product is
 * reserved in one statement that only succeeds while enough is free
 * (quantity − already reserved), so two shoppers can't both take the last
 * one. All or nothing: if any product is short, what was held is released.
 */
export async function reserveStock(prisma: PrismaService, lines: Line[]) {
  const held: Line[] = [];
  for (const l of combine(lines)) {
    const n = await prisma.$executeRaw`
      UPDATE "Inventory" SET "reservedQty" = "reservedQty" + ${l.quantity}, "updatedAt" = now()
      WHERE "productId" = ${l.productId} AND "quantity" - "reservedQty" >= ${l.quantity}`;
    if (n === 0) {
      await releaseStock(prisma, held);
      throw new BadRequestException(`${l.name ? `"${l.name}"` : 'An item in your cart'} just sold out or has fewer left than you chose. Please update your cart.`);
    }
    held.push(l);
  }
}

/** Gives held stock back (order expired or payment failed). Never goes below zero. */
export async function releaseStock(prisma: PrismaService, lines: Line[]) {
  for (const l of combine(lines)) {
    await prisma.$executeRaw`
      UPDATE "Inventory" SET "reservedQty" = GREATEST(0, "reservedQty" - ${l.quantity}), "updatedAt" = now()
      WHERE "productId" = ${l.productId}`;
  }
}
