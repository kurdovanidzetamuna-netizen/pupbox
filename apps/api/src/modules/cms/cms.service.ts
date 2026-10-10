import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cleanCmsContent } from '../../common/clean-html';

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
    data = this.clean(data);
    return this.prisma.cMSPage.upsert({
      where: { slug: data.slug },
      create: { ...data, status: (data.status as any) || 'PUBLISHED' },
      update: { ...data, status: (data.status as any) || undefined },
    });
  }

  /** HTML in a page (and its translations) is cleaned before it can reach visitors. */
  private clean<T extends { content?: any; translations?: any }>(data: T): T {
    const out: any = { ...data };
    if (out.content) out.content = cleanCmsContent(out.content);
    if (out.translations && typeof out.translations === 'object') {
      out.translations = Object.fromEntries(Object.entries(out.translations).map(([lang, t]: [string, any]) => [lang, t && typeof t === 'object' && t.content ? { ...t, content: cleanCmsContent(t.content) } : t]));
    }
    return out;
  }

  async updateBySlug(slug: string, data: any) {
    const page = await this.prisma.cMSPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    return this.prisma.cMSPage.update({ where: { slug }, data: this.clean(data) });
  }
}
