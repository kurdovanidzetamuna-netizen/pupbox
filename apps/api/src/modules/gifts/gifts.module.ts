import { Controller, Get, Post, Param, Body, Query, UseGuards, Request, Module } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { GiftsService } from './gifts.service';

@ApiTags('gifts')
@Controller('gifts')
export class GiftsController {
  constructor(private readonly gifts: GiftsService) {}

  /**
   * Public: what the claim page shows before sign-in. The token is the only
   * credential, so this returns nothing sensitive about the buyer.
   */
  @Get(':token')
  @ApiOperation({ summary: 'Preview a gifted subscription from its claim token' })
  preview(@Param('token') token: string) {
    return this.gifts.preview(token);
  }

  /** Requires sign-in: the recipient needs an account to manage the subscription afterwards. */
  @Post(':token/claim')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Claim a gifted subscription, attaching a dog and address' })
  claim(@Request() req: any, @Param('token') token: string, @Body() body: any) {
    return this.gifts.claim(token, req.user.id, body);
  }
}

@ApiTags('gifts')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/gifts')
export class AdminGiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List gifts, oldest unclaimed first' })
  @ApiQuery({ name: 'claimed', required: false, enum: ['true', 'false'] })
  list(@Query('claimed') claimed?: string) {
    return this.gifts.adminList(claimed === undefined ? undefined : claimed === 'true');
  }

  @Get('summary')
  @ApiOperation({ summary: 'Unclaimed gift counts and value for the dashboard' })
  summary() {
    return this.gifts.adminSummary();
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Re-send the gift card email' })
  resend(@Param('id') id: string) {
    return this.gifts.resend(id);
  }
}

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [GiftsController, AdminGiftsController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
