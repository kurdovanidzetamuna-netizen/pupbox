import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ReportsService } from './reports.service';
import { insights, type InsightFilters } from './insights';
import { PrismaService } from '../prisma/prisma.service';
import { toCsv } from './reports.service';
import { AdminPerms } from '../admin-auth/admin-permissions';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'reports.view', write: 'reports.view' })
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService, private readonly prisma: PrismaService) {}

  /** Insights: totals, change against the previous period, over time and broken down. */
  @Get('insights')
  insights(@Query() f: InsightFilters) {
    return insights(this.prisma, f);
  }

  /** The same view as a spreadsheet: one row per day/week/month, then each breakdown. */
  @Get('insights.csv')
  async insightsCsv(@Query() f: InsightFilters, @Res() res: Response) {
    const d = await insights(this.prisma, f);
    const rows: Record<string, any>[] = [
      ...d.series.map((r) => ({ section: 'Over time', name: r.date, value: r.collected, refunded: r.refunded, count: r.orders })),
      ...(['byType', 'byTier', 'byPlan', 'byCategory', 'byCity', 'topProducts', 'refundReasons'] as const).flatMap((k) => (d as any)[k].map((r: any) => ({ section: k, name: r.label, value: r.value, refunded: '', count: r.count }))),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pupbox-insights-${d.range.from.slice(0, 10)}.csv"`);
    res.send(toCsv(rows));
  }

  @Get('orders')
  async ordersReport(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    const csv = await this.reportsService.ordersReport(from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(csv);
  }

  @Get('customers')
  async customersReport(@Res() res: Response) {
    const csv = await this.reportsService.customersReport();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send(csv);
  }

  @Get('subscriptions')
  async subscriptionsReport(@Res() res: Response) {
    const csv = await this.reportsService.subscriptionsReport();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscriptions.csv"');
    res.send(csv);
  }

  @Get('revenue')
  async revenueReport(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    const csv = await this.reportsService.revenueReport(from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue.csv"');
    res.send(csv);
  }
}
