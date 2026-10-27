import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Injectable, Logger, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { customerRows } from '../users/customer-list';

/** Who a message goes to. */
const GROUPS = ['all', 'onPlan', 'lapsed', 'never', 'buyers', 'tag', 'customers'] as const;

class AudienceDto {
  @IsIn(GROUPS as unknown as string[]) group!: (typeof GROUPS)[number];
  @IsOptional() @IsString() @MaxLength(30) tag?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) ids?: string[];
  /** Only customers who agreed to offers (email or SMS) — for anything promotional. */
  @IsOptional() @IsBoolean() consentOnly?: boolean;
}

class MessageDto {
  @IsString() @MinLength(1) @MaxLength(80) titleEn!: string;
  @IsString() @MinLength(1) @MaxLength(80) titleKa!: string;
  @IsString() @MinLength(1) @MaxLength(400) bodyEn!: string;
  @IsString() @MinLength(1) @MaxLength(400) bodyKa!: string;
  @IsOptional() @IsString() @MaxLength(30) ctaTextEn?: string;
  @IsOptional() @IsString() @MaxLength(30) ctaTextKa?: string;
  /** A page on the site (/prices) or a full https:// address. */
  @IsOptional() @IsString() @MaxLength(500) @Matches(/^(\/[^\s]*|https:\/\/[^\s]+)$/, { message: 'The link must start with / (a page on the site) or https://' }) link?: string;
  @ValidateNested() @Type(() => AudienceDto) audience!: AudienceDto;
  @IsOptional() @IsBoolean() push?: boolean;
}

class PushKeysDto {
  @IsString() @MaxLength(200) p256dh!: string;
  @IsString() @MaxLength(100) auth!: string;
}
class PushSubDto {
  @IsString() @MaxLength(1000) @Matches(/^https:\/\//) endpoint!: string;
  @ValidateNested() @Type(() => PushKeysDto) keys!: PushKeysDto;
}
class PushEndpointDto {
  @IsString() @MaxLength(1000) endpoint!: string;
}

/** Browser push: set up from the VAPID keys in .env; without them push is simply off. */
@Injectable()
export class PushService {
  private readonly logger = new Logger('Push');
  readonly publicKey: string;
  readonly enabled: boolean;

  constructor(config: ConfigService, private prisma: PrismaService) {
    this.publicKey = config.get('VAPID_PUBLIC_KEY') || '';
    const priv = config.get('VAPID_PRIVATE_KEY') || '';
    this.enabled = !!(this.publicKey && priv);
    if (this.enabled) webpush.setVapidDetails(config.get('VAPID_SUBJECT') || 'mailto:hello@pupbox.ge', this.publicKey, priv);
  }

  /**
   * Sends to every browser of these customers, each in their language.
   * Browsers that unsubscribed (the push service says "gone") are forgotten.
   * Returns how many devices it reached.
   */
  async send(users: { id: string; language: string }[], msg: (lang: 'en' | 'ka') => { title: string; body: string; url: string; tag?: string }) {
    if (!this.enabled || !users.length) return 0;
    const lang = new Map(users.map((u) => [u.id, u.language === 'en' ? 'en' : 'ka'] as const));
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId: { in: users.map((u) => u.id) } } });
    let sent = 0;
    for (let i = 0; i < subs.length; i += 20) {
      await Promise.all(subs.slice(i, i + 20).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg(lang.get(s.userId) ?? 'ka')), { TTL: 24 * 3600 });
          sent++;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          else this.logger.warn(`Push to ${s.userId} failed: ${e?.statusCode ?? ''} ${e?.message ?? e}`);
        }
      }));
    }
    return sent;
  }
}

/** A customer's browsers: switch push on or off for this device. */
@ApiTags('My Notifications')
@Controller('me/push')
export class PushController {
  constructor(private prisma: PrismaService, private push: PushService) {}

  /** The public key the browser needs to subscribe (public: no sign-in). */
  @Get('key')
  key() {
    return { enabled: this.push.enabled, publicKey: this.push.enabled ? this.push.publicKey : null };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async subscribe(@Request() req: any, @Body() dto: PushSubDto) {
    if (!this.push.enabled) throw new BadRequestException('Push notifications are not set up yet.');
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { userId: req.user.id, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
      update: { userId: req.user.id, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
    return { ok: true };
  }

  @Delete()
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async unsubscribe(@Request() req: any, @Body() dto: PushEndpointDto) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId: req.user.id, endpoint: dto.endpoint } });
    return { ok: true };
  }
}

