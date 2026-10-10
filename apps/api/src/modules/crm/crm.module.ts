import { Controller, Get, Module, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { CrmService, DogFilters } from './crm.service';

const SIZES = ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];

/** Query string → filters, ignoring anything malformed. */
function filters(q: Record<string, string | undefined>): DogFilters {
  const days = q.birthdayWithin !== undefined ? Number(q.birthdayWithin) : undefined;
  return {
    search: q.search?.trim().slice(0, 100) || undefined,
    size: q.size && SIZES.includes(q.size) ? q.size : undefined,
    breed: q.breed?.trim().slice(0, 60) || undefined,
    allergy: q.allergy?.trim().slice(0, 60) || undefined,
    plan: q.plan === 'active' || q.plan === 'none' || q.plan === 'ended' ? q.plan : undefined,
    consent: q.consent === 'yes' ? true : q.consent === 'no' ? false : undefined,
    birthdayWithin: days !== undefined && Number.isFinite(days) && days >= 0 && days <= 366 ? Math.floor(days) : undefined,
    hasPhoto: q.photo === 'yes' ? true : q.photo === 'no' ? false : undefined,
  };
}

@ApiTags('Admin — CRM')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'crm.view' })
@Controller('admin/crm')
class CrmController {
  constructor(private crm: CrmService) {}

  @Get('summary')
  summary() {
    return this.crm.summary();
  }

  @Get('dogs')
  dogs(@Query() q: Record<string, string>) {
    return this.crm.list(filters(q), Number(q.page) || 1, Number(q.limit) || 50);
  }

  /** A list for a campaign: contact details leave the system, so it's a separate permission. */
  @Get('dogs/export')
  @AdminPerms({ read: 'crm.export' })
  async export(@Query() q: Record<string, string>, @Res() res: Response) {
    const csv = await this.crm.exportCsv(filters(q));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pupbox-dogs-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }
}

@Module({
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
