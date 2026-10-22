import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AdminPerms } from '../admin-auth/admin-permissions';

class AddImageDto {
  @IsString() url: string;
  @IsOptional() @IsString() altText?: string;
}

class UpdateStatusDto {
  @IsString() status: string;
}

@ApiTags('Admin — Products')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'products.view', write: 'products.edit' })
@Controller('admin/products')
export class AdminProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('includedInBox') includedInBox?: string,
    @Query('category') category?: string,
  ) {
    return this.service.findAll({
      categorySlug: category || undefined,
      page: page ? +page : 1,
      limit: limit ? +limit : 100,
      status,
      search,
      adminView: true,
      includedInBox: includedInBox === 'true' ? true : includedInBox === 'false' ? false : undefined,
    });
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug, true);
  }

  @Post()
  @AdminPerms({ write: 'products.create' })
  @ApiOperation({ summary: 'Create product' })
  create(@Body() dto: CreateProductDto) { return this.service.create(dto); }

  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  update(@Param('id') id: string, @Body() dto: CreateProductDto) { return this.service.update(id, dto); }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update product status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) { return this.service.updateStatus(id, dto.status); }

  @Delete(':id')
  @AdminPerms({ write: 'products.delete' })
  @ApiOperation({ summary: 'Delete product (soft)' })
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post(':id/images')
  @ApiOperation({ summary: 'Add product image' })
  addImage(@Param('id') id: string, @Body() dto: AddImageDto) {
    return this.service.addImage(id, dto.url, dto.altText);
  }

  @Patch(':id/images/:imageId/primary')
  @ApiOperation({ summary: 'Make an image the main one' })
  setPrimaryImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.service.setPrimaryImage(id, imageId);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Remove product image' })
  removeImage(@Param('imageId') imageId: string) {
    return this.service.removeImage(imageId);
  }
}
