import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

class AddressDto {
  @IsOptional() @Trim() @IsString() @MaxLength(40) label?: string;
  @Trim() @IsString() @IsNotEmpty({ message: 'First name is required' }) @MaxLength(80) firstName: string;
  @Trim() @IsString() @IsNotEmpty({ message: 'Last name is required' }) @MaxLength(80) lastName: string;
  @Trim() @IsString() @Matches(/^\+?[0-9\s()-]{7,20}$/, { message: 'Enter a valid phone number' }) phone: string;
  @Trim() @IsString() @IsNotEmpty({ message: 'City is required' }) @MaxLength(80) city: string;
  @Trim() @IsString() @IsNotEmpty({ message: 'Address is required' }) @MaxLength(200) addressLine1: string;
  @IsOptional() @Trim() @IsString() @MaxLength(200) addressLine2?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  /** The map pin (Georgia and around; null clears it), so the courier finds the door. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsNumber() @Min(35) @Max(48) latitude?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsNumber() @Min(36) @Max(52) longitude?: number;
}
class UpdateAddressDto extends PartialType(AddressDto) {}

const SELECT = { id: true, label: true, firstName: true, lastName: true, phone: true, city: true, addressLine1: true, addressLine2: true, latitude: true, longitude: true, isDefault: true } as const;

/** The customer's saved delivery addresses: list, add, edit, remove, choose the default. */
@ApiTags('My Addresses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me/addresses')
export class AddressesController {
  constructor(private prisma: PrismaService) {}

  private async own(id: string, userId: string) {
    const a = await this.prisma.address.findFirst({ where: { id, userId, deletedAt: null }, select: { id: true, isDefault: true } });
    if (!a) throw new NotFoundException('Address not found');
    return a;
  }

  @Get()
  list(@Request() req: any) {
    return this.prisma.address.findMany({ where: { userId: req.user.id, deletedAt: null }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }], select: SELECT });
  }

  @Post()
  async create(@Request() req: any, @Body() dto: AddressDto) {
    const userId = req.user.id;
    // The first address is the default; asking for default moves it here.
    const count = await this.prisma.address.count({ where: { userId, deletedAt: null } });
    const isDefault = dto.isDefault === true || count === 0;
    if (isDefault) await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.address.create({ data: { ...dto, addressLine2: dto.addressLine2 || null, label: dto.label || null, userId, isDefault }, select: SELECT });
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    await this.own(id, req.user.id);
    if (dto.isDefault === true) await this.prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    const { isDefault, ...rest } = dto;
    return this.prisma.address.update({ where: { id }, data: { ...rest, ...(isDefault === true ? { isDefault: true } : {}) }, select: SELECT });
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const a = await this.own(id, req.user.id);
    // Boxes of a running plan go here: change the plan's address first.
    const inUse = await this.prisma.customerSubscription.count({ where: { addressId: id, status: { in: ['ACTIVE', 'PAUSED', 'PENDING'] } } });
    if (inUse) throw new BadRequestException('A plan delivers to this address. Change the plan’s address first.');
    await this.prisma.address.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
    if (a.isDefault) {
      const next = await this.prisma.address.findFirst({ where: { userId: req.user.id, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true } });
      if (next) await this.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return { ok: true };
  }
}
