import { Module } from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsInt, IsOptional, IsBoolean, IsArray, IsEnum, IsIn, IsPositive, Matches, Max, Min, MaxLength, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { PartialType } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { badgeList, saveBadges } from './badges';

enum DurationUnit { DAY = 'DAY', WEEK = 'WEEK', MONTH = 'MONTH', YEAR = 'YEAR' }

class CreatePlanDto {
  @IsString() name: string;
  @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'Web name: lowercase letters, numbers and dashes only' }) slug: string;
  @Type(() => Number) @IsInt() @Min(1) durationValue: number;
  @IsEnum(DurationUnit) durationUnit: DurationUnit;
  @Type(() => Number) @IsInt() @Min(1) boxCount: number;
  /** Never free: an order of ₾0 has nothing for the bank to take. */
  @Type(() => Number) @IsNumber() @IsPositive({ message: 'The price must be above 0' }) price: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) discountPercent?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) monthlyEquivPrice?: number;
  @IsOptional() @IsBoolean() deliveryIncluded?: boolean;
  @IsOptional() @IsBoolean() autoRenewal?: boolean;
  /** Whether this plan may be purchased for someone else's dog. */
  @IsOptional() @IsBoolean() giftable?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() benefits?: string[];
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** Shown on the site; off hides it while current subscribers keep renewing. */
  @IsOptional() @IsBoolean() listed?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() sortOrder?: number;
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDesc?: string;
  @IsOptional() translations?: Record<string, any>;
  /** The box type (Mini, Standard, Premium); null takes it out of every tier. */
  @IsOptional() @IsString() tierId?: string | null;
}

/** Validated like create, every field optional (a bare Partial<> isn't checked at all). */
class UpdatePlanDto extends PartialType(CreatePlanDto) {}

class BadgeDto {
  @IsString() @MaxLength(30) en: string;
  @IsOptional() @IsString() @MaxLength(30) ka?: string;
}
class BadgesDto {
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => BadgeDto) badges: BadgeDto[];
}

class GroupListedDto {
  @IsIn(['BOX_TYPES', 'OTHER']) group: 'BOX_TYPES' | 'OTHER';
  @IsBoolean() listed: boolean;
}

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
class SubscriptionPlansController {
  constructor(private service: SubscriptionPlansService, private prisma: PrismaService) {}
  @Get() @ApiOperation({ summary: 'List active plans' }) findAll() { return this.service.findAll(false); }
  /** Plan badges in both languages, for the plan cards. */
  @Get('badges') badges() { return badgeList(this.prisma); }
  @Get(':slug') findOne(@Param('slug') slug: string) { return this.service.findOne(slug); }
}

@ApiTags('Admin — Subscription Plans')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'subscriptions.view', write: 'subscriptions.manage' })
@Controller('admin/subscription-plans')
class AdminSubscriptionPlansController {
  constructor(private service: SubscriptionPlansService, private prisma: PrismaService) {}
  @Get() findAll() { return this.service.adminList(); }
  /** The badge list, shared by everyone in admin. */
  @Get('badges') badges() { return badgeList(this.prisma); }
  @Put('badges') saveBadges(@Body() dto: BadgesDto) { return saveBadges(this.prisma, dto.badges.map((b) => ({ en: b.en, ka: b.ka ?? '' }))); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findById(id); }
  @Post() create(@Body() dto: CreatePlanDto) { return this.service.create(dto as any); }
  @Post('show-on-site') showOnSite(@Body() dto: GroupListedDto) { return this.service.setGroupListed(dto.group, dto.listed); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdatePlanDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}

@Module({
  providers: [SubscriptionPlansService],
  controllers: [SubscriptionPlansController, AdminSubscriptionPlansController],
  exports: [SubscriptionPlansService],
})
export class SubscriptionPlansModule {}
