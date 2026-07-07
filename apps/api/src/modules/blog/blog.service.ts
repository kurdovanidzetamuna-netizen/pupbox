import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const postInclude = {
  category: true,
  tags: { include: { tag: true } },
};

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async listPosts(opts: { page?: number; limit?: number; categorySlug?: string; tagSlug?: string; adminMode?: boolean }) {
    const { page = 1, limit = 10, categorySlug, tagSlug, adminMode = false } = opts;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (!adminMode) where.status = 'PUBLISHED';
    if (categorySlug) where.category = { slug: categorySlug };
    if (tagSlug) where.tags = { some: { tag: { slug: tagSlug } } };

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({ where, include: postInclude, orderBy: { publishedAt: 'desc' }, skip, take: limit }),
      this.prisma.blogPost.count({ where }),
    ]);
    return { posts, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getPost(slug: string, adminMode = false) {
    const where: any = { slug, deletedAt: null };
    if (!adminMode) where.status = 'PUBLISHED';
    const post = await this.prisma.blogPost.findFirst({ where, include: postInclude });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async createPost(data: any) {
    const { tagIds, ...rest } = data;
    return this.prisma.blogPost.create({
      data: {
        ...rest,
        status: rest.status || 'DRAFT',
        publishedAt: rest.status === 'PUBLISHED' ? new Date() : null,
        tags: tagIds?.length ? { create: tagIds.map((id: string) => ({ tagId: id })) } : undefined,
      },
      include: postInclude,
    });
  }

  async updatePost(id: string, data: any) {
    const { tagIds, ...rest } = data;
    if (rest.status === 'PUBLISHED') {
      const existing = await this.prisma.blogPost.findUnique({ where: { id } });
      if (existing && !existing.publishedAt) rest.publishedAt = new Date();
    }
    if (tagIds !== undefined) {
      await this.prisma.blogPostTag.deleteMany({ where: { postId: id } });
      if (tagIds.length) {
        await this.prisma.blogPostTag.createMany({ data: tagIds.map((tid: string) => ({ postId: id, tagId: tid })) });
      }
    }
    return this.prisma.blogPost.update({ where: { id }, data: rest, include: postInclude });
  }

  async deletePost(id: string) {
    return this.prisma.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async listCategories() {
    return this.prisma.blogCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async listTags() {
    return this.prisma.blogTag.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async allPublishedSlugs() {
    const posts = await this.prisma.blogPost.findMany({ where: { status: 'PUBLISHED', deletedAt: null }, select: { slug: true, updatedAt: true } });
    return posts;
  }
}
