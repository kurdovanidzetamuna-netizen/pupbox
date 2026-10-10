import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const campaignInclude = {
  products: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } },
};

@Injectable()
export class BoxCampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.boxCampaign.findMany({ include: campaignInclude, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  }

  async findActive() {
    return this.prisma.boxCampaign.findMany({ where: { isActive: true }, include: campaignInclude, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  }

  async findById(id: string) {
    const campaign = await this.prisma.boxCampaign.findUnique({ where: { id }, include: campaignInclude });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async findForMonth(year: number, month: number, dogSize?: string) {
    const where: any = { year, month, isActive: true };
    if (dogSize) where.dogSize = dogSize;
    else where.dogSize = null;
    return this.prisma.boxCampaign.findFirst({ where, include: campaignInclude });
  }

  async create(data: { name: string; description?: string; month: number; year: number; dogSize?: string }) {
    return this.prisma.boxCampaign.create({ data: { ...data, dogSize: data.dogSize as any }, include: campaignInclude });
  }

  async update(id: string, data: any) {
    await this.findById(id);
    const { products: _, ...rest } = data;
    return this.prisma.boxCampaign.update({ where: { id }, data: rest, include: campaignInclude });
  }

  async addProduct(campaignId: string, productId: string, quantity = 1) {
    return this.prisma.boxCampaignProduct.upsert({
      where: { id: `${campaignId}_${productId}` },
      create: { campaignId, productId, quantity },
      update: { quantity },
    }).catch(() =>
      // upsert with composite key doesn't work directly, use create
      this.prisma.boxCampaignProduct.create({ data: { campaignId, productId, quantity } })
    );
  }

  async removeProduct(campaignId: string, productId: string) {
    await this.prisma.boxCampaignProduct.deleteMany({ where: { campaignId, productId } });
  }

  async setProducts(campaignId: string, items: { productId: string; quantity: number }[]) {
    await this.prisma.boxCampaignProduct.deleteMany({ where: { campaignId } });
    if (items.length) {
      await this.prisma.boxCampaignProduct.createMany({
        data: items.map(i => ({ campaignId, productId: i.productId, quantity: i.quantity })),
      });
    }
    return this.findById(campaignId);
  }

  async delete(id: string) {
    await this.findById(id);
    // Boxes already listed with this campaign keep their record, without contents.
    await this.prisma.boxShipment.updateMany({ where: { campaignId: id }, data: { campaignId: null } });
    await this.prisma.boxCampaignProduct.deleteMany({ where: { campaignId: id } });
    return this.prisma.boxCampaign.delete({ where: { id } });
  }

  // Basic packing logic: return which products go into a subscriber's box
  async packingList(year: number, month: number) {
    const campaigns = await this.prisma.boxCampaign.findMany({
      where: { year, month, isActive: true },
      include: { products: { include: { product: true } } },
    });

    const subscriptions = await this.prisma.customerSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { dog: true, plan: true, user: { select: { email: true, firstName: true, lastName: true } } },
    });

    return subscriptions.map(sub => {
      const dogSize = sub.dog?.size || null;
      const campaign = campaigns.find(c => c.dogSize === dogSize) || campaigns.find(c => !c.dogSize) || null;
      return {
        subscriptionId: sub.id,
        customer: `${sub.user.firstName} ${sub.user.lastName}`,
        email: sub.user.email,
        plan: sub.plan.name,
        dogName: sub.dog?.name || null,
        dogSize,
        campaign: campaign?.name || 'No campaign',
        products: campaign?.products.map(p => ({ name: p.product.name, sku: p.product.sku, quantity: p.quantity })) || [],
      };
    });
  }
}
