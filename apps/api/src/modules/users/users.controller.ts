import { Controller, Get, Patch, Post, Delete, Body, UseGuards, Request, Param, Query, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { customerRows, customersCsv, type CustomerQuery } from './customer-list';
import { normalisePhone } from '../auth/verification';
import { consentUpdate } from './consent';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AuditService } from '../audit/audit.service';

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
  phoneVerifiedAt: true,
  phoneVerifiedVia: true,
  marketingConsent: true,
  marketingEmail: true,
  marketingSms: true,
  createdAt: true,
  // The customer's own dogs; a friend's dog from a gift lives with that plan.
  dogs: { where: { deletedAt: null, forGift: false } },
  addresses: { where: { deletedAt: null } },
} satisfies Prisma.UserSelect;

class VerifyDto {
  @IsIn(['PHONE', 'EMAIL']) channel: 'PHONE' | 'EMAIL';
  @IsBoolean() verified: boolean;
}

class NoteDto {
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
}

class TagsDto {
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(30, { each: true }) tags!: string[];
}

class CustomerStatusDto {
  @IsIn(['ACTIVE', 'BLOCKED', 'UNVERIFIED']) status: 'ACTIVE' | 'BLOCKED' | 'UNVERIFIED';
}

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  /** Follows the site's language switch; emails are written in it. */
  @IsOptional() @IsIn(['ka', 'en']) language?: 'ka' | 'en';
  /** Offers and reminders, per channel: can be given or withdrawn any time. */
  @IsOptional() @IsBoolean() marketingEmail?: boolean;
  @IsOptional() @IsBoolean() marketingSms?: boolean;
  /** Older clients: one switch for both channels. */
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
      this.prisma.dog.findMany({ where: { userId: id, deletedAt: null }, select: { name: true, breed: true, birthday: true, gender: true, size: true, weightKg: true, allergies: true, toyPreferences: true, foodPreferences: true, chewingStrength: true, likedCategoryIds: true, specialNotes: true, photoUrl: true, forGift: true } }),
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
    const current = await this.prisma.user.findUnique({ where: { id: req.user.id }, select: { phone: true, marketingEmail: true, marketingSms: true } });
    let phone: string | undefined;
    if (body.phone !== undefined) {
      const p = normalisePhone(body.phone);
      if (!p) throw new BadRequestException('Enter a valid mobile number');
      phone = p;
    }
    // A new number only takes over once its SMS code is entered
    // (POST /auth/phone/change/send → /verify), never straight from here.
    if (phone !== undefined && phone !== current?.phone) {
      throw new BadRequestException('Confirm your new number with the code we text you.');
    }
    const email = body.marketingEmail ?? body.marketingConsent;
    const sms = body.marketingSms ?? body.marketingConsent;
    const consent = email !== undefined || sms !== undefined ? consentUpdate(current!, { email, sms }) : {};
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: body.firstName, lastName: body.lastName, language: body.language,
        ...consent,
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
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** The list: filters, sorting and paging, with spend, plan and city per customer. */
  @Get()
  @ApiOperation({ summary: 'List customers' })
  list(@Query() q: CustomerQuery) {
    return customerRows(this.prisma, q);
  }

  /** The same filtered list as a spreadsheet (contact details: needs "Export CRM lists"). */
  @Get('export.csv')
  @AdminPerms({ read: 'crm.export' })
  @ApiOperation({ summary: 'Customers as CSV' })
  async exportCsv(@Res() res: Response, @Query() q: CustomerQuery) {
    const { rows } = await customerRows(this.prisma, q, true);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(customersCsv(rows));
  }

  /** One customer with everything the team needs: dogs (with photos), plans, orders, consent. */
  @Get(':id')
  @ApiOperation({ summary: 'One customer in full' })
  async detail(@Param('id') id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, status: true, language: true, referralCode: true, createdAt: true,
        emailVerified: true, phoneVerified: true, phoneVerifiedAt: true, phoneVerifiedVia: true, marketingConsent: true, marketingConsentAt: true,
        marketingEmail: true, marketingSms: true, marketingEmailAt: true, marketingSmsAt: true,
        dogs: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        addresses: { where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, phone: true, city: true, addressLine1: true, addressLine2: true, isDefault: true, isGift: true, label: true } },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, isGift: true, startDate: true, endDate: true, boxesTotal: true, boxesDelivered: true, autoRenewal: true, cancelledAt: true, plan: { select: { name: true } }, dog: { select: { name: true } } },
        },
        orders: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, orderNumber: true, type: true, status: true, total: true, createdAt: true, isGift: true } },
        referralsSent: { select: { status: true, rewardValue: true, createdAt: true, invited: { select: { email: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        referralsReceived: { select: { status: true, createdAt: true, inviter: { select: { id: true, email: true, firstName: true, lastName: true } } }, take: 1 },
        savedCards: { select: { id: true, brand: true, last4: true, expMonth: true, expYear: true, isDefault: true, createdAt: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
        couponUsages: { select: { usedAt: true, orderId: true, coupon: { select: { code: true } } }, orderBy: { usedAt: 'desc' }, take: 30 },
        customerNotes: { orderBy: { createdAt: 'desc' }, take: 100 },
        _count: { select: { pushSubscriptions: true } },
        lastLoginAt: true, crmTags: true,
      },
    });
    if (!user) throw new NotFoundException('Customer not found');
    const { rows } = await customerRows(this.prisma, { search: user.email }, true);
    const me = rows.find((r) => r.id === id);
    // What each promo code took off: the order's discount.
    const orderIds = user.couponUsages.map((u) => u.orderId).filter(Boolean) as string[];
    const discounts = orderIds.length ? await this.prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, discountAmount: true, orderNumber: true } }) : [];
    const { referralsSent, referralsReceived, customerNotes, couponUsages, _count, crmTags, ...rest } = user;
    return {
      ...rest,
      totalPaid: me?.spent ?? 0, refunded: me?.refunded ?? 0, paidOrders: me?.orders ?? 0, lastOrderAt: me?.lastOrderAt ?? null,
      averageOrder: me?.orders ? +((me.spent + me.refunded) / me.orders).toFixed(2) : 0,
      tags: crmTags, notes: customerNotes, pushDevices: _count.pushSubscriptions,
      referrals: referralsSent.length, referralsSent, invitedBy: referralsReceived[0]?.inviter ?? null,
      promoCodes: couponUsages.map((u) => {
        const o = discounts.find((d) => d.id === u.orderId);
        return { code: u.coupon.code, usedAt: u.usedAt, orderId: u.orderId, orderNumber: o?.orderNumber ?? null, discount: Number(o?.discountAmount ?? 0) };
      }),
    };
  }

  /**
   * Confirm (or un-confirm) a customer's phone or email by hand — e.g. they
   * called from that number. Kept in the audit log with who did it.
   */
  @Patch(':id/verify')
  @ApiOperation({ summary: 'Mark a phone or email as confirmed, or not' })
  async verify(@Param('id') id: string, @Body() body: VerifyDto, @Request() req: any) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: { phone: true, phoneVerified: true, emailVerified: true, status: true } });
    if (!user) throw new NotFoundException('Customer not found');
    const data: Prisma.UserUpdateInput = {};
    if (body.channel === 'PHONE') {
      if (body.verified) {
        if (!user.phone) throw new BadRequestException('This customer has no phone number.');
        const taken = await this.prisma.user.findFirst({ where: { id: { not: id }, phone: user.phone, phoneVerified: true, deletedAt: null }, select: { email: true } });
        if (taken) throw new BadRequestException(`This number is already confirmed on another account (${taken.email}).`);
      }
      Object.assign(data, body.verified ? { phoneVerified: true, phoneVerifiedAt: new Date(), phoneVerifiedVia: 'ADMIN' } : { phoneVerified: false, phoneVerifiedAt: null, phoneVerifiedVia: null });
    } else {
      data.emailVerified = body.verified;
    }
    const phoneOk = body.channel === 'PHONE' ? body.verified : user.phoneVerified;
    const emailOk = body.channel === 'EMAIL' ? body.verified : user.emailVerified;
    if (phoneOk && emailOk && user.status === 'UNVERIFIED') data.status = 'ACTIVE';
    const updated = await this.prisma.user.update({ where: { id }, data, select: { id: true, status: true, emailVerified: true, phoneVerified: true, phoneVerifiedAt: true, phoneVerifiedVia: true } });
    await this.audit.log({ adminUserId: req.user?.id, action: 'UPDATE', module: 'customers', entityType: 'User', entityId: id,
      before: { [body.channel === 'PHONE' ? 'phoneVerified' : 'emailVerified']: body.channel === 'PHONE' ? user.phoneVerified : user.emailVerified },
      after: { [body.channel === 'PHONE' ? 'phoneVerified' : 'emailVerified']: body.verified, by: 'admin' } });
    return updated;
  }

  /** A note from the team about this customer (a call, a wish, a complaint). */
  @Post(':id/notes')
  @AdminPerms({ write: ['crm.manage', 'users.block'] })
  async addNote(@Param('id') id: string, @Body() dto: NoteDto, @Request() req: any) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!user) throw new NotFoundException('Customer not found');
    const admin = await this.prisma.adminUser.findUnique({ where: { id: req.user?.id }, select: { firstName: true, lastName: true, email: true } }).catch(() => null);
    return this.prisma.customerNote.create({
      data: { userId: id, body: dto.body.trim(), adminUserId: req.user?.id ?? null, adminName: admin ? ([admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email) : null },
    });
  }

  @Delete(':id/notes/:noteId')
  @AdminPerms({ write: ['crm.manage', 'users.block'] })
  async deleteNote(@Param('id') id: string, @Param('noteId') noteId: string) {
    const { count } = await this.prisma.customerNote.deleteMany({ where: { id: noteId, userId: id } });
    if (!count) throw new NotFoundException('Note not found');
    return { ok: true };
  }

  /** The team's labels for this customer (VIP, wholesale…), used to filter the list. */
  @Patch(':id/tags')
  @AdminPerms({ write: ['crm.manage', 'users.block'] })
  async setTags(@Param('id') id: string, @Body() dto: TagsDto) {
    const tags = [...new Set(dto.tags.map((t) => t.trim()).filter(Boolean))];
    return this.prisma.user.update({ where: { id }, data: { crmTags: tags }, select: { id: true, crmTags: true } });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Block or unblock a customer' })
  async setStatus(@Param('id') id: string, @Body() body: CustomerStatusDto) {
    return this.prisma.user.update({ where: { id }, data: { status: body.status as any }, select: { id: true, status: true } });
  }
}
