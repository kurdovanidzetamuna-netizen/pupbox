import { Controller, Get, Patch, Body, UseGuards, Request, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { normalisePhone } from '../auth/verification';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  referralCode: true,
  status: true,
  emailVerified: true,
  phoneVerified: true,
  marketingConsent: true,
  createdAt: true,
  // The customer's own dogs; a friend's dog from a gift lives with that plan.
  dogs: { where: { deletedAt: null, forGift: false } },
  addresses: { where: { deletedAt: null } },
} satisfies Prisma.UserSelect;

class CustomerStatusDto {
  @IsIn(['ACTIVE', 'BLOCKED', 'UNVERIFIED']) status: 'ACTIVE' | 'BLOCKED' | 'UNVERIFIED';
}

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  /** Follows the site's language switch; emails are written in it. */
  @IsOptional() @IsIn(['ka', 'en']) language?: 'ka' | 'en';
  /** "Send me offers and reminders": can be given or withdrawn any time. */
  @IsOptional() @IsBoolean() marketingConsent?: boolean;
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

  /**
   * Everything we hold about the customer, as one JSON file — the "give you
   * a copy" promised in the privacy policy. No password hash, no internal notes.
   */
  @Get('me/export')
  @ApiOperation({ summary: 'Download a copy of my data' })
  async exportMyData(@Request() req) {
    const id = req.user.id;
    const [profile, addresses, dogs, orders, subscriptions] = await Promise.all([
      this.prisma.user.findUnique({ where: { id }, select: { email: true, firstName: true, lastName: true, phone: true, language: true, referralCode: true, emailVerified: true, phoneVerified: true, marketingConsent: true, marketingConsentAt: true, createdAt: true } }),
      this.prisma.address.findMany({ where: { userId: id, deletedAt: null }, select: { firstName: true, lastName: true, phone: true, city: true, addressLine1: true, addressLine2: true, postalCode: true, createdAt: true } }),
      this.prisma.dog.findMany({ where: { userId: id, deletedAt: null }, select: { name: true, breed: true, birthday: true, gender: true, size: true, weightKg: true, allergies: true, toyPreferences: true, foodPreferences: true, chewingStrength: true, specialNotes: true, photoUrl: true, forGift: true } }),
      this.prisma.order.findMany({
        where: { userId: id }, orderBy: { createdAt: 'desc' },
        select: {
          id: true, type: true, status: true, total: true, deliveryCost: true, discountAmount: true, createdAt: true, shippedAt: true, deliveredAt: true,
          isGift: true, giftRecipientName: true, giftRecipientEmail: true, giftMessage: true,
          items: { select: { name: true, quantity: true, price: true, personalisation: true } },
          payments: { select: { status: true, amount: true, paidAt: true, refunds: { select: { amount: true, createdAt: true } } } },
        },
      }),
      this.prisma.customerSubscription.findMany({
        where: { userId: id },
        select: {
          status: true, startDate: true, endDate: true, autoRenewal: true, boxesTotal: true, boxesDelivered: true, cancelledAt: true,
          plan: { select: { name: true } },
          shipments: { select: { year: true, month: true, boxNumber: true, status: true, trackingNumber: true } },
        },
      }),
    ]);
    return { exportedAt: new Date().toISOString(), profile, addresses, dogs, orders, subscriptions };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    const current = await this.prisma.user.findUnique({ where: { id: req.user.id }, select: { phone: true, marketingConsent: true } });
    let phone: string | undefined;
    if (body.phone !== undefined) {
      const p = normalisePhone(body.phone);
      if (!p) throw new BadRequestException('Enter a Georgian mobile number, e.g. 599 12 34 56');
      phone = p;
    }
    // A new number has to be confirmed again with an SMS code.
    const phoneChanged = phone !== undefined && phone !== current?.phone;
    const consentChanged = body.marketingConsent !== undefined && body.marketingConsent !== current?.marketingConsent;
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: body.firstName, lastName: body.lastName, language: body.language,
        ...(phoneChanged ? { phone, phoneVerified: false } : {}),
        ...(consentChanged ? { marketingConsent: body.marketingConsent, marketingConsentAt: body.marketingConsent ? new Date() : null } : {}),
      },
      select: USER_SELECT,
    });
  }
}

@ApiTags('Admin — Customers')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'users.view', write: 'users.block' })
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
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, status: true, referralCode: true, createdAt: true,
        emailVerified: true, phoneVerified: true, marketingConsent: true,
        _count: { select: { orders: true, dogs: { where: { deletedAt: null, forGift: false } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** One customer with everything the team needs: dogs (with photos), plans, orders, consent. */
  @Get(':id')
  @ApiOperation({ summary: 'One customer in full' })
  async detail(@Param('id') id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, status: true, language: true, referralCode: true, createdAt: true,
        emailVerified: true, phoneVerified: true, marketingConsent: true, marketingConsentAt: true,
        dogs: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        addresses: { where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, phone: true, city: true, addressLine1: true, addressLine2: true, isDefault: true } },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, isGift: true, startDate: true, endDate: true, boxesTotal: true, boxesDelivered: true, autoRenewal: true, cancelledAt: true, plan: { select: { name: true } }, dog: { select: { name: true } } },
        },
        orders: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, orderNumber: true, type: true, status: true, total: true, createdAt: true, isGift: true } },
        referralsSent: { select: { status: true } },
      },
    });
    if (!user) throw new NotFoundException('Customer not found');
    const spent = await this.prisma.payment.aggregate({ where: { userId: id, status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } }, _sum: { amount: true } });
    return { ...user, totalPaid: Number(spent._sum.amount ?? 0), referrals: user.referralsSent.length };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Block or unblock a customer' })
  async setStatus(@Param('id') id: string, @Body() body: CustomerStatusDto) {
    return this.prisma.user.update({ where: { id }, data: { status: body.status as any }, select: { id: true, status: true } });
  }
}
