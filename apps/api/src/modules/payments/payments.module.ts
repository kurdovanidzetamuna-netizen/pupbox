import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FlittService } from './flitt.service';
import { CardsController } from './cards.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [PaymentsController, CardsController],
  providers: [PaymentsService, FlittService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
