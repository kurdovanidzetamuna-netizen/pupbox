import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CartModule } from '../cart/cart.module';
import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, ValidateNested, IsDateString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Buying a subscription for someone else's dog. The recipient supplies the dog
 * and address later via the claim link, so nothing about them is required here
 * beyond a name to address the card to and an email to send it to.
 */
class GiftDetailsDto {
  @IsString() @MaxLength(120) recipientName: string;
  @IsEmail() recipientEmail: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
  @IsOptional() @IsDateString() deliverOn?: string;
}

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
  @IsOptional() @ValidateNested() @Type(() => GiftDetailsDto) gift?: GiftDetailsDto;
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
