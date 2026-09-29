import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

class CreateSubscriptionDto {
  @IsString() planId: string;
  @IsOptional() @IsString() dogId?: string;
  @IsOptional() @IsBoolean() autoRenewal?: boolean;
}

class CancelDto {
  @IsOptional() @IsString() reason?: string;
}

class ToggleAutoRenewalDto {
  @IsBoolean() enabled: boolean;
}

class AdminUpdateDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() cancelReason?: string;
  @IsOptional() @IsBoolean() autoRenewal?: boolean;
}

@ApiTags('My Subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me/subscriptions')
class SubscriptionsController {
  constructor(private service: SubscriptionsService) {}
  @Get() findAll(@Request() req: any) { return this.service.findByUser(req.user.id); }
  @Get(':id') findOne(@Request() req: any, @Param('id') id: string) { return this.service.findOne(id, req.user.id); }
  @Post() create(@Request() req: any, @Body() dto: CreateSubscriptionDto) { return this.service.create(req.user.id, dto); }
  @Patch(':id/cancel') cancel(@Request() req: any, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.service.cancel(id, req.user.id, dto.reason);
  }
  @Patch(':id/auto-renewal') toggleAutoRenewal(@Request() req: any, @Param('id') id: string, @Body() dto: ToggleAutoRenewalDto) {
    return this.service.toggleAutoRenewal(id, req.user.id, dto.enabled);
  }
}

@ApiTags('Admin — Subscriptions')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/subscriptions')
class AdminSubscriptionsController {
  constructor(private service: SubscriptionsService) {}
  @Get() list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('gifts') gifts?: 'all' | 'unclaimed' | 'claimed',
  ) {
    return this.service.adminList({ status, page: page ? +page : 1, limit: limit ? +limit : 20, gifts });
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: AdminUpdateDto) { return this.service.adminUpdate(id, dto as any); }
}

@Module({
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController, AdminSubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