/**
 * Admin → Notifications → Send a message: words in both languages, an
 * optional button with a link, to a group of customers. It lands in their
 * bell; with push on, also on the devices that allowed it.
 */
@ApiTags('Admin — Messages')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: ['crm.message', 'crm.view'], write: 'crm.message' })
@Controller('admin/messages')
export class AdminMessagesController {
  constructor(private prisma: PrismaService, private push: PushService) {}

  /** Who a choice of audience reaches: how many, and how many have push on. */
  @Post('audience')
  @HttpCode(200)
  async audience(@Body() dto: AudienceDto) {
    const users = await this.resolve(dto);
    const devices = users.length ? await this.prisma.pushSubscription.groupBy({ by: ['userId'], where: { userId: { in: users.map((u) => u.id) } } }) : [];
    return { customers: users.length, withPush: devices.length, pushReady: this.push.enabled };
  }

  /** Messages sent so far, newest first, with how many were read. */
  @Get()
  async list() {
    const list = await this.prisma.notificationCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    const reads = await Promise.all(list.map((c) => this.prisma.notification.count({ where: { type: 'MESSAGE', readAt: { not: null }, data: { path: ['campaignId'], equals: c.id } } })));
    return { pushReady: this.push.enabled, items: list.map((c, i) => ({ ...c, read: reads[i] })) };
  }

  @Post()
  async send(@Body() dto: MessageDto, @Request() req: any) {
    const users = await this.resolve(dto.audience);
    if (!users.length) throw new BadRequestException('Nobody is in this group.');
    if ((dto.ctaTextEn?.trim() || dto.ctaTextKa?.trim()) && !dto.link) throw new BadRequestException('A button needs a link.');
    const admin = await this.prisma.adminUser.findUnique({ where: { id: req.user?.id }, select: { firstName: true, lastName: true, email: true } }).catch(() => null);
    const t = (s?: string) => s?.trim() || null;
    const campaign = await this.prisma.notificationCampaign.create({
      data: {
        titleEn: dto.titleEn.trim(), titleKa: dto.titleKa.trim(), bodyEn: dto.bodyEn.trim(), bodyKa: dto.bodyKa.trim(),
        ctaTextEn: t(dto.ctaTextEn), ctaTextKa: t(dto.ctaTextKa), link: t(dto.link),
        audience: dto.audience as any, push: !!dto.push, recipients: users.length,
        adminUserId: req.user?.id ?? null, adminName: admin ? ([admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email) : null,
      },
    });
    const data = {
      campaignId: campaign.id,
      title: { en: campaign.titleEn, ka: campaign.titleKa }, body: { en: campaign.bodyEn, ka: campaign.bodyKa },
      ...(campaign.link ? { cta: { en: campaign.ctaTextEn || campaign.ctaTextKa || 'Open', ka: campaign.ctaTextKa || campaign.ctaTextEn || 'გახსნა' } } : {}),
    };
    for (let i = 0; i < users.length; i += 500) {
      await this.prisma.notification.createMany({ data: users.slice(i, i + 500).map((u) => ({ userId: u.id, type: 'MESSAGE' as const, data, link: campaign.link })) });
    }
    let pushSent = 0;
    if (dto.push) {
      pushSent = await this.push.send(users, (lang) => ({
        title: lang === 'en' ? campaign.titleEn : campaign.titleKa,
        body: lang === 'en' ? campaign.bodyEn : campaign.bodyKa,
        url: campaign.link || `/${lang}/account/notifications`,
        tag: campaign.id,
      }));
      await this.prisma.notificationCampaign.update({ where: { id: campaign.id }, data: { pushSent } });
    }
    return { ...campaign, pushSent };
  }

  private async resolve(a: AudienceDto): Promise<{ id: string; language: string }[]> {
    if (a.group === 'customers') {
      if (!a.ids?.length) return [];
      return this.prisma.user.findMany({ where: { id: { in: a.ids }, deletedAt: null, status: { not: 'BLOCKED' } }, select: { id: true, language: true } });
    }
    const plan = a.group === 'onPlan' ? 'active' : a.group === 'lapsed' ? 'ended' : a.group === 'never' ? 'none' : undefined;
    const { rows } = await customerRows(this.prisma, { plan, buyer: a.group === 'buyers' ? 'yes' : undefined, tag: a.group === 'tag' ? a.tag : undefined }, true);
    return rows
      .filter((r) => r.status !== 'BLOCKED' && (!a.consentOnly || r.marketingEmail || r.marketingSms))
      .map((r) => ({ id: r.id, language: r.language }));
  }
}
