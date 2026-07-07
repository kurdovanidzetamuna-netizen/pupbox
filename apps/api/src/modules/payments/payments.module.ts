import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FlittService } from './flitt.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ReferralsModule, ProductsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, FlittService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
