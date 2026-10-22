import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CouponDiscountType, CouponScope } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';

/** The admin form called the percentage type "PERCENT"; accept it as PERCENTAGE. */
const toType = ({ value }: { value: unknown }) => (value === 'PERCENT' ? 'PERCENTAGE' : value);
const Scopes = () => (target: object, key: string) => {
  IsOptional()(target, key); IsArray()(target, key); ArrayUnique()(target, key);
  ArrayMinSize(1, { message: 'Choose at least one thing the promo code is for' })(target, key);
  IsEnum(CouponScope, { each: true })(target, key);
};
/** A number, or null to clear it. */
const OptNum = (min: number, int = false) => (target: object, key: string) => {
  IsOptional()(target, key); ValidateIf((_: any, v: any) => v !== null)(target, key);
  Type(() => Number)(target, key); (int ? IsInt() : IsNumber())(target, key); Min(min)(target, key);
};

class CouponRulesDto {
  @Scopes() scopes?: CouponScope[];
  @OptNum(0) minOrderAmount?: number | null;
  @OptNum(0.01) maxDiscount?: number | null;
  @OptNum(1, true) minPlanMonths?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) boxTierIds?: string[];
  @IsOptional() @IsBoolean() firstOrderOnly?: boolean;
  @OptNum(1, true) usageLimit?: number | null;
  @OptNum(1, true) perUserLimit?: number | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() startsAt?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() expiresAt?: string | null;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
}

class CreateCouponDto extends CouponRulesDto {
  @IsString() @Length(3, 30) @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Use letters, numbers, - and _ only' }) code: string;
  @Transform(toType) @IsEnum(CouponDiscountType) discountType: CouponDiscountType;
  @Type(() => Number) @IsNumber() @Min(0.01) @Max(100000) discountValue: number;
}

class UpdateCouponDto extends CouponRulesDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** The discount itself can change only until the code is first used. */
  @IsOptional() @Transform(toType) @IsEnum(CouponDiscountType) discountType?: CouponDiscountType;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) @Max(100000) discountValue?: number;
}

const day = (v: string | null | undefined) => (v ? new Date(v) : null);

@ApiTags('Admin — Promo codes')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'coupons.manage', write: 'coupons.manage' })
@Controller('admin/coupons')
export class CouponsController {
  constructor(private prisma: PrismaService) {}

