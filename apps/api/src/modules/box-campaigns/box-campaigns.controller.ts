import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { BoxCampaignsService } from './box-campaigns.service';
import { AdminPerms } from '../admin-auth/admin-permissions';

@ApiTags('box-campaigns')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'subscriptions.view', write: 'subscriptions.manage' })
@Controller('box-campaigns')
export class BoxCampaignsController {
  constructor(private readonly boxCampaignsService: BoxCampaignsService) {}

  @Get()
  findAll() {
    return this.boxCampaignsService.findAll();
  }

  @Get('packing-list')
  packingList(@Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.boxCampaignsService.packingList(+(year || now.getFullYear()), +(month || now.getMonth() + 1));
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.boxCampaignsService.findById(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.boxCampaignsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.boxCampaignsService.update(id, body);
  }

  @Put(':id/products')
  setProducts(@Param('id') id: string, @Body('items') items: { productId: string; quantity: number }[]) {
    return this.boxCampaignsService.setProducts(id, items || []);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.boxCampaignsService.delete(id);
  }
}
