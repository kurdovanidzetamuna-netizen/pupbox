import type { PrismaService } from '../prisma/prisma.service';
import type { EmailService } from '../email/email.service';

/** Orders in these states have been paid for; their gift card may go out. */
const PAID_STATES = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] as const;

/**
 * Sends one order's gift card and records it. Used at payment (when the card
 * isn't dated for later), by the hourly sender, and by admin's Resend.
 *
 * Unless `again`, the order is claimed first (giftSentAt set only if still
 * empty), so two callers at the same moment can't both send it. If sending
 * throws, the claim is undone so the next hourly run retries.
 */
export async function sendGiftCard(prisma: PrismaService, email: EmailService, orderId: string, { again = false } = {}): Promise<{ sent: boolean; to?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      isGift: true, status: true, giftRecipientName: true, giftRecipientEmail: true, giftMessage: true, giftSentAt: true, giftDeliverOn: true,
      user: { select: { firstName: true, lastName: true, language: true } },
      subscription: { select: { giftClaimToken: true, giftClaimedAt: true, plan: { select: { name: true, slug: true, translations: true } } } },
    },
  });
  const sub = order?.subscription;
  if (!order?.isGift || !order.giftRecipientEmail || !sub?.giftClaimToken || sub.giftClaimedAt) return { sent: false };
  if (!(PAID_STATES as readonly string[]).includes(order.status)) return { sent: false };
  // Dated for later: the hourly sender delivers it then (admin's Resend may send it early).
  if (!again && order.giftDeliverOn && order.giftDeliverOn > new Date()) return { sent: false };
  // No email service yet: leave it unsent (so admin sees the truth) and let
  // the hourly sender deliver it once email is set up.
  if (!email.isConfigured) return { sent: false };

  const previous = order.giftSentAt;
  if (!again) {
    const { count } = await prisma.order.updateMany({ where: { id: orderId, giftSentAt: null }, data: { giftSentAt: new Date() } });
    if (!count) return { sent: false };
  }

  const language = order.user?.language;
  const kaName = (sub.plan.translations as any)?.ka?.name?.trim();
  try {
    await email.sendGiftCard({
      recipientEmail: order.giftRecipientEmail,
      recipientName: order.giftRecipientName ?? '',
      buyerName: [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || (language === 'en' ? 'A friend' : 'მეგობარი'),
      planName: (language !== 'en' && kaName) || sub.plan.name?.trim() || sub.plan.slug,
      message: order.giftMessage ?? undefined,
      claimToken: sub.giftClaimToken,
      language,
    });
  } catch (e) {
    if (!again) await prisma.order.update({ where: { id: orderId }, data: { giftSentAt: previous } });
    throw e;
  }
  if (again) await prisma.order.update({ where: { id: orderId }, data: { giftSentAt: new Date() } });
  return { sent: true, to: order.giftRecipientEmail };
}

/** How long an unclaimed gift's recipient details are kept (privacy policy: 12 months). */
const KEEP_UNCLAIMED_MS = 365 * 86400_000;

/**
 * A gift never claimed within a year: forget who it was for (name, email,
 * message), retire the claim link and end the subscription. The order itself
 * stays for the accounts.
 */
export async function forgetStaleGifts(prisma: PrismaService) {
  const stale = await prisma.order.findMany({
    where: { isGift: true, createdAt: { lt: new Date(Date.now() - KEEP_UNCLAIMED_MS) }, giftRecipientEmail: { not: null }, subscription: { giftClaimedAt: null } },
    select: { id: true, subscriptionId: true },
  });
  for (const o of stale) {
    await prisma.order.update({ where: { id: o.id }, data: { giftRecipientName: null, giftRecipientEmail: null, giftMessage: null } });
    if (o.subscriptionId) await prisma.customerSubscription.updateMany({ where: { id: o.subscriptionId, giftClaimedAt: null }, data: { giftClaimToken: null, status: 'EXPIRED' } });
  }
  return stale.length;
}

/** Every paid gift whose send date has come and whose card hasn't gone out. */
export async function sendDueGiftCards(prisma: PrismaService, email: EmailService) {
  const due = await prisma.order.findMany({
    where: {
      isGift: true, giftSentAt: null, status: { in: [...PAID_STATES] },
      OR: [{ giftDeliverOn: null }, { giftDeliverOn: { lte: new Date() } }],
    },
    select: { id: true },
  });
  // One card failing (a bad address, a refusal) must not hold up the others;
  // it stays unsent and is retried next hour.
  let sent = 0;
  for (const o of due) {
    try {
      if ((await sendGiftCard(prisma, email, o.id)).sent) sent++;
    } catch (e: any) {
      console.error(`Gift card for order ${o.id} not sent, will retry: ${e?.message ?? e}`);
    }
  }
  return sent;
}
