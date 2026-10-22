import { Controller, Get, Post, Put, Body, UseGuards, Request, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { toCsv } from '../reports/reports.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ReferralsService, type ReferralFilters } from './referrals.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AuditService } from '../audit/audit.service';

@ApiTags('referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService, private audit: AuditService) {}

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyReferrals(@Request() req: any) {
    return this.referralsService.getMyReferrals(req.user.id);
  }

  @Post('apply')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  applyCode(@Request() req: any, @Body('code') code: string) {
    return this.referralsService.applyReferralCode(req.user.id, code);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'users.view' })
  adminList(@Query('page') page = '1', @Query('limit') limit = '20', @Query() f: ReferralFilters) {
    return this.referralsService.adminList(+page, +limit, f);
  }

  /** The friend-code offer (what the friend and the inviter get) and its numbers. */
  @Get('admin/offer')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'coupons.manage' })
  adminOffer() {
    return this.referralsService.adminOffer();
  }

  @Put('admin/offer')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'coupons.manage' })
  async saveOffer(@Body() body: Record<string, any>, @Request() req: any) {
    const before = await this.referralsService.adminOffer();
    const after = await this.referralsService.saveAdminOffer(body);
    await this.audit.log({ adminUserId: req.user?.id, action: 'UPDATE', module: 'coupons', entityType: 'ReferralOffer', entityId: 'referral', before: before.offer, after: after.offer });
    return after;
  }

  @Get('admin/stats')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'users.view' })
  adminStats() {
    return this.referralsService.adminStats();
  }

  /** The filtered list as a spreadsheet. */
  @Get('admin/export.csv')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'users.view' })
  async adminCsv(@Res() res: Response, @Query() f: ReferralFilters) {
    const day = (d?: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    const name = (u?: { firstName?: string | null; lastName?: string | null } | null) => [u?.firstName, u?.lastName].filter(Boolean).join(' ');
    const rows = (await this.referralsService.adminExport(f)).map((r) => ({
      date: day(r.createdAt),
      inviter: name(r.inviter),
      inviter_email: r.inviter?.email ?? '',
      code: r.inviter?.referralCode ?? '',
      friend: name(r.invited),
      friend_email: r.invited?.email ?? '',
      stage: r.stage,
      reward_gel: r.rewardValue ?? '',
      rewarded_on: day(r.rewardedAt),
    }));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="referrals.csv"');
    res.send(toCsv(rows));
  }
}
