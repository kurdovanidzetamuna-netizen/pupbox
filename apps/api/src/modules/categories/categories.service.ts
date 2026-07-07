import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    return this.prisma.productCategory.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; slug: string; description: string; isActive: boolean; sortOrder: number; seoTitle: string; seoDesc: string }>) {
    await this.findById(id);
    return this.prisma.productCategory.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.productCategory.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  private async findById(id: string) {
    const cat = await this.prisma.productCategory.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }
}
