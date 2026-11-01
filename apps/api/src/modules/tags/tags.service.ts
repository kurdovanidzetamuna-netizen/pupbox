import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type TagInput = { name: string; nameKa?: string; slug?: string; description?: string; isActive?: boolean };

/** "Grain free!" → "grain-free". Georgian letters are kept as they are. */
const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9ა-ჿ]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const ka = (t: unknown) => ((t as any)?.ka ?? {}) as { name?: string };

/**
 * Product tags: small labels on a product page ("Grain free", "Handmade")
 * that also feed the shop's filter list. Named in both languages in admin →
 * Tags; a tag switched off disappears from the site but stays on products.
 */
@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  /** For the site: tags that are on. */
  findAll() {
    return this.prisma.productTag.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  /** For admin: every tag, its Georgian name, and how many products carry it. */
  async adminList() {
    const rows = await this.prisma.productTag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } });
    return rows.map(({ _count, translations, ...t }) => ({ ...t, nameKa: ka(translations).name ?? '', products: _count.products }));
  }

  private async data(input: TagInput, id?: string) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('Give the tag a name.');
    const slug = slugify(input.slug || name);
    if (!slug) throw new BadRequestException('The tag needs a name with letters or numbers.');
    const taken = await this.prisma.productTag.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
    if (taken) throw new ConflictException('There is already a tag with this name.');
    return {
      name, slug, description: input.description?.trim() || null,
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      translations: { ka: { name: input.nameKa?.trim() || undefined } } as Prisma.InputJsonValue,
    };
  }

  async create(input: TagInput) {
    await this.prisma.productTag.create({ data: await this.data(input) });
    return this.adminList();
  }

  async update(id: string, input: TagInput) {
    const tag = await this.prisma.productTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.productTag.update({ where: { id }, data: await this.data({ ...input, nameKa: input.nameKa ?? ka(tag.translations).name }, id) });
    return this.adminList();
  }

  /** Deleting takes it off every product (and promo code) that had it. */
  async remove(id: string) {
    const tag = await this.prisma.productTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.productTag.delete({ where: { id } });
    return this.adminList();
  }
}
