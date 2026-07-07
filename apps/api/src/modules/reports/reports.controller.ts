import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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
