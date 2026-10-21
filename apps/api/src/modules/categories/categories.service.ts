import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.productCategory.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: { children: { where: { deletedAt: null, isActive: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(slug: string) {
    const cat = await this.prisma.productCategory.findFirst({
      where: { slug, deletedAt: null },
      include: { children: { where: { deletedAt: null } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    parentId?: string;
    seoTitle?: string;
    seoDesc?: string;
    sortOrder?: number;
  }) {
    const existing = await this.prisma.productCategory.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Slug already exists');
    await this.checkParent(data.parentId);
    return this.prisma.productCategory.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; slug: string; description: string; isActive: boolean; sortOrder: number; seoTitle: string; seoDesc: string; parentId: string | null }>) {
    await this.findById(id);
    if (data.parentId !== undefined) await this.checkParent(data.parentId, id);
    return this.prisma.productCategory.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    // Its subcategories stay, as main categories of their own.
    await this.prisma.productCategory.updateMany({ where: { parentId: id }, data: { parentId: null } });
    return this.prisma.productCategory.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  /**
   * Two levels only — Toys › Chew toys — so the shop and the filters stay
   * simple: a parent must be a main category, and a category that has its
   * own subcategories can't move under another one.
   */
  private async checkParent(parentId?: string | null, id?: string) {
    if (!parentId) return;
    if (parentId === id) throw new BadRequestException('A category can’t be inside itself.');
    const parent = await this.prisma.productCategory.findFirst({ where: { id: parentId, deletedAt: null } });
    if (!parent) throw new BadRequestException('Main category not found.');
    if (parent.parentId) throw new BadRequestException('Pick a main category — subcategories can’t have their own subcategories.');
    if (id && (await this.prisma.productCategory.count({ where: { parentId: id, deletedAt: null } }))) {
      throw new BadRequestException('This category has subcategories, so it has to stay a main category.');
    }
  }

  /** A category and its subcategories, for "everything in Toys". */
  async withChildren(id: string) {
    const kids = await this.prisma.productCategory.findMany({ where: { parentId: id, deletedAt: null }, select: { id: true } });
    return [id, ...kids.map((k) => k.id)];
  }

  private async findById(id: string) {
    const cat = await this.prisma.productCategory.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }
}
