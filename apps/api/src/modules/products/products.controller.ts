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
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') categorySlug?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      categorySlug,
      search,
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug);
  }
}
