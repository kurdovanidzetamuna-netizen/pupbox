import { Controller, Get, Param, Query, UseGuards, Request, Patch, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { OrdersService } from './orders.service';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
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

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
  ) {
    return this.ordersService.adminList(+page, +limit, status, type, search, sortBy, sortDir, planId, dateFrom, dateTo);
  }

  @Get('admin/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'orders.view' })
  adminGetOne(@Param('id') id: string) {
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
