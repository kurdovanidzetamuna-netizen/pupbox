import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CartModule } from '../cart/cart.module';
import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

class PrepareCheckoutDto {
  @IsString() deliveryMethodId: string;
  @IsOptional() @IsString() addressId?: string;
  @IsOptional() @IsString() dogId?: string;
}

class CreateOrderDto {
  @IsString() deliveryMethodId: string;
  @IsOptional() @IsString() addressId?: string;
  @IsOptional() @IsString() dogId?: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() phone: string;
  @IsString() city: string;
  @IsString() addressLine1: string;
  @IsOptional() @IsString() addressLine2?: string;
}

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('checkout')
class CheckoutController {
  constructor(private service: CheckoutService) {}

  @Post('prepare')
  @ApiOperation({ summary: 'Preview order totals before payment' })
  prepare(@Request() req: any, @Body() dto: PrepareCheckoutDto) {
    return this.service.prepare(req.user.id, dto);
  }

  @Post('order')
  @ApiOperation({ summary: 'Create order (pending payment)' })
  createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.service.createOrder(req.user.id, dto);
  }
}

@Module({
  imports: [CartModule],
  providers: [CheckoutService],
  controllers: [CheckoutController],
  exports: [CheckoutService],
})
export class CheckoutModule {}
