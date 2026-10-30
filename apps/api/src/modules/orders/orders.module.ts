import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatusService } from './order-status.service';
import { OrderRefundsService } from './order-refunds.service';
import { OrderEditService } from './order-edit.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStatusService, OrderRefundsService, OrderEditService],
  exports: [OrdersService],
})
export class OrdersModule {}
