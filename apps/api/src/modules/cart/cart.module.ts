import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query, Headers, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
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
@ApiBearerAuth()
// Optional, not required: guests must still be able to build a cart. Without
// any guard `req.user` was never populated, so signed-in customers shared the
// single `sessionId: 'guest'` cart and checkout never found their items.
@UseGuards(OptionalJwtGuard)
@Controller('cart')
export class CartController {
  constructor(private service: CartService) {}

  private resolveSession(req: any, headers: any): { userId?: string; sessionId?: string } {
    const sid = headers['x-session-id'] as string;
    // Signed in: the session id travels along so the guest cart built before
    // signing in can be merged into the account cart.
    if (req.user?.id) return { userId: req.user.id, sessionId: sid || undefined };
    // Falling back to a literal 'guest' pools every anonymous visitor into one
    // shared cart. Require a real session id instead.
    if (!sid) throw new BadRequestException('Sign in or provide an x-session-id header to use a cart');
    return { sessionId: sid };
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
  async getDeliveryMethods(@Request() req: any, @Headers() headers: any, @Query('total') total?: string) {
    // Priced against the shopper's actual cart when we know who they are, so
    // a plan that includes delivery shows it as free here, exactly as checkout
    // will charge it. `total` remains for callers without a cart.
    if (req.user?.id || headers['x-session-id']) {
      const { userId, sessionId } = this.resolveSession(req, headers);
      return this.service.getDeliveryMethods(await this.service.getOrCreate(userId, sessionId));
    }
    return this.service.getDeliveryMethods({ subtotal: total ? +total : 0 });
  }
}

@Module({
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
