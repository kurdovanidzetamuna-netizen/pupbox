import { Module, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, PartialType } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsBoolean, IsArray, IsNumber, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';

class CreateTierDto {
  @IsString() name: string;
  @IsString() @Matches(/^[a-z0-9-]+$/) slug: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) highlights?: string[];
  @Type(() => Number) @IsInt() @Min(1) itemCount: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetMin?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetMax?: number | null;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @IsOptional() translations?: Record<string, any>;
}
class UpdateTierDto extends PartialType(CreateTierDto) {}

// What the site needs of a plan inside a tier.
const PLAN_FIELDS = {
  id: true, name: true, slug: true, translations: true, durationValue: true, durationUnit: true, boxCount: true,
  price: true, discountPercent: true, monthlyEquivPrice: true, deliveryIncluded: true, giftable: true, badge: true, sortOrder: true,
} as const;

@Injectable()
export class BoxTiersService {
  constructor(private prisma: PrismaService) {}

  /** The site: active tiers, each with its active plans, shortest first. */
  listPublic() {
    return this.prisma.boxTier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        plans: {
          where: { isActive: true, deletedAt: null, isCustomBox: false },
          orderBy: [{ durationValue: 'asc' }, { sortOrder: 'asc' }],
          select: PLAN_FIELDS,
        },
      },
    });
  }

  /** Admin: every tier with its plans (any state) and how many people are on each. */
  async listAdmin() {
    const tiers = await this.prisma.boxTier.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { plans: { where: { deletedAt: null }, orderBy: { durationValue: 'asc' }, select: { ...PLAN_FIELDS, isActive: true } } },
    });
    const counts = await this.prisma.customerSubscription.groupBy({
      by: ['planId'], where: { status: 'ACTIVE', plan: { tierId: { not: null } } }, _count: { _all: true },
    });
    const by = new Map(counts.map((c) => [c.planId, c._count._all]));
    return tiers.map((t) => ({ ...t, subscribers: t.plans.reduce((n, p) => n + (by.get(p.id) ?? 0), 0) }));
  }

  async create(dto: CreateTierDto) {
    if (await this.prisma.boxTier.findUnique({ where: { slug: dto.slug } })) throw new ConflictException('Slug already exists');
    this.checkBudget(dto);
    return this.prisma.boxTier.create({ data: dto as any });
  }

  async update(id: string, dto: UpdateTierDto) {
    const tier = await this.prisma.boxTier.findUnique({ where: { id } });
    if (!tier) throw new NotFoundException('Tier not found');
    if (dto.slug && dto.slug !== tier.slug && (await this.prisma.boxTier.findUnique({ where: { slug: dto.slug } }))) throw new ConflictException('Slug already exists');
    this.checkBudget({ budgetMin: dto.budgetMin ?? (tier.budgetMin as any), budgetMax: dto.budgetMax ?? (tier.budgetMax as any) });
    return this.prisma.boxTier.update({ where: { id }, data: dto as any });
  }

  /** Only an unused tier can go; one with plans is turned off instead. */
  async remove(id: string) {
    const plans = await this.prisma.subscriptionPlan.count({ where: { tierId: id, deletedAt: null } });
    if (plans) throw new BadRequestException('This box type still has plans. Move or delete them first, or turn the box type off.');
    return this.prisma.boxTier.delete({ where: { id } });
  }

  private checkBudget(d: { budgetMin?: number | null; budgetMax?: number | null }) {
    if (d.budgetMin != null && d.budgetMax != null && Number(d.budgetMin) > Number(d.budgetMax)) throw new BadRequestException('Budget "from" is more than "to"');
  }
}

@ApiTags('Box tiers')
@Controller('box-tiers')
class BoxTiersController {
  constructor(private service: BoxTiersService) {}
  @Get() @ApiOperation({ summary: 'Active box tiers with their plans' }) list() { return this.service.listPublic(); }
}

@ApiTags('Admin — Box tiers')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'subscriptions.view', write: 'subscriptions.manage' })
@Controller('admin/box-tiers')
class AdminBoxTiersController {
  constructor(private service: BoxTiersService) {}
  @Get() list() { return this.service.listAdmin(); }
  @Post() create(@Body() dto: CreateTierDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateTierDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}

@Module({
  providers: [BoxTiersService],
  controllers: [BoxTiersController, AdminBoxTiersController],
  exports: [BoxTiersService],
})
export class BoxTiersModule {}
