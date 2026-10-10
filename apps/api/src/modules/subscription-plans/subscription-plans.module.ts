import { Module } from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminPerms } from '../admin-auth/admin-permissions';

enum DurationUnit { DAY = 'DAY', WEEK = 'WEEK', MONTH = 'MONTH', YEAR = 'YEAR' }

class CreatePlanDto {
  @IsString() name: string;
  @IsString() slug: string;
  @Type(() => Number) @IsNumber() @Min(1) durationValue: number;
  @IsEnum(DurationUnit) durationUnit: DurationUnit;
  @Type(() => Number) @IsNumber() @Min(1) boxCount: number;
  @Type(() => Number) @IsNumber() @Min(0) price: number;
  @IsOptional() @Type(() => Number) @IsNumber() discountPercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() monthlyEquivPrice?: number;
  @IsOptional() @IsBoolean() deliveryIncluded?: boolean;
  @IsOptional() @IsBoolean() autoRenewal?: boolean;
  /** Whether this plan may be purchased for someone else's dog. */
  @IsOptional() @IsBoolean() giftable?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() benefits?: string[];
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() sortOrder?: number;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDesc?: string;
  @IsOptional() translations?: Record<string, any>;
}

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
class SubscriptionPlansController {
  constructor(private service: SubscriptionPlansService) {}
  @Get() @ApiOperation({ summary: 'List active plans' }) findAll() { return this.service.findAll(false); }
  @Get(':slug') findOne(@Param('slug') slug: string) { return this.service.findOne(slug); }
}

@ApiTags('Admin — Subscription Plans')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'subscriptions.view', write: 'subscriptions.manage' })
@Controller('admin/subscription-plans')
class AdminSubscriptionPlansController {
  constructor(private service: SubscriptionPlansService) {}
  @Get() findAll() { return this.service.findAll(true); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Post() create(@Body() dto: CreatePlanDto) { return this.service.create(dto as any); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}

@Module({
  providers: [SubscriptionPlansService],
  controllers: [SubscriptionPlansController, AdminSubscriptionPlansController],
  exports: [SubscriptionPlansService],
})
export class SubscriptionPlansModule {}
