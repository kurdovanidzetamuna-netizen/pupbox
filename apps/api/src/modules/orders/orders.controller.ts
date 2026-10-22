import { Controller, Get, Param, Query, UseGuards, Request, Patch, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { OrdersService } from './orders.service';
import { AutoRenewService } from '../payments/auto-renew';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import { AdminPerms } from '../admin-auth/admin-permissions';

@ApiTags('orders')
class AdminStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
  /** For REFUNDED: what was returned; defaults to the full payment. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) refundAmount?: number;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

class RefundDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

class EditAddressDto {
  @IsString() @MaxLength(80) firstName: string;
  @IsString() @MaxLength(80) lastName: string;
  @IsString() @MaxLength(30) phone: string;
  @IsString() @MaxLength(80) city: string;
  @IsString() @MaxLength(200) addressLine1: string;
  @IsOptional() @IsString() @MaxLength(200) addressLine2?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
}
class EditLineDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() productId?: string;
  @Type(() => Number) @IsInt() @Min(0) quantity: number;
}
class RefundLineDto {
  @IsString() itemId: string;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
}
class RefundNowDto {
  @IsIn(['FULL', 'AMOUNT', 'ITEMS']) mode: 'FULL' | 'AMOUNT' | 'ITEMS';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RefundLineDto) items?: RefundLineDto[];
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
  @IsOptional() @IsBoolean() restock?: boolean;
  @IsOptional() @IsBoolean() recordOnly?: boolean;
}

class AdminEditDto {
  @IsOptional() @IsString() addressId?: string;
  @IsOptional() @IsBoolean() newAddress?: boolean;
  @IsOptional() @ValidateNested() @Type(() => EditAddressDto) address?: EditAddressDto;
  @IsOptional() @IsBoolean() addressForPlan?: boolean;
  @IsOptional() @IsString() dogId?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EditLineDto) items?: EditLineDto[];
  @IsOptional() @IsString() @MaxLength(120) giftRecipientName?: string;
  @IsOptional() @IsString() @MaxLength(1000) giftMessage?: string;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService, private readonly autoRenew: AutoRenewService) {}

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findMyOrders(@Request() req: any, @Query('page') page = '1', @Query('limit') limit = '10') {
    return this.ordersService.findByUser(req.user.id, +page, +limit);
  }

  @Get('my/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findMyOrder(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.findOne(id, req.user.id);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'orders.view' })
  adminList(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('planId') planId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.ordersService.adminList(+page, +limit, status, type, search, sortBy, sortDir, planId, dateFrom, dateTo, categoryId);
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'orders.view' })
  adminGetOne(@Param('id') id: string) {
    return this.ordersService.adminGetOne(id);
  }

  /** Change an order that hasn't shipped: address, dog, gift card, shop products. */
  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'orders.manage' })
  adminEdit(@Param('id') id: string, @Body() body: AdminEditDto, @Request() req: any) {
    return this.ordersService.adminEdit(id, body, req.user?.id);
  }

  /** Give money back: all, an amount, or chosen items (through Flitt when it can). */
  @Post('admin/:id/refunds')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'payments.refund' })
  adminRefund(@Param('id') id: string, @Body() body: RefundNowDto, @Request() req: any) {
    return this.ordersService.refund(id, body, req.user?.id);
  }

  /** An unpaid renewal: charge the saved card now (outside the retry schedule). */
  @Post('admin/:id/charge-now')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'payments.refund' })
  async adminChargeNow(@Param('id') id: string) {
    await this.autoRenew.chargeNow(id);
    return this.ordersService.adminGetOne(id);
  }

  @Patch('admin/:id/status')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'orders.manage' })
  adminUpdateStatus(@Param('id') id: string, @Body() body: AdminStatusDto) {
    return this.ordersService.adminUpdateStatus(id, body.status, { refundAmount: body.refundAmount, reason: body.reason });
  }

  @Post('admin/:id/refund')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'payments.refund' })
  adminRecordRefund(@Param('id') id: string, @Body() body: RefundDto) {
    return this.ordersService.recordRefund(id, body.amount, body.reason);
  }

  @Patch('admin/:id/tracking')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'orders.manage' })
  adminUpdateTracking(@Param('id') id: string, @Body('trackingNumber') trackingNumber: string, @Body('internalNotes') internalNotes?: string) {
    return this.ordersService.adminUpdateTracking(id, trackingNumber, internalNotes);
  }
}
