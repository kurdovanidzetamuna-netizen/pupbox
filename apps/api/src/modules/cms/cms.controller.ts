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
const PRIVATE_SLUGS = ['config-settings'];

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
  findAllAdmin() {
    return this.cmsService.findAll();
  }

  @Get('admin/:slug')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'cms.view' })
  findBySlugAdmin(@Param('slug') slug: string) {
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
    return this.cmsService.upsert(body);
  }

  @Patch(':slug')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  update(@Param('slug') slug: string, @Body() body: UpdateCmsDto) {
    return this.cmsService.updateBySlug(slug, body);
  }
}