  /** Every code, with how it's doing: paid orders, money taken off, and sales it brought. */
  @Get()
  async list() {
    const [coupons, stats] = await Promise.all([
      this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { usages: true } } } }),
      this.prisma.order.groupBy({
        by: ['couponId'],
        where: { couponId: { not: null }, payments: { some: { status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } } } },
        _count: true, _sum: { discountAmount: true, total: true },
      }),
    ]);
    const by = new Map(stats.map((s) => [s.couponId, s]));
    return coupons.map((c) => {
      const s = by.get(c.id);
      return { ...c, stats: { orders: s?._count ?? 0, discount: Number(s?._sum.discountAmount ?? 0), sales: Number(s?._sum.total ?? 0) } };
    });
  }

  private check(d: { discountType?: CouponDiscountType; discountValue?: number; startsAt?: string | null; expiresAt?: string | null }) {
    if (d.discountType === 'PERCENTAGE' && d.discountValue !== undefined && d.discountValue > 100) throw new BadRequestException('A percentage discount can be at most 100%');
    if (d.startsAt && d.expiresAt && new Date(d.expiresAt) < new Date(d.startsAt)) throw new BadRequestException('The promo code must end after it starts');
  }

  private async tiers(ids?: string[]) {
    if (!ids?.length) return ids;
    const found = await this.prisma.boxTier.findMany({ where: { id: { in: ids } }, select: { id: true } });
    return found.map((t) => t.id);
  }

  private rules(dto: CouponRulesDto) {
    const opt = <T, R extends object>(v: T | undefined, f: (x: T) => R): Partial<R> => (v === undefined ? {} : f(v));
    return {
      ...opt(dto.scopes, (scopes) => ({ scopes })),
      ...opt(dto.minOrderAmount, (v) => ({ minOrderAmount: v || null })),
      ...opt(dto.maxDiscount, (v) => ({ maxDiscount: v || null })),
      ...opt(dto.minPlanMonths, (v) => ({ minPlanMonths: v || null })),
      ...opt(dto.firstOrderOnly, (firstOrderOnly) => ({ firstOrderOnly })),
      ...opt(dto.usageLimit, (v) => ({ usageLimit: v || null })),
      ...opt(dto.perUserLimit, (v) => ({ perUserLimit: v || null })),
      ...opt(dto.startsAt, (v) => ({ startsAt: day(v) })),
      ...opt(dto.expiresAt, (v) => ({ expiresAt: day(v) })),
      ...opt(dto.description, (v) => ({ description: v?.trim() || null })),
    };
  }

  @Post()
  async create(@Body() dto: CreateCouponDto) {
    this.check(dto);
    const code = dto.code.trim().toUpperCase();
    if (await this.prisma.coupon.findFirst({ where: { code: { equals: code, mode: 'insensitive' } } })) {
      throw new ConflictException(`A promo code ${code} already exists`);
    }
    return this.prisma.coupon.create({
      data: {
        code, discountType: dto.discountType, discountValue: dto.discountValue, isActive: true,
        // One use per customer unless told otherwise.
        perUserLimit: 1,
        ...this.rules(dto),
        boxTierIds: (await this.tiers(dto.boxTierIds)) ?? [],
      },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    const c = await this.prisma.coupon.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Promo code not found');
    if (c.stoppedAt && dto.isActive) throw new BadRequestException('This promo code was stopped for good and can’t be switched back on. Create a new one instead.');
    const changesDiscount = (dto.discountType && dto.discountType !== c.discountType) || (dto.discountValue !== undefined && dto.discountValue !== Number(c.discountValue));
    if (changesDiscount && (c.usedCount > 0 || (await this.prisma.order.count({ where: { couponId: id } })))) {
      throw new BadRequestException('The discount can’t change once the code has been used. Stop it and create a new one instead.');
    }
    this.check({ discountType: dto.discountType ?? c.discountType, discountValue: dto.discountValue ?? Number(c.discountValue), startsAt: dto.startsAt === undefined ? c.startsAt?.toISOString() : dto.startsAt, expiresAt: dto.expiresAt === undefined ? c.expiresAt?.toISOString() : dto.expiresAt });
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(changesDiscount ? { discountType: dto.discountType ?? c.discountType, discountValue: dto.discountValue ?? c.discountValue } : {}),
        ...this.rules(dto),
        ...(dto.boxTierIds !== undefined ? { boxTierIds: (await this.tiers(dto.boxTierIds)) ?? [] } : {}),
      },
    });
  }

  /** Stop for good: it stops working now (and leaves any basket holding it) and can never be switched back on. */
  @Post(':id/stop')
  async stop(@Param('id') id: string) {
    const c = await this.prisma.coupon.findUnique({ where: { id }, select: { stoppedAt: true } });
    if (!c) throw new NotFoundException('Promo code not found');
    if (c.stoppedAt) return this.prisma.coupon.findUnique({ where: { id } });
    await this.prisma.cart.updateMany({ where: { couponId: id }, data: { couponId: null } });
    return this.prisma.coupon.update({ where: { id }, data: { isActive: false, stoppedAt: new Date() } });
  }

  /** A code already used on orders is stopped, not deleted: the orders still point to it. */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const used = await this.prisma.order.count({ where: { couponId: id } });
    if (used) {
      await this.prisma.cart.updateMany({ where: { couponId: id }, data: { couponId: null } });
      await this.prisma.coupon.update({ where: { id }, data: { isActive: false, stoppedAt: new Date() } });
      return { deleted: false, deactivated: true, reason: `Used on ${used} order(s), so it was stopped instead` };
    }
    await this.prisma.cart.updateMany({ where: { couponId: id }, data: { couponId: null } });
    await this.prisma.couponUsage.deleteMany({ where: { couponId: id } });
    await this.prisma.coupon.delete({ where: { id } });
    return { deleted: true };
  }
}
