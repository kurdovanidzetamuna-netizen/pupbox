import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { EMAIL_KINDS, EmailService, type EmailText, type Lang } from './email.service';

class EmailTextDto implements EmailText {
  @IsString() @MinLength(1) @MaxLength(200) subject!: string;
  @IsString() @MinLength(1) @MaxLength(200) heading!: string;
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
  @IsOptional() @IsString() @MaxLength(60) button?: string;
  @IsOptional() @IsString() @MaxLength(1000) after?: string;
}

const LANGS: Lang[] = ['ka', 'en'];

/**
 * Admin → Emails: the wording of every customer email in both languages.
 * What's saved replaces the built-in wording; "Reset" goes back to it.
 */
@ApiTags('Admin — Emails')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'cms.view', write: 'cms.edit' })
@Controller('admin/email-templates')
export class EmailTemplatesController {
  constructor(private prisma: PrismaService, private email: EmailService) {}

  @Get()
  async list() {
    const saved = await this.prisma.emailTemplate.findMany({ where: { key: { in: EMAIL_KINDS.flatMap((k) => LANGS.map((l) => `${k.key}_${l}`)) } } });
    const items = await Promise.all(EMAIL_KINDS.map(async (k) => {
      const per: Record<string, unknown> = {};
      let fillIns: string[] = [];
      for (const l of LANGS) {
        const b = await this.email.builtIn(k.key, l);
        fillIns = b?.fillIns ?? fillIns;
        const row = saved.find((s) => s.key === `${k.key}_${l}`);
        let own: EmailText | null = null;
        try { own = row ? { ...JSON.parse(row.body), subject: row.subject } : null; } catch { own = null; }
        per[l] = { builtIn: b?.text ?? null, saved: own, updatedAt: row?.updatedAt ?? null };
      }
      return { ...k, fillIns, ...per };
    }));
    return { sending: this.email.isConfigured, items };
  }

  @Put(':key/:lang')
  async save(@Param('key') key: string, @Param('lang') lang: string, @Body() dto: EmailTextDto) {
    const l = this.check(key, lang);
    const { subject, ...rest } = dto;
    const body = JSON.stringify({ heading: rest.heading, body: rest.body, ...(rest.button !== undefined ? { button: rest.button } : {}), ...(rest.after !== undefined ? { after: rest.after } : {}) });
    return this.prisma.emailTemplate.upsert({ where: { key: `${key}_${l}` }, create: { key: `${key}_${l}`, subject, body }, update: { subject, body, isActive: true } });
  }

  @Delete(':key/:lang')
  @HttpCode(200)
  async reset(@Param('key') key: string, @Param('lang') lang: string) {
    const l = this.check(key, lang);
    await this.prisma.emailTemplate.deleteMany({ where: { key: `${key}_${l}` } });
    return { ok: true };
  }

  /** The email as a customer would see it, from the text in the editor (saved or not). */
  @Post(':key/:lang/preview')
  @HttpCode(200)
  async preview(@Param('key') key: string, @Param('lang') lang: string, @Body() dto: EmailTextDto) {
    const l = this.check(key, lang);
    const p = await this.email.preview(key, l, dto);
    if (!p) throw new NotFoundException();
    return p;
  }

  private check(key: string, lang: string): Lang {
    if (!EMAIL_KINDS.some((k) => k.key === key)) throw new NotFoundException('No such email');
    if (lang !== 'ka' && lang !== 'en') throw new BadRequestException('Language must be ka or en');
    return lang;
  }
}
