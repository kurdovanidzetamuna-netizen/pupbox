import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  category: true,
  tags: { include: { tag: true } },
  inventory: true,
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    categorySlug?: string;
    search?: string;
    status?: string;
    adminView?: boolean;
    includedInBox?: boolean;
  }) {
    const { page = 1, limit = 20, categorySlug, search, status, adminView = false, includedInBox } = params;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (!adminView) {
      where.status = 'ACTIVE';
      where.standaloneSale = true;
    } else if (status) {
      where.status = status;
    }

    if (categorySlug) {
      const cat = await this.prisma.productCategory.findUnique({ where: { slug: categorySlug } });
      if (cat) where.categoryId = cat.id;
    }

    if (includedInBox !== undefined) where.includedInBox = includedInBox;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(slug: string, adminView = false) {
    const where: any = { slug, deletedAt: null };
    if (!adminView) where.status = 'ACTIVE';

    const product = await this.prisma.product.findFirst({ where, include: productInclude });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already exists');

    const skuExists = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (skuExists) throw new ConflictException('SKU already exists');

    const { tagIds, stockQuantity, lowStockAlert, ...productData } = dto;

    const qty = stockQuantity ?? 0;
    const product = await this.prisma.product.create({
      data: {
        ...productData,
        status: (productData.status ?? (qty === 0 ? 'OUT_OF_STOCK' : 'ACTIVE')) as any,
        price: productData.price,
        salePrice: productData.salePrice ?? null,
        tags: tagIds?.length ? { create: tagIds.map((id) => ({ tagId: id })) } : undefined,
        inventory: {
          create: {
            quantity: qty,
            lowStockAlert: lowStockAlert ?? 5,
          },
        },
      },
      include: productInclude,
    });

    return product;
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');

    const { tagIds, stockQuantity, lowStockAlert, ...productData } = dto;

    if (tagIds !== undefined) {
      await this.prisma.productTagRelation.deleteMany({ where: { productId: id } });
      if (tagIds.length) {
        await this.prisma.productTagRelation.createMany({
          data: tagIds.map((tagId) => ({ productId: id, tagId })),
        });
      }
    }

    if (stockQuantity !== undefined) {
      await this.prisma.inventory.update({
        where: { productId: id },
        data: { quantity: stockQuantity, lowStockAlert: lowStockAlert ?? 5 },
      });
      await this.syncStatusFromStock(id, stockQuantity);
    }

    return this.prisma.product.update({
      where: { id },
      data: { ...productData, price: productData.price, salePrice: productData.salePrice ?? undefined } as any,
      include: productInclude,
    });
  }

  async updateStatus(id: string, status: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { status: status as any } });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  async addImage(productId: string, url: string, altText?: string, isPrimary = false) {
    if (isPrimary) {
      await this.prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
    }
    const count = await this.prisma.productImage.count({ where: { productId } });
    return this.prisma.productImage.create({
      data: { productId, url, altText, isPrimary: isPrimary || count === 0, sortOrder: count },
    });
  }

  async removeImage(imageId: string) {
    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async syncStatusFromStock(productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.deletedAt) return;
    if (quantity === 0 && product.status === 'ACTIVE') {
      await this.prisma.product.update({ where: { id: productId }, data: { status: 'OUT_OF_STOCK' } });
    } else if (quantity > 0 && product.status === 'OUT_OF_STOCK') {
      await this.prisma.product.update({ where: { id: productId }, data: { status: 'ACTIVE' } });
    }
  }
}
