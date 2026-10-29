import { Global, Module, Controller, Get, Post, Put, Body, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { SmsService } from './sms.service';
import { SmsNotify } from './sms-notify';
import { SmsReminders } from './sms-reminders';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { normalisePhone } from '../auth/verification';
import { AuditService } from '../audit/audit.service';
import { smsSettings, saveSmsSettings, maskKey, quietUntil, SMS_TEXTS } from './sms-settings';

class TestSmsDto {
  @IsString() @MaxLength(30) to: string;
}

/** Admin → Text messages: is SMS working, balance, settings, log, a test message. */
@ApiTags('Admin — SMS')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'cms.edit', write: 'cms.edit' })
@Controller('admin/sms')
class AdminSmsController {
  constructor(private sms: SmsService, private prisma: PrismaService, private audit: AuditService, private reminders: SmsReminders) {}

  /** Everything on the page; the API key only masked. */
  @Get('settings')
  async settings() {
    const s = await smsSettings(this.prisma);
    return { ...s, apiKey: maskKey(s.apiKey), quietNow: quietUntil(s.quiet), textDefaults: SMS_TEXTS };
  }

  @Put('settings')
  async save(@Body() body: Record<string, any>, @Req() req: any) {
    const before = await smsSettings(this.prisma);
    const s = await saveSmsSettings(this.prisma, body);
    const hide = (x: typeof s) => ({ ...x, apiKey: x.apiKey ? maskKey(x.apiKey) : '' });
    await this.audit.log({ adminUserId: req.user?.id, action: 'UPDATE', module: 'settings', entityType: 'SmsSettings', entityId: 'config-sms', before: hide(before), after: hide(s) });
    return { ...s, apiKey: maskKey(s.apiKey), quietNow: quietUntil(s.quiet), textDefaults: SMS_TEXTS };
  }

  @Get('status') status() { return this.sms.status(); }

  /** The latest messages: when, to whom, why, and whether they went (codes masked). */
  @Get('log')
  log(@Query('limit') limit = '30', @Query('kind') kind?: string) {
    return this.prisma.smsLog.findMany({ where: kind ? { kind } : {}, orderBy: { createdAt: 'desc' }, take: Math.min(100, Math.max(1, +limit || 30)) });
  }

  /** Sends the scheduled texts that are due now, without waiting for the next run (every 5 minutes). */
  @Post('reminders/run')
  async runReminders() { return { sent: await this.reminders.run() }; }

  @Post('test')
  async test(@Body() dto: TestSmsDto) {
    const to = normalisePhone(dto.to);
    if (!to) throw new BadRequestException('Enter a valid mobile number, e.g. +995 599 12 34 56');
    await this.sms.send(to, 'Pupbox: test message — SMS is working. / სატესტო შეტყობინება — SMS მუშაობს.', { kind: 'TEST' });
    return { sent: true, to };
  }
}

@Global()
@Module({
  controllers: [AdminSmsController],
  providers: [SmsService, SmsNotify, SmsReminders],
  exports: [SmsService, SmsNotify],
})
export class SmsModule {}
