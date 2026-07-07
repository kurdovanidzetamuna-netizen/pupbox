import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.analyticsService.getDashboardMetrics();
  }

  @Get('revenue-chart')
  getRevenueChart(@Query('months') months = '6') {
    return this.analyticsService.getRevenueChart(+months);
  }

  @Get('top-products')
  getTopProducts(@Query('limit') limit = '10') {
    return this.analyticsService.getTopProducts(+limit);
  }

  @Get('order-status')
  getOrderStatus() {
    return this.analyticsService.getOrderStatusBreakdown();
  }
}
