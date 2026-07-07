import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID } from 'class-validator';
import { CategoriesService } from './categories.service';

class CreateCategoryDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDesc?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() translations?: Record<string, any>;
}

class UpdateCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() translations?: Record<string, any>;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDesc?: string;
}

@ApiTags('Admin — Categories')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private service: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories (including inactive)' })
  findAll() { return this.service.findAll(true); }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  create(@Body() dto: CreateCategoryDto) { return this.service.create(dto); }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category (soft)' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
