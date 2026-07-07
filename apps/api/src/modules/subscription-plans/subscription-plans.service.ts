import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionPlansService {
  constructor(private prisma: PrismaService) {}

  findAll(adminView = false) {
    return this.prisma.subscriptionPlan.findMany({
      where: { deletedAt: null, ...(adminView ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async findOne(slug: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { slug, deletedAt: null } });
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
    benefits?: string[]; badge?: string; isActive?: boolean; sortOrder?: number;
    seoTitle?: string; seoDesc?: string;
  }) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Slug already exists');
    return this.prisma.subscriptionPlan.create({ data });
  }

  async update(id: string, data: any) {
    await this.findById(id);
    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.subscriptionPlan.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
