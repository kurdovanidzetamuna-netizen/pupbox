import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CartModule } from '../cart/cart.module';
import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsBoolean, ValidateNested, IsDateString, MaxLength, IsNotEmpty, Matches, IsEnum, IsArray, ArrayMaxSize, IsNumber, Min, Max } from 'class-validator';
import { DogGender, DogSize } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

/** Trims strings so a field of only spaces counts as empty. */
const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** The friend's dog: its size and allergies decide what goes in each box. */
class GiftDogDto {
  @Trim() @IsString() @IsNotEmpty({ message: 'Tell us the dog’s name' }) @MaxLength(60) name: string;
  @IsEnum(DogSize, { message: 'Choose the dog’s size' }) size: DogSize;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) allergies?: string[];
  // The rest of the dog form, all optional.
  @IsOptional() @Trim() @IsString() @MaxLength(80) breed?: string;
  @IsOptional() @IsEnum(DogGender) gender?: DogGender;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(150) weightKg?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) foodPreferences?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(60, { each: true }) toyPreferences?: string[];
  @IsOptional() @IsString() @MaxLength(30) chewingStrength?: string;
  @IsOptional() @IsString() @MaxLength(500) specialNotes?: string;
}

/**
 * Buying a plan for a friend's dog. The buyer gives everything needed to
 * ship: the friend's name here, their dog, and their address and phone in the
 * order's delivery fields. Boxes go straight to the friend; nothing to claim.
 */
class GiftDetailsDto {
  @Trim() @IsString() @IsNotEmpty({ message: 'Recipient name is required' }) @MaxLength(120) recipientName: string;
  /** Optional: if given, the friend gets a "a gift is on its way" email. */
  @IsOptional() @Trim() @IsEmail({}, { message: 'Enter a valid email, or leave it empty' }) recipientEmail?: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
  /** First month the boxes start (e.g. a birthday); absent = straight away. */
  @IsOptional() @IsDateString() deliverOn?: string;
  @ValidateNested() @Type(() => GiftDogDto) dog: GiftDogDto;
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
