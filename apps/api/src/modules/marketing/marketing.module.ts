import { Global, Module, Controller, Get, Put, Post, Body, Query, Req, Res, UseGuards, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AuditService } from '../audit/audit.service';
import { MarketingService } from './marketing.service';
import { marketingSettings, saveMarketing, publicMarketing, forAdmin } from './marketing-settings';

// Read when used: .env is loaded after this file.
const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge').replace(/\/$/, '');
const apiBase = () => (process.env.API_BASE_URL || 'https://api.pupbox.ge').replace(/\/$/, '');

/** Admin → SEO & tracking. Seeing it needs marketing.view; changing it, marketing.manage. */
@ApiTags('Admin — SEO & tracking')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'marketing.view', write: 'marketing.manage' })
@Controller('admin/marketing')
class AdminMarketingController {
  constructor(private prisma: PrismaService, private audit: AuditService, private marketing: MarketingService) {}

  private async page(req: any) {
    return { canCode: (req.user?.permissions ?? []).includes('marketing.code'), settings: forAdmin(await marketingSettings(this.prisma)), recent: this.marketing.recent, feeds: { ka: `${apiBase()}/api/v1/feeds/products.xml?lang=ka`, en: `${apiBase()}/api/v1/feeds/products.xml?lang=en` } };
  }

  @Get('settings')
  settings(@Req() req: any) { return this.page(req); }

  @Put('settings')
  async save(@Body() body: Record<string, any>, @Req() req: any) {
    const before = forAdmin(await marketingSettings(this.prisma));
    const { value, rejected } = await saveMarketing(this.prisma, body, (req.user?.permissions ?? []).includes('marketing.code'));
    await this.audit.log({ adminUserId: req.user?.id, action: 'UPDATE', module: 'settings', entityType: 'MarketingSettings', entityId: 'config-marketing', before, after: forAdmin(value) });
    return { ...(await this.page(req)), rejected };
  }

  /** Sends one test event to Meta with the saved pixel and token. */
  @Post('meta-test')
  async metaTest() { return { result: await this.marketing.test(), recent: this.marketing.recent }; }

  /**
   * Google texts for every product, category and blog post, with what's
   * missing or too long, so admin can fix the weak ones. (The pages' own
   * texts come from the page editor's content, put together in admin.)
   */
  @Get('seo')
  async seo() {
    const [products, categories, posts] = await Promise.all([
      this.prisma.product.findMany({ where: { deletedAt: null, standaloneSale: true, status: { in: ['ACTIVE', 'OUT_OF_STOCK'] } }, select: { id: true, name: true, slug: true, seoTitle: true, seoDesc: true, shortDescription: true, description: true, translations: true, images: { select: { url: true }, take: 1 } }, orderBy: { name: 'asc' } }),
      this.prisma.productCategory.findMany({ select: { id: true, name: true, slug: true, seoTitle: true, seoDesc: true, description: true, translations: true } as any, orderBy: { name: 'asc' } }),
      this.prisma.blogPost.findMany({ where: { deletedAt: null, status: 'PUBLISHED' as any }, select: { id: true, title: true, slug: true, seoTitle: true, seoDesc: true, excerpt: true, translations: true, ogImage: true, featuredImage: true }, orderBy: { publishedAt: 'desc' } }),
    ]);
    const ka = (t: any) => (t && typeof t === 'object' ? t.ka ?? {} : {});
    return {
      products: products.map((p) => ({
        id: p.id, slug: p.slug, name: p.name, path: `/shop/${p.slug}`, hasImage: p.images.length > 0,
        title: { en: p.seoTitle || '', ka: ka(p.translations).seoTitle || '' }, fallbackTitle: { en: p.name, ka: ka(p.translations).name || '' },
        description: { en: p.seoDesc || '', ka: ka(p.translations).seoDesc || '' }, fallbackDescription: { en: p.shortDescription || p.description || '', ka: ka(p.translations).shortDescription || ka(p.translations).description || '' },
      })),
      categories: (categories as any[]).map((c) => ({
        id: c.id, name: c.name, path: `/shop?category=${c.slug}`, hasImage: true,
        title: { en: c.seoTitle || '', ka: ka(c.translations).seoTitle || '' }, fallbackTitle: { en: c.name, ka: ka(c.translations).name || '' },
        description: { en: c.seoDesc || '', ka: ka(c.translations).seoDesc || '' }, fallbackDescription: { en: c.description || '', ka: ka(c.translations).description || '' },
      })),
      posts: posts.map((b) => ({
        id: b.id, name: b.title, path: `/blog/${b.slug}`, hasImage: !!(b.ogImage || b.featuredImage),
        title: { en: b.seoTitle || '', ka: ka(b.translations).seoTitle || '' }, fallbackTitle: { en: b.title, ka: ka(b.translations).title || '' },
        description: { en: b.seoDesc || '', ka: ka(b.translations).seoDesc || '' }, fallbackDescription: { en: b.excerpt || '', ka: ka(b.translations).excerpt || '' },
      })),
    };
  }
}

