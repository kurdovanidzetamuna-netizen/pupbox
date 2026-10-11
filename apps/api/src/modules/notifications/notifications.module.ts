import { Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsController } from './notifications.controller';

/** Notifications older than this are cleared away (read or not). */
const KEEP_DAYS = 180;

@Injectable()
export class NotificationsCleanup implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsCleanup.name);
  private timer?: NodeJS.Timeout;
  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const run = () =>
      this.prisma.notification
        .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } } })
        .then(({ count }) => { if (count) this.logger.log(`Cleared ${count} old notification(s)`); })
        .catch((e) => this.logger.error(`Notification cleanup failed: ${e.message}`));
    setTimeout(run, 40_000).unref();
    this.timer = setInterval(run, 24 * 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsCleanup],
})
export class NotificationsModule {}
