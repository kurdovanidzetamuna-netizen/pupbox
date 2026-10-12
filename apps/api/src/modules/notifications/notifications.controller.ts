import { Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PAGE = 20;
const SELECT = { id: true, type: true, data: true, link: true, readAt: true, createdAt: true } as const;

/** The customer's notification centre: list, unread count, mark read, remove. */
@ApiTags('My Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me/notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  /**
   * Newest first, 20 at a time; pass the last id as `before` for the next page.
   * `types` (comma-separated) keeps only those kinds, so a filter pages
   * through all of them rather than just the first 20 loaded.
   */
  @Get()
  async list(@Request() req: any, @Query('before') before?: string, @Query('unread') unread?: string, @Query('types') types?: string) {
    const userId = req.user.id;
    const only = (types ?? '').split(',').filter((x): x is NotificationType => x in NotificationType);
    const cursor = before ? await this.prisma.notification.findFirst({ where: { id: before, userId }, select: { createdAt: true } }) : null;
    const items = await this.prisma.notification.findMany({
      where: { userId, ...(unread === '1' ? { readAt: null } : {}), ...(only.length ? { type: { in: only } } : {}), ...(cursor ? { createdAt: { lt: cursor.createdAt } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: PAGE + 1,
      select: SELECT,
    });
    const unreadCount = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { items: items.slice(0, PAGE), hasMore: items.length > PAGE, unreadCount };
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    return { unreadCount: await this.prisma.notification.count({ where: { userId: req.user.id, readAt: null } }) };
  }

  @Post('read-all')
  @HttpCode(200)
  async readAll(@Request() req: any) {
    await this.prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    return { unreadCount: 0 };
  }

  @Post(':id/read')
  @HttpCode(200)
  async read(@Request() req: any, @Param('id') id: string) {
    const { count } = await this.prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { readAt: new Date() } });
    if (!count) throw new NotFoundException('Notification not found');
    return this.unreadCount(req);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const { count } = await this.prisma.notification.deleteMany({ where: { id, userId: req.user.id } });
    if (!count) throw new NotFoundException('Notification not found');
    return this.unreadCount(req);
  }
}
