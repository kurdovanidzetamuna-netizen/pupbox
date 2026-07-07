import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.productTag.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async create(data: { name: string; slug: string; description?: string }) {
    const existing = await this.prisma.productTag.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Slug already exists');
    return this.prisma.productTag.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; slug: string; description: string; isActive: boolean }>) {
    const tag = await this.prisma.productTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    return this.prisma.productTag.update({ where: { id }, data });
  }
}
