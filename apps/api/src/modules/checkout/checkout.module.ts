import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CartModule } from '../cart/cart.module';
import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsBoolean, ValidateNested, IsDateString, MaxLength, IsNotEmpty, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** Trims strings so a field of only spaces counts as empty. */
const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

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
  // A courier needs every one of these; an order with a blank address used
  // to be accepted and could never be delivered.
  @Trim() @IsString() @IsNotEmpty({ message: 'First name is required' }) @MaxLength(80) firstName: string;
  @Trim() @IsString() @IsNotEmpty({ message: 'Last name is required' }) @MaxLength(80) lastName: string;
  @Trim() @IsString() @Matches(/^\+?[0-9\s()-]{7,20}$/, { message: 'Enter a valid phone number' }) phone: string;
  @Trim() @IsString() @IsNotEmpty({ message: 'City is required' }) @MaxLength(80) city: string;
  @Trim() @IsString() @IsNotEmpty({ message: 'Address is required' }) @MaxLength(200) addressLine1: string;
  @IsOptional() @Trim() @IsString() @MaxLength(200) addressLine2?: string;
  /**
   * The customer's auto-renewal choice. The checkout page has always sent
   * this; because it was missing here, forbidNonWhitelisted rejected every
   * order with 400 "property autoRenewal should not exist".
   */
  @IsOptional() @IsBoolean() autoRenewal?: boolean;
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
