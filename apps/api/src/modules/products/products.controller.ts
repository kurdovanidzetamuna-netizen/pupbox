import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List active products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['price_asc', 'price_desc', 'name_asc', 'name_desc'] })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'lang', required: false, enum: ['ka', 'en'] })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') categorySlug?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('brand') brand?: string,
    @Query('lang') lang?: string,
    @Query('size') size?: string,
    @Query('seller') seller?: string,
  ) {
    return this.service.findAll({
      page: page ? Math.max(1, +page || 1) : 1,
      // Capped so a crafted ?limit= can't ask for the whole table in one go.
      limit: limit ? Math.min(100, Math.max(1, +limit || 20)) : 20,
      categorySlug,
      search,
      sort,
      brand,
      lang,
      // Only real sizes; anything else is ignored rather than erroring.
      seller: seller || undefined,
      size: ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'].includes(size ?? '') ? (size as any) : undefined,
    });
  }

  // Declared before ':slug' so "brands" isn't read as a product slug.
  @Get('brands')
  @ApiOperation({ summary: 'Brands (or tags) present in the live catalogue' })
  brands() {
    return this.service.brands();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug);
  }
}
