import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';

@Module({
  providers: [ProductsService],
  controllers: [ProductsController, AdminProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
