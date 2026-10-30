import { Module, Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AuditService } from '../audit/audit.service';

class DeliveryDto {
  @IsString() @MinLength(1) @MaxLength(60) name: string;
  @IsOptional() @IsString() @MaxLength(60) nameKa?: string;
  @IsOptional() @IsString() @MaxLength(160) description?: string;
  @IsOptional() @IsString() @MaxLength(160) descriptionKa?: string;
  @Type(() => Number) @IsNumber() @Min(0) @Max(1000) price: number;
  /** Free when the basket comes to at least this; empty = never free. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100000) freeThreshold?: number | null;
  /** "1", "3-5", or empty. */
  @IsOptional() @IsString() @Matches(/^(\d{1,2}(-\d{1,2})?)?$/, { message: 'Delivery days: a number like 2, or a range like 3-5.' }) estimatedDays?: string;
  @IsBoolean() isActive: boolean;
}
class OrderDto { @IsArray() @IsString({ each: true }) ids: string[]; }

const ka = (t: any) => (t && typeof t === 'object' ? t.ka ?? {} : {});

/**
 * Admin → Delivery: the delivery options customers choose at checkout —
 * names in both languages, price, free above an amount, how many days, on
 * or off, and their order. One option must stay on, or nobody could check
 * out. An option already used by orders can be switched off but not deleted.
 */
@ApiTags('Admin — Delivery')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'cms.view', write: 'cms.edit' })
@Controller('admin/delivery')
class AdminDeliveryController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get()
  async list() {
    const rows = await this.prisma.deliveryMethod.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { _count: { select: { orders: true } } } });
    return rows.map(({ _count, translations, ...m }) => ({
      ...m, price: Number(m.price), freeThreshold: m.freeThreshold == null ? null : Number(m.freeThreshold),
      nameKa: ka(translations).name ?? '', descriptionKa: ka(translations).description ?? '', orders: _count.orders,
    }));
  }

  private data(b: DeliveryDto) {
    return {
      name: b.name.trim(), description: b.description?.trim() || null,
      price: b.price, freeThreshold: b.freeThreshold == null || (b.freeThreshold as any) === '' ? null : b.freeThreshold,
      estimatedDays: b.estimatedDays?.trim() || null, isActive: b.isActive,
      translations: { ka: { name: b.nameKa?.trim() || undefined, description: b.descriptionKa?.trim() || undefined } },
    };
  }

  /** Switching off (or deleting) the last option that's on would stop checkout. */
  private async keepOneOn(exceptId: string) {
    const others = await this.prisma.deliveryMethod.count({ where: { isActive: true, id: { not: exceptId } } });
    if (!others) throw new BadRequestException('Keep at least one delivery option on — customers need one to check out.');
  }

  @Post()
  async create(@Body() b: DeliveryDto, @Req() req: any) {
    const last = await this.prisma.deliveryMethod.aggregate({ _max: { sortOrder: true } });
    const m = await this.prisma.deliveryMethod.create({ data: { ...this.data(b), sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    await this.audit.log({ adminUserId: req.user?.id, action: 'CREATE', module: 'settings', entityType: 'DeliveryMethod', entityId: m.id, after: m });
    return this.list();
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() b: DeliveryDto, @Req() req: any) {
    const before = await this.prisma.deliveryMethod.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Delivery option not found');
    if (before.isActive && !b.isActive) await this.keepOneOn(id);
    const after = await this.prisma.deliveryMethod.update({ where: { id }, data: this.data(b) });
    await this.audit.log({ adminUserId: req.user?.id, action: 'UPDATE', module: 'settings', entityType: 'DeliveryMethod', entityId: id, before, after });
    return this.list();
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const m = await this.prisma.deliveryMethod.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
    if (!m) throw new NotFoundException('Delivery option not found');
    if (m._count.orders) throw new BadRequestException(`${m._count.orders} order${m._count.orders === 1 ? '' : 's'} used this option, so it can’t be deleted. Switch it off instead.`);
    if (m.isActive) await this.keepOneOn(id);
    await this.prisma.deliveryZone.deleteMany({ where: { methodId: id } });
    await this.prisma.deliveryMethod.delete({ where: { id } });
    await this.audit.log({ adminUserId: req.user?.id, action: 'DELETE', module: 'settings', entityType: 'DeliveryMethod', entityId: id, before: m });
    return this.list();
  }

  /** The order they're listed in at checkout. */
  @Put('order/all')
  async reorder(@Body() b: OrderDto) {
    await this.prisma.$transaction(b.ids.map((id, i) => this.prisma.deliveryMethod.update({ where: { id }, data: { sortOrder: i + 1 } })));
    return this.list();
  }
}

@Module({ controllers: [AdminDeliveryController] })
export class DeliveryModule {}
