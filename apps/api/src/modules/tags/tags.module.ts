import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';

class TagDto {
  @IsString() @MaxLength(40) name: string;
  @IsOptional() @IsString() @MaxLength(40) nameKa?: string;
  /** Made from the name when left out. */
  @IsOptional() @IsString() @MaxLength(60) slug?: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Tags')
@Controller('tags')
class TagsController {
  constructor(private service: TagsService) {}
  @Get() findAll() { return this.service.findAll(); }
}

@ApiTags('Admin — Tags')
@ApiBearerAuth()
// Was the customer guard: any shopper could create and edit tags.
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'products.view', write: 'products.edit' })
@Controller('admin/tags')
class AdminTagsController {
  constructor(private service: TagsService, private audit: AuditService) {}
  @Get() list() { return this.service.adminList(); }
  @Post() async create(@Body() dto: TagDto, @Req() req: any) {
    const list = await this.service.create(dto);
    await this.audit.log({ adminUserId: req.user?.id, action: 'CREATE', module: 'products', entityType: 'ProductTag', entityId: dto.name, after: dto });
    return list;
  }
  @Put(':id') async update(@Param('id') id: string, @Body() dto: TagDto, @Req() req: any) {
    const list = await this.service.update(id, dto);
    await this.audit.log({ adminUserId: req.user?.id, action: 'UPDATE', module: 'products', entityType: 'ProductTag', entityId: id, after: dto });
    return list;
  }
  @Delete(':id') async remove(@Param('id') id: string, @Req() req: any) {
    const list = await this.service.remove(id);
    await this.audit.log({ adminUserId: req.user?.id, action: 'DELETE', module: 'products', entityType: 'ProductTag', entityId: id });
    return list;
  }
}

@Module({
  providers: [TagsService],
  controllers: [TagsController, AdminTagsController],
  exports: [TagsService],
})
export class TagsModule {}
