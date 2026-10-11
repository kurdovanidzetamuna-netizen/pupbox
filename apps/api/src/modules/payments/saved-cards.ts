import { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('SavedCards');

const BRANDS: [RegExp, string][] = [[/visa/i, 'VISA'], [/master/i, 'MASTERCARD'], [/amex|american/i, 'AMEX'], [/maestro/i, 'MAESTRO']];

/**
 * Keeps the card a customer chose to save, from the bank's payment answer
 * (Flitt sends `rectoken`, `masked_card` and `rectoken_lifetime` when the
 * payment asked for one). The first card saved becomes the default. Never
 * throws: a card that couldn't be saved must not undo a payment.
 */
export async function saveCardFromBank(prisma: PrismaService, userId: string | null | undefined, body: Record<string, any>) {
  const token = String(body.rectoken ?? '').trim();
  const masked = String(body.masked_card ?? '');
  if (!userId || !token || !/\d{4}$/.test(masked)) return;
  // "01.12.2028 00:00:00" — the token lasts as long as the card.
  const life = String(body.rectoken_lifetime ?? '').match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  const expMonth = life ? Number(life[2]) : 12;
  const expYear = life ? Number(life[3]) : new Date().getFullYear() + 3;
  const brand = BRANDS.find(([re]) => re.test(String(body.card_type ?? '')))?.[1] ?? 'CARD';
  try {
    const has = await prisma.savedCard.count({ where: { userId } });
    await prisma.savedCard.upsert({
      where: { token },
      create: { userId, token, brand, last4: masked.slice(-4), expMonth, expYear, isDefault: has === 0 },
      update: { expMonth, expYear },
    });
  } catch (e: any) {
    logger.error(`Saving card for ${userId} failed: ${e.message}`);
  }
}
