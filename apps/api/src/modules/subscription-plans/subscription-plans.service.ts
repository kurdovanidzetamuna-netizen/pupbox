import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionPlansService {
  constructor(private prisma: PrismaService) {}

  findAll(adminView = false) {
    return this.prisma.subscriptionPlan.findMany({
      where: { deletedAt: null, isCustomBox: false, ...(adminView ? {} : { isActive: true, listed: true }) },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
      include: { tier: { select: { id: true, name: true, slug: true, translations: true, emoji: true, sortOrder: true, isActive: true } } },
    });
  }

  async findOne(slug: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { slug, deletedAt: null, isCustomBox: false } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async findById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id, deletedAt: null } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(data: {
    name: string; slug: string; durationValue: number; durationUnit: any;
    boxCount: number; price: number; discountPercent?: number; monthlyEquivPrice?: number;
    deliveryIncluded?: boolean; autoRenewal?: boolean; description?: string;
    benefits?: string[]; badge?: string; isActive?: boolean; listed?: boolean; sortOrder?: number;
    seoTitle?: string; seoDesc?: string; tierId?: string | null;
  }) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Slug already exists');
    await this.checkTier(data.tierId);
    return this.prisma.subscriptionPlan.create({ data });
  }

  async update(id: string, data: any) {
    await this.findById(id);
    await this.checkTier(data.tierId);
    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }

  private async checkTier(tierId?: string | null) {
    if (tierId && !(await this.prisma.boxTier.findUnique({ where: { id: tierId } }))) throw new NotFoundException('Box type not found');
  }

  /**
   * Shows or hides a whole group on the site at once: the Mini / Standard /
   * Premium plans, or the plans without a box type. Plans that are off stay
   * as they are.
   */
  async setGroupListed(group: 'BOX_TYPES' | 'OTHER', listed: boolean) {
    const { count } = await this.prisma.subscriptionPlan.updateMany({
      where: { deletedAt: null, isCustomBox: false, tierId: group === 'BOX_TYPES' ? { not: null } : null },
      data: { listed },
    });
    return { updated: count };
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.subscriptionPlan.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
