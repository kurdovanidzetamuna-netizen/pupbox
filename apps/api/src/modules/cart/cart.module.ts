import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

class AddItemDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() subscriptionPlanId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) quantity?: number;
}

class UpdateItemDto {
  @Type(() => Number) @IsNumber() @Min(0) quantity: number;
}

class ApplyCouponDto {
  @IsString() code: string;
}

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private service: CartService) {}

  private resolveSession(req: any, headers: any): { userId?: string; sessionId?: string } {
    if (req.user?.id) return { userId: req.user.id };
    const sid = headers['x-session-id'] as string;
    return { sessionId: sid || 'guest' };
  }

  @Get()
  @ApiOperation({ summary: 'Get current cart' })
  getCart(@Request() req: any, @Headers() headers: any) {
    const { userId, sessionId } = this.resolveSession(req, headers);
    return this.service.getOrCreate(userId, sessionId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@Request() req: any, @Headers() headers: any, @Body() dto: AddItemDto) {
    const { userId, sessionId } = this.resolveSession(req, headers);
    return this.service.getOrCreate(userId, sessionId).then(cart => this.service.addItem(cart.id, dto));
  }

  @Put('items/:itemId')
  updateItem(@Request() req: any, @Headers() headers: any, @Param('itemId') itemId: string, @Body() dto: UpdateItemDto) {
    const { userId, sessionId } = this.resolveSession(req, headers);
    return this.service.getOrCreate(userId, sessionId).then(cart => this.service.updateItem(cart.id, itemId, dto.quantity));
  }

  @Delete('items/:itemId')
  removeItem(@Request() req: any, @Headers() headers: any, @Param('itemId') itemId: string) {
    const { userId, sessionId } = this.resolveSession(req, headers);
    return this.service.getOrCreate(userId, sessionId).then(cart => this.service.removeItem(cart.id, itemId));
  }

  @Post('coupon')
  applyCoupon(@Request() req: any, @Headers() headers: any, @Body() dto: ApplyCouponDto) {
    const { userId, sessionId } = this.resolveSession(req, headers);
    return this.service.getOrCreate(userId, sessionId).then(cart => this.service.applyCoupon(cart.id, dto.code, userId));
  }

  @Delete('coupon')
  removeCoupon(@Request() req: any, @Headers() headers: any) {
    const { userId, sessionId } = this.resolveSession(req, headers);
    return this.service.getOrCreate(userId, sessionId).then(cart => this.service.removeCoupon(cart.id));
  }

  @Get('delivery-methods')
  getDeliveryMethods(@Query('total') total?: string) {
    return this.service.getDeliveryMethods(total ? +total : 0);
  }
}

@Module({
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
