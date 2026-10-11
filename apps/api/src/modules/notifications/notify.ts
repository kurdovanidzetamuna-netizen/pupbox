import { Logger } from '@nestjs/common';
import type { NotificationType, Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('Notifications');

/**
 * Puts a notification in the customer's bell. Never throws: a missing
 * notification must not break the payment, shipment or job that sent it.
 * The text is worded by the web app from `type` + `data`, in the customer's
 * language at the time they read it.
 */
export async function notify(
  prisma: PrismaService,
  userId: string | null | undefined,
  type: NotificationType,
  data: Prisma.InputJsonObject = {},
  link?: string,
) {
  if (!userId) return;
  try {
    await prisma.notification.create({ data: { userId, type, data, link: link ?? null } });
  } catch (e: any) {
    logger.error(`Notification ${type} for ${userId} failed: ${e.message}`);
  }
}

/** A plan's name in both languages, so the bell can show the right one. */
export const planNames = (plan: { name: string; translations?: unknown }) => ({
  en: plan.name,
  ka: ((plan.translations as any)?.ka?.name as string | undefined)?.trim() || plan.name,
});
