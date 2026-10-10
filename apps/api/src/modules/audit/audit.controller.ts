import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AuditService } from './audit.service';
import { AdminPerms } from '../admin-auth/admin-permissions';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'admin.manage', write: 'admin.manage' })
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query('page') page = '1', @Query('limit') limit = '50', @Query('module') module?: string) {
    return this.auditService.list(+page, +limit, module);
  }
}
