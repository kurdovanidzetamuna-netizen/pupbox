import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ConflictException, BadRequestException } from '@nestjs/common';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CouponDiscountType } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';

/** The admin form called the percentage type "PERCENT"; accept it as PERCENTAGE. */
const toType = ({ value }: { value: unknown }) => (value === 'PERCENT' ? 'PERCENTAGE' : value);

class CreateCouponDto {
  @IsString() @Length(3, 30) @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Use letters, numbers, - and _ only' }) code: string;
  @Transform(toType) @IsEnum(CouponDiscountType) discountType: CouponDiscountType;
  @Type(() => Number) @IsNumber() @Min(0.01) discountValue: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) perUserLimit?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
}

class UpdateCouponDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) usageLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) perUserLimit?: number;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
}

@ApiTags('Admin — Coupons')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'coupons.manage', write: 'coupons.manage' })
@Controller('admin/coupons')
export class CouponsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { usages: true } } },
    });
  }

  @Post()
  async create(@Body() dto: CreateCouponDto) {
    if (dto.discountType === 'PERCENTAGE' && dto.discountValue > 100) throw new BadRequestException('A percentage discount can be at most 100%');
    const code = dto.code.trim().toUpperCase();
    if (await this.prisma.coupon.findFirst({ where: { code: { equals: code, mode: 'insensitive' } } })) {
      throw new ConflictException(`A coupon with the code ${code} already exists`);
    }
    return this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        usageLimit: dto.usageLimit || null,
        perUserLimit: dto.perUserLimit || null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        description: dto.description?.trim() || null,
        isActive: true,
      },
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit || null } : {}),
        ...(dto.perUserLimit !== undefined ? { perUserLimit: dto.perUserLimit || null } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      },
    });
  }

  /** A coupon already used on orders is switched off, not deleted: the orders still point to it. */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const used = await this.prisma.order.count({ where: { couponId: id } });
    if (used) {
      await this.prisma.coupon.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true, reason: `Used on ${used} order(s), so it was switched off instead` };
    }
    await this.prisma.cart.updateMany({ where: { couponId: id }, data: { couponId: null } });
    await this.prisma.couponUsage.deleteMany({ where: { couponId: id } });
    await this.prisma.coupon.delete({ where: { id } });
    return { deleted: true };
  }
}
