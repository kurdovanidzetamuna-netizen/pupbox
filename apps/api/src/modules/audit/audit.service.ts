import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(opts: {
    adminUserId?: string;
    action: string;
    module: string;
    entityId?: string;
    entityType?: string;
    before?: any;
    after?: any;
    ip?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminUserId: opts.adminUserId || null,
          action: opts.action as any,
          module: opts.module,
          entityId: opts.entityId,
          entityType: opts.entityType,
          before: opts.before || undefined,
          after: opts.after || undefined,
          ip: opts.ip,
        },
      });
    } catch {
      // audit logs must never crash the main request
    }
  }

  async list(page = 1, limit = 50, module?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (module) where.module = module;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { adminUser: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, limit };
  }
}
