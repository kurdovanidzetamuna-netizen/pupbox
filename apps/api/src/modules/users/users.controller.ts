import { Controller, Get, Patch, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  referralCode: true,
  status: true,
  createdAt: true,
  dogs: true,
  addresses: { where: { deletedAt: null } },
};

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  /** Follows the site's language switch; emails are written in it. */
  @IsOptional() @IsIn(['ka', 'en']) language?: 'ka' | 'en';
}

@ApiTags('Customer Profile')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req) {
    return this.prisma.user.findUnique({ where: { id: req.user.id }, select: USER_SELECT });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: { firstName: body.firstName, lastName: body.lastName, phone: body.phone, language: body.language },
      select: USER_SELECT,
    });
  }
}

@ApiTags('Admin — Customers')
@ApiBearerAuth()
@UseGuards(AuthGuard('admin-jwt'))
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  async list(@Query('search') search?: string, @Query('status') status?: string) {
    // Every User row is a customer — admins live in the separate AdminUser
    // model, so there is no isAdmin column to filter on. Querying one threw
    // PrismaClientValidationError and this endpoint returned 500 every time;
    // the `as any` on the where clause is what stopped the compiler saying so.
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(status && status in UserStatus ? { status: status as UserStatus } : {}),
      ...(search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, referralCode: true, createdAt: true, _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Block or unblock a customer' })
  async setStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.prisma.user.update({ where: { id }, data: { status: body.status as any }, select: { id: true, status: true } });
  }
}
