import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DogSize, Prisma, ProductStatus } from '@prisma/client';
import { parseConfig } from './personalisation';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  category: true,
  tags: { include: { tag: true } },
  inventory: true,
};

/** Trimmed, first letter capitalised (to match dogs' allergies), no duplicates. */
const cleanAllergens = (list?: string[]) =>
  [...new Set((list ?? []).map((a) => String(a).trim()).filter(Boolean).map((a) => a[0].toUpperCase() + a.slice(1)).map((a) => a.slice(0, 40)))].slice(0, 20);

const PUBLIC_STATUSES: ProductStatus[] = ['ACTIVE', 'OUT_OF_STOCK'];

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
    /** price_asc | price_desc | name_asc | name_desc; default is the catalogue order. */
    sort?: string;
    /** The visitor's language; 'ka' sorts by Georgian names. */
    lang?: string;
    /** A brand, or a tag name for products filed under a tag instead. */
    brand?: string;
    /** A dog size: products for it, plus those that suit every size. */
    size?: DogSize;
  }) {
    const { page = 1, limit = 20, categorySlug, search, status, adminView = false, includedInBox, sort, brand, lang, size } = params;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (!adminView) {
      // Sold-out products stay listed, marked out of stock, so links to them
      // keep working and they come back by themselves when restocked.
      where.status = { in: PUBLIC_STATUSES };
      where.standaloneSale = true;
    } else if (status) {
      where.status = status;
    }

    if (categorySlug) {
      const cat = await this.prisma.productCategory.findUnique({ where: { slug: categorySlug } });
      if (cat) where.categoryId = cat.id;
    }

    if (includedInBox !== undefined) where.includedInBox = includedInBox;

    const and: any[] = [];
    if (search) {
      and.push({ OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        // Georgian names live in translations.ka; Georgian has no letter case.
        { translations: { path: ['ka', 'name'], string_contains: search } },
        { translations: { path: ['ka', 'shortDescription'], string_contains: search } },
      ] });
    }
    if (brand) {
      and.push({ OR: [{ brand }, { tags: { some: { tag: { name: brand } } } }] });
    }
    if (size) and.push({ OR: [{ dogSizes: { has: size } }, { dogSizes: { isEmpty: true } }] });
    if (and.length) where.AND = and;

    // Sorting and filtering happen here, across the whole catalogue. The shop
    // used to sort one page of results in the browser, so page 2 restarted
    // the order and a brand filter could leave pages empty.
    if (sort === 'price_asc' || sort === 'price_desc') {
      // Customers pay the sale price when there is one, so that is what
      // "price" sorts by. Prisma can't order by COALESCE, so order the ids
      // here (a light query) and fetch only the page.
      const all = await this.prisma.product.findMany({ where, select: { id: true, price: true, salePrice: true } });
      const dir = sort === 'price_asc' ? 1 : -1;
      const ordered = all
        .map(p => ({ id: p.id, effective: Number(p.salePrice ?? p.price) }))
        .sort((a, b) => dir * (a.effective - b.effective));
      const pageIds = ordered.slice(skip, skip + limit).map(p => p.id);
      const rows = await this.prisma.product.findMany({ where: { id: { in: pageIds } }, include: productInclude });
      const items = pageIds.map(id => rows.find(r => r.id === id)!).filter(Boolean);
      return { items, total: all.length, page, limit, pages: Math.ceil(all.length / limit) };
    }

    if ((sort === 'name_asc' || sort === 'name_desc') && lang === 'ka') {
      // A–Z by the name the visitor reads. The Georgian name is inside JSON,
      // which Prisma can't order by, so order the ids here as for price.
      const all = await this.prisma.product.findMany({ where, select: { id: true, name: true, translations: true } });
      const dir = sort === 'name_asc' ? 1 : -1;
      const label = (p: { name: string; translations: any }) => String(p.translations?.ka?.name || '').trim() || p.name;
      const ordered = all.sort((a, b) => dir * label(a).localeCompare(label(b), 'ka'));
      const pageIds = ordered.slice(skip, skip + limit).map(p => p.id);
      const rows = await this.prisma.product.findMany({ where: { id: { in: pageIds } }, include: productInclude });
      const items = pageIds.map(id => rows.find(r => r.id === id)!).filter(Boolean);
      return { items, total: all.length, page, limit, pages: Math.ceil(all.length / limit) };
    }

    const orderBy: any[] =
      sort === 'name_asc' ? [{ name: 'asc' }] :
      sort === 'name_desc' ? [{ name: 'desc' }] :
      [{ sortOrder: 'asc' }, { createdAt: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, include: productInclude, orderBy, skip, take: limit }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Every brand (or tag, where products have no brand) in the live catalogue, for the shop's filter list. */
  async brands(): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE', standaloneSale: true },
      select: { brand: true, tags: { select: { tag: { select: { name: true, isActive: true } } } } },
    });
    const names = new Set<string>();
    for (const p of products) {
      if (p.brand) names.add(p.brand);
      else p.tags.forEach(t => { if (t.tag.isActive) names.add(t.tag.name); });
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  async findOne(slug: string, adminView = false) {
    const where: any = { slug, deletedAt: null };
    if (!adminView) where.status = { in: PUBLIC_STATUSES };

    const product = await this.prisma.product.findFirst({ where, include: productInclude });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already exists');

    const skuExists = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (skuExists) throw new ConflictException('SKU already exists');

    const { tagIds, stockQuantity, lowStockAlert, personalisation, ...productData } = dto;

    const qty = stockQuantity ?? 0;
    const product = await this.prisma.product.create({
      data: {
        ...productData,
        status: (productData.status ?? (qty === 0 ? 'OUT_OF_STOCK' : 'ACTIVE')) as any,
        price: productData.price,
        salePrice: productData.salePrice ?? null,
        personalisation: parseConfig(personalisation) ?? Prisma.DbNull,
        allergens: cleanAllergens(productData.allergens),
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

    const { tagIds, stockQuantity, lowStockAlert, personalisation, ...productData } = dto;

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
      data: {
        ...productData, price: productData.price, salePrice: productData.salePrice ?? undefined,
        ...(personalisation !== undefined ? { personalisation: parseConfig(personalisation) ?? Prisma.DbNull } : {}),
        ...(productData.allergens !== undefined ? { allergens: cleanAllergens(productData.allergens) } : {}),
      } as any,
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

  /** Removing the main photo hands "main" to the next one. */
  async removeImage(imageId: string) {
    const img = await this.prisma.productImage.delete({ where: { id: imageId } });
    if (img.isPrimary) {
      const next = await this.prisma.productImage.findFirst({ where: { productId: img.productId }, orderBy: { sortOrder: 'asc' } });
      if (next) await this.prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return img;
  }

  /** Makes one photo the main one (shown first in the shop and on the product page). */
  async setPrimaryImage(productId: string, imageId: string) {
    const img = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!img) throw new NotFoundException('Image not found');
    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
      this.prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    ]);
    return this.prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
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
