import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { ReferralOffer } from '../settings/settings';
import { lineScope } from '../coupons/coupon-discount';

/** Payment states where money was taken: a customer with one of these has ordered before. */
const COLLECTED = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;

/**
 * A friend's referral code (NINO-4K7P) used as a promo code: it comes in the
 * friend's link and is applied by itself, or is typed in the promo box. The
 * friend gets the discount set in admin on their FIRST order only, never on
 * their own code, and only once linked to one inviter. When that order sticks
 * the inviter gets their coupon (referrals.service → grantDueRewards).
 *
 * One code per order: a referral code and a coupon don't add up.
 */
export async function checkReferralCode(prisma: PrismaService, offer: ReferralOffer, code: string, userId?: string | null) {
  if (!offer.enabled) throw new BadRequestException('Friend codes aren’t active right now.');
  const inviter = await prisma.user.findFirst({ where: { referralCode: code.trim().toUpperCase(), deletedAt: null }, select: { id: true, firstName: true, referralCode: true } });
  if (!inviter) return null;
  if (userId) {
    if (inviter.id === userId) throw new BadRequestException('That’s your own code — share it with friends instead.');
    const ordered = await prisma.payment.count({ where: { userId, status: { in: [...COLLECTED] } } });
    if (ordered) throw new BadRequestException('Friend codes are for a first order only.');
    const linked = await prisma.referral.findFirst({ where: { invitedId: userId }, select: { inviterId: true } });
    if (linked && linked.inviterId !== inviter.id) throw new BadRequestException('You already joined with another friend’s code.');
  }
  return inviter;
}

type Line = { price: any; quantity: number; productId?: string | null; subscriptionPlanId?: string | null; customBoxId?: string | null };

/** The friend's discount on these lines. A plan given as a gift counts as GIFT, not BOX. */
export function referralDiscount(offer: ReferralOffer, lines: Line[], o: { gift?: boolean } = {}) {
  const value = (l: Line) => Number(l.price) * l.quantity;
  const subtotal = lines.reduce((n, l) => n + value(l), 0);
  const eligible = lines.filter((l) => offer.appliesTo.includes(lineScope(l, o.gift) as any)).reduce((n, l) => n + value(l), 0);
  if (!eligible || subtotal < offer.minOrder) return 0;
  const amount = offer.friendType === 'PERCENTAGE' ? eligible * (offer.friendValue / 100) : Math.min(offer.friendValue, eligible);
  return +amount.toFixed(2);
}

/** "10% off" / "₾10 off" — for messages. */
export const offerText = (o: ReferralOffer) => (o.friendType === 'PERCENTAGE' ? `${o.friendValue}% off` : `₾${o.friendValue} off`);
