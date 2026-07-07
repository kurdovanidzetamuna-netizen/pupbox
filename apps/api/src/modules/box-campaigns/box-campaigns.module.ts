import { Module } from '@nestjs/common';
import { BoxCampaignsController } from './box-campaigns.controller';
import { BoxCampaignsService } from './box-campaigns.service';

@Module({
  controllers: [BoxCampaignsController],
  providers: [BoxCampaignsService],
  exports: [BoxCampaignsService],
})
export class BoxCampaignsModule {}
