import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { CmsService } from './cms.service';
import { AdminPerms } from '../admin-auth/admin-permissions';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  findAll() {
    return this.cmsService.findAll();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.cmsService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  upsert(@Body() body: any) {
    return this.cmsService.upsert(body);
  }

  @Patch(':slug')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  update(@Param('slug') slug: string, @Body() body: any) {
    return this.cmsService.updateBySlug(slug, body);
  }
}
