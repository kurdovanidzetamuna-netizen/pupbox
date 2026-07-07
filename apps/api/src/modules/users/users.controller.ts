import { Controller, Get, Patch, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

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
  async updateProfile(@Request() req, @Body() body: { firstName?: string; lastName?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: { firstName: body.firstName, lastName: body.lastName, phone: body.phone },
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
    return this.prisma.user.findMany({
      where: ({
        isAdmin: false,
        ...(status ? { status: status as any } : {}),
        ...(search ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      } as any),
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
