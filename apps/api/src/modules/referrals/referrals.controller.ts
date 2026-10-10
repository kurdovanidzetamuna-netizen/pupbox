import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ReferralsService } from './referrals.service';
import { AdminPerms } from '../admin-auth/admin-permissions';

@ApiTags('referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

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
  adminList(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.referralsService.adminList(+page, +limit);
  }
}
