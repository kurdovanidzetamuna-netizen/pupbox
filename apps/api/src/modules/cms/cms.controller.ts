import { Controller, Get, Post, Patch, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CmsService } from './cms.service';
import { AdminPerms } from '../admin-auth/admin-permissions';

class UpsertCmsDto {
  @IsString() @MaxLength(120) key: string;
  @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'Use lowercase letters, numbers and - in the address' }) @MaxLength(120) slug: string;
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsObject() content?: Record<string, any>;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
  @IsOptional() @IsString() @MaxLength(200) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(400) seoDesc?: string;
  @IsOptional() @IsString() @MaxLength(500) ogImage?: string;
  @IsOptional() @IsObject() translations?: Record<string, any>;
}

class UpdateCmsDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsObject() content?: Record<string, any>;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
  @IsOptional() @IsString() @MaxLength(200) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(400) seoDesc?: string;
  @IsOptional() @IsString() @MaxLength(500) ogImage?: string;
  @IsOptional() @IsObject() translations?: Record<string, any>;
}

/** Rows only admin may read: shop settings hold internal addresses. */
const PRIVATE_SLUGS = ['config-settings', 'config-sms'];
/** Rows the CMS endpoints never touch, even for admin: the SMS settings hold an API key (admin/sms/settings only). */
const SECRET_SLUGS = ['config-sms'];

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  /** Public: published pages only — drafts and internal settings stay in admin. */
  @Get()
  async findAll() {
    const rows = await this.cmsService.findAll();
    return rows.filter((r) => r.status === 'PUBLISHED' && !PRIVATE_SLUGS.includes(r.slug));
  }

  /** Admin: every page, drafts included. Declared before ':slug'. */
  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'cms.view' })
  async findAllAdmin() {
    return (await this.cmsService.findAll()).filter((r) => !SECRET_SLUGS.includes(r.slug));
  }

  @Get('admin/:slug')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'cms.view' })
  findBySlugAdmin(@Param('slug') slug: string) {
    if (SECRET_SLUGS.includes(slug)) throw new NotFoundException('Page not found');
    return this.cmsService.findBySlug(slug);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const row = await this.cmsService.findBySlug(slug);
    if (row.status !== 'PUBLISHED' || PRIVATE_SLUGS.includes(row.slug)) throw new NotFoundException('Page not found');
    return row;
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  upsert(@Body() body: UpsertCmsDto) {
    if (SECRET_SLUGS.includes(body.slug) || SECRET_SLUGS.includes((body as any).key)) throw new NotFoundException('Page not found');
    return this.cmsService.upsert(body);
  }

  @Patch(':slug')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  update(@Param('slug') slug: string, @Body() body: UpdateCmsDto) {
    if (SECRET_SLUGS.includes(slug)) throw new NotFoundException('Page not found');
    return this.cmsService.updateBySlug(slug, body);
  }
}
