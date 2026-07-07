import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  // Customer: get my referral code & stats
  async getMyReferrals(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (!user) throw new NotFoundException('User not found');

    const referrals = await this.prisma.referral.findMany({
      where: { inviterId: userId },
      include: { invited: { select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: referrals.length,
      registered: referrals.filter(r => r.status !== 'INVITED').length,
      rewarded: referrals.filter(r => r.status === 'REWARD_GRANTED').length,
    };

    return { referralCode: user.referralCode, stats, referrals };
  }

  // Called at registration when user provides a referral code
  async applyReferralCode(newUserId: string, code: string) {
    const inviter = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (!inviter) throw new BadRequestException('Invalid referral code');
    if (inviter.id === newUserId) throw new BadRequestException('Cannot refer yourself');

    const existing = await this.prisma.referral.findFirst({ where: { invitedId: newUserId } });
    if (existing) return existing; // already applied

    return this.prisma.referral.create({
      data: { inviterId: inviter.id, invitedId: newUserId, status: 'REGISTERED' },
    });
  }

  // Called after a referred user completes their first paid order
  async completeReferral(invitedUserId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { invitedId: invitedUserId, status: 'REGISTERED' },
    });
    if (!referral) return;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'FIRST_ORDER_COMPLETED' },
    });

    // Grant reward coupon to inviter
    const couponCode = `REF-${referral.inviterId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    await this.prisma.coupon.create({
      data: {
        code: couponCode,
        discountType: 'FIXED',
        discountValue: 10,
        usageLimit: 1,
        isActive: true,
      },
    });

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'REWARD_GRANTED', rewardType: 'fixed', rewardValue: 10, rewardedAt: new Date() },
    });

    return { couponCode };
  }

  // Admin: all referrals
  async adminList(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        include: {
          inviter: { select: { id: true, email: true, firstName: true, lastName: true } },
          invited: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.referral.count(),
    ]);
    return { referrals, total, page, limit };
  }
}
