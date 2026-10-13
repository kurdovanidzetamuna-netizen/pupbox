import { Body, Controller, Get, HttpCode, Module, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';

class SubscribeDto {
  @IsEmail() @MaxLength(200) email: string;
  @IsOptional() @IsIn(['ka', 'en']) language?: 'ka' | 'en';
}

/**
 * The footer's newsletter box. Signing up twice is fine and answers the same
 * way, so the form can't be used to find out who is on the list.
 */
@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async subscribe(@Body() dto: SubscribeDto) {
    const email = dto.email.trim().toLowerCase();
    await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, language: dto.language ?? 'ka' },
      update: {},
    });
    return { ok: true };
  }

  /** Admin: everyone on the list, newest first. */
  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'users.view' })
  list() {
    return this.prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } });
  }
}

@Module({ controllers: [NewsletterController] })
export class NewsletterModule {}
