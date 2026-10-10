import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { BoxCampaignsService } from './box-campaigns.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { DogSize } from '@prisma/client';

class CampaignDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
  @Type(() => Number) @IsInt() @Min(2024) @Max(2100) year: number;
  @IsOptional() @IsEnum(DogSize) dogSize?: DogSize;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsObject() translations?: Record<string, any>;
}

class UpdateCampaignDto extends PartialType(CampaignDto) {}

class CampaignItemDto {
  @IsString() productId: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) quantity: number;
}

class CampaignProductsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CampaignItemDto) items: CampaignItemDto[];
}

@ApiTags('box-campaigns')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'subscriptions.view', write: 'subscriptions.manage' })
@Controller('box-campaigns')
export class BoxCampaignsController {
  constructor(private readonly boxCampaignsService: BoxCampaignsService) {}

  @Get()
  findAll() {
    return this.boxCampaignsService.findAll();
  }

  @Get('packing-list')
  packingList(@Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.boxCampaignsService.packingList(+(year || now.getFullYear()), +(month || now.getMonth() + 1));
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.boxCampaignsService.findById(id);
  }

  @Post()
  create(@Body() body: CampaignDto) {
    return this.boxCampaignsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateCampaignDto) {
    return this.boxCampaignsService.update(id, body);
  }

  @Put(':id/products')
  setProducts(@Param('id') id: string, @Body() body: CampaignProductsDto) {
    return this.boxCampaignsService.setProducts(id, body.items ?? []);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.boxCampaignsService.delete(id);
  }
}
