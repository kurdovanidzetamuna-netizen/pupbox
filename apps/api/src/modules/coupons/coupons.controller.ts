import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin — Coupons')
@ApiBearerAuth()
@UseGuards(AuthGuard('admin-jwt'))
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
  create(@Body() body: {
    code: string;
    discountType: string;
    discountValue: number;
    usageLimit?: number;
    expiresAt?: string;
    description?: string;
  }) {
    return this.prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        discountType: body.discountType as any,
        discountValue: body.discountValue,
        usageLimit: body.usageLimit || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: true,
      } as any,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ isActive: boolean; usageLimit: number; expiresAt: string; description: string }>) {
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...body,
        expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(body.expiresAt) : null) : undefined,
      },
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.coupon.delete({ where: { id } });
  }
}
