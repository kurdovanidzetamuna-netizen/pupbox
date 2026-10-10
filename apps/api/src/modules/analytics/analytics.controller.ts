import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AnalyticsService } from './analytics.service';
import { RANGE_KEYS } from './analytics.range';
import { AdminPerms } from '../admin-auth/admin-permissions';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'dashboard.view', write: 'dashboard.view' })
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Headline metrics for both sales channels plus the time series, for one period.
   * Unknown or missing `range` values fall back to '1m'.
   */
  @Get('overview')
  @ApiQuery({ name: 'range', required: false, enum: RANGE_KEYS })
  getOverview(@Query('range') range?: string) {
    return this.analyticsService.getOverview(range);
  }

  /** Ecommerce: best-selling standalone products in the period. */
  @Get('top-products')
  @ApiQuery({ name: 'range', required: false, enum: RANGE_KEYS })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(@Query('range') range?: string, @Query('limit') limit = '8') {
    return this.analyticsService.getTopProducts(range, +limit);
  }

  /** Subscriptions: most popular plans in the period. */
  @Get('top-plans')
  @ApiQuery({ name: 'range', required: false, enum: RANGE_KEYS })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopPlans(@Query('range') range?: string, @Query('limit') limit = '6') {
    return this.analyticsService.getTopPlans(range, +limit);
  }

  /** Products at or below their low-stock threshold. Not period-scoped — stock is current state. */
  @Get('inventory-alerts')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getInventoryAlerts(@Query('limit') limit = '10') {
    return this.analyticsService.getInventoryAlerts(+limit);
  }

  /** Active box campaigns and their contents. */
  @Get('box-items')
  getBoxItems() {
    return this.analyticsService.getBoxItems();
  }

  @Get('order-status')
  @ApiQuery({ name: 'range', required: false, enum: RANGE_KEYS })
  getOrderStatus(@Query('range') range?: string) {
    return this.analyticsService.getOrderStatusBreakdown(range);
  }
}
