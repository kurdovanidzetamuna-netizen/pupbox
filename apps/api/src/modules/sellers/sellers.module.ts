import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Module, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { PUBLIC_SELLER } from './sellers';

const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const orNull = (v?: string | null) => (v && v.trim() ? v.trim() : null);

class SellerDto {
  @Trim() @IsString() @MaxLength(80) name: string;
  @Trim() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug: small latin letters, numbers and dashes' }) @MaxLength(80) slug: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsString() @MaxLength(300) descriptionKa?: string;
  @IsOptional() @IsString() @MaxLength(80) contactName?: string;
  @IsOptional() @ValidateIf((_, v) => !!v) @IsEmail({}, { message: 'Enter a valid email' }) email?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

const data = (d: SellerDto) => ({
  name: d.name, slug: d.slug, logoUrl: orNull(d.logoUrl), description: orNull(d.description),
  translations: d.descriptionKa !== undefined ? { ka: { description: d.descriptionKa.trim() } } : undefined,
  contactName: orNull(d.contactName), email: orNull(d.email), phone: orNull(d.phone), notes: orNull(d.notes),
  ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
});

/** Sellers for the shop's filter: active ones that have something on sale. */
@ApiTags('sellers')
@Controller('sellers')
class SellersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.seller.findMany({
      where: { isActive: true, deletedAt: null, products: { some: { deletedAt: null, status: { in: ['ACTIVE', 'OUT_OF_STOCK'] }, standaloneSale: true } } },
      orderBy: { name: 'asc' },
      select: PUBLIC_SELLER,
    });
  }
}

/** Admin: the sellers we sell for — who they are and how to reach them. */
@ApiTags('Admin - Sellers')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'sellers.view', write: 'sellers.manage' })
@Controller('admin/sellers')
class AdminSellersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.seller.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    });
  }

  @Post()
  async create(@Body() dto: SellerDto) {
    if (await this.prisma.seller.findUnique({ where: { slug: dto.slug } })) throw new ConflictException('A seller with this slug already exists');
    return this.prisma.seller.create({ data: data(dto) as any });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: SellerDto) {
    const s = await this.prisma.seller.findFirst({ where: { id, deletedAt: null } });
    if (!s) throw new NotFoundException('Seller not found');
    const clash = await this.prisma.seller.findUnique({ where: { slug: dto.slug } });
    if (clash && clash.id !== id) throw new ConflictException('A seller with this slug already exists');
    return this.prisma.seller.update({ where: { id }, data: data(dto) as any });
  }

  /** Only a seller with no products can go; otherwise switch it off. */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const count = await this.prisma.product.count({ where: { sellerId: id, deletedAt: null } });
    if (count) throw new BadRequestException(`This seller still has ${count} product(s). Move them to another seller or switch the seller off instead.`);
    await this.prisma.seller.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { ok: true };
  }
}

@Module({ controllers: [SellersController, AdminSellersController] })
export class SellersModule {}