/** Public: the tracking IDs and checks every page needs. Never the Meta token. */
@ApiTags('Marketing')
@Controller('marketing')
class PublicMarketingController {
  constructor(private prisma: PrismaService) {}

  @Get('config')
  @Header('Cache-Control', 'public, max-age=60')
  async config() { return publicMarketing(await marketingSettings(this.prisma)); }
}

const esc = (s: unknown) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
const plain = (s: unknown) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
/** Pictures stored with the local API address still point at the live one in the feed. */
const absolute = (u: string) => (/^https?:\/\/localhost(:\d+)?/.test(u) ? u.replace(/^https?:\/\/localhost(:\d+)?/, apiBase()) : u.startsWith('/') ? `${apiBase()}${u}` : u);

/**
 * Product feed for Meta Commerce Manager (Facebook & Instagram shop, ads
 * that show the right product) and Google Merchant Center: one RSS file in
 * the format both read. Admin pastes its address once; they re-read it daily.
 */
@ApiTags('Marketing')
@Controller('feeds')
class FeedController {
  constructor(private prisma: PrismaService) {}

  @Get('products.xml')
  async products(@Query('lang') lang: string, @Res() res: Response) {
    const l = lang === 'en' ? 'en' : 'ka';
    const items = await this.prisma.product.findMany({
      where: { deletedAt: null, standaloneSale: true, status: { in: ['ACTIVE', 'OUT_OF_STOCK'] } },
      include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] }, inventory: { select: { quantity: true, reservedQty: true } }, category: { select: { name: true, translations: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    const pick = (en: unknown, t: any, key: string) => (l === 'ka' && t?.ka?.[key]?.trim?.()) || en || '';
    const rows = items.filter((p) => p.images.length).map((p) => {
      const t = p.translations as any;
      const inStock = p.status === 'ACTIVE' && (!p.inventory || p.inventory.quantity - p.inventory.reservedQty > 0);
      const price = Number(p.price), sale = p.salePrice != null ? Number(p.salePrice) : null;
      const desc = plain(pick(p.description, t, 'description')) || plain(pick(p.shortDescription, t, 'shortDescription')) || plain(pick(p.name, t, 'name'));
      return `<item>
<g:id>${esc(p.id)}</g:id>
<g:title>${esc(plain(pick(p.name, t, 'name')).slice(0, 150))}</g:title>
<g:description>${esc(desc.slice(0, 5000))}</g:description>
<g:link>${esc(`${site()}/${l}/shop/${p.slug}`)}</g:link>
<g:image_link>${esc(absolute(p.images[0].url))}</g:image_link>
${p.images.slice(1, 10).map((i) => `<g:additional_image_link>${esc(absolute(i.url))}</g:additional_image_link>`).join('\n')}
<g:availability>${inStock ? 'in stock' : 'out of stock'}</g:availability>
<g:condition>new</g:condition>
<g:price>${price.toFixed(2)} GEL</g:price>
${sale != null && sale < price ? `<g:sale_price>${sale.toFixed(2)} GEL</g:sale_price>` : ''}
<g:brand>${esc(p.brand || 'Pupbox')}</g:brand>
<g:mpn>${esc(p.sku)}</g:mpn>
${p.category ? `<g:product_type>${esc(pick(p.category.name, p.category.translations, 'name'))}</g:product_type>` : ''}
<g:google_product_category>5</g:google_product_category>
</item>`.replace(/\n{2,}/g, '\n');
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Pupbox</title>
<link>${site()}/${l}/shop</link>
<description>${l === 'ka' ? 'Pupbox — ძაღლის ნუგბარი, სათამაშოები და აქსესუარები' : 'Pupbox — dog treats, toys and accessories'}</description>
${rows.join('\n')}
</channel>
</rss>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.send(xml);
  }
}

@Global()
@Module({
  controllers: [AdminMarketingController, PublicMarketingController, FeedController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
