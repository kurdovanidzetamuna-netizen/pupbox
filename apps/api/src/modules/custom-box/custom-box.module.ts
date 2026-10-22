import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { shopSettings } from '../settings/settings';
import { PUBLIC_SELLER } from '../sellers/sellers';
import { BOX_PRODUCT_WHERE } from './custom-box';

/** The build-your-own box page: its rules and the products it can hold. */
@ApiTags('Custom box')
@Controller('custom-box')
class CustomBoxController {
  constructor(private prisma: PrismaService) {}

  @Get('config')
  async config() {
    return (await shopSettings(this.prisma)).customBox;
  }

  /** Products admin allows in a custom box (ones that need a size or name are left out). */
  @Get('products')
  async products() {
    const rows = await this.prisma.product.findMany({
      where: BOX_PRODUCT_WHERE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        // With its main category: the box builder groups items by Treats, Toys… not every subcategory.
        category: { include: { parent: true } },
        inventory: { select: { quantity: true, reservedQty: true, lowStockAlert: true } },
        seller: { select: PUBLIC_SELLER },
      },
    });
    return rows.filter((p) => !p.personalisation);
  }
}

@Module({ controllers: [CustomBoxController] })
export class CustomBoxModule {}
