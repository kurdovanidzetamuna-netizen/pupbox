import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FlittService } from './flitt.service';
import { AutoRenewService } from './auto-renew';
import { CardsController } from './cards.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [PaymentsController, CardsController],
  providers: [PaymentsService, FlittService, AutoRenewService],
  exports: [PaymentsService, FlittService, AutoRenewService],
})
export class PaymentsModule {}
