import { Controller, Get, Post, Param, UseGuards, Module } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { GiftsService } from './gifts.service';
import { AdminPerms } from '../admin-auth/admin-permissions';

@ApiTags('gifts')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'subscriptions.view', write: 'subscriptions.manage' })
@Controller('admin/gifts')
export class AdminGiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Gift plan counts for the dashboard' })
  summary() {
    return this.gifts.adminSummary();
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Re-send the "a gift is on its way" note to the friend' })
  resend(@Param('id') id: string) {
    return this.gifts.resend(id);
  }
}

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [AdminGiftsController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
