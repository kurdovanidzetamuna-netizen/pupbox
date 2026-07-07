import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.cMSPage.findMany({ orderBy: { slug: 'asc' } });
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.cMSPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async upsert(data: {
    key: string;
    title: string;
    slug: string;
    content?: any;
    status?: string;
    seoTitle?: string;
    seoDesc?: string;
    ogImage?: string;
  }) {
    return this.prisma.cMSPage.upsert({
      where: { slug: data.slug },
      create: { ...data, status: (data.status as any) || 'PUBLISHED' },
      update: { ...data, status: (data.status as any) || undefined },
    });
  }

  async updateBySlug(slug: string, data: any) {
    const page = await this.prisma.cMSPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    return this.prisma.cMSPage.update({ where: { slug }, data });
  }
}
