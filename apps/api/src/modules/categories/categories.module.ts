import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { AdminCategoriesController } from './admin-categories.controller';

@Module({
  providers: [CategoriesService],
  controllers: [CategoriesController, AdminCategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}
