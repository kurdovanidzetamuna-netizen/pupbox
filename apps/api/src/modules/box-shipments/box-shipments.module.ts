import { Body, Controller, Get, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BoxShipmentStatus } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { BoxShipmentsService } from './box-shipments.service';

class MonthDto {
  @Type(() => Number) @IsInt() @Min(2024) @Max(2100) year: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
}

class SetStatusDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) ids: string[];
  @IsEnum(BoxShipmentStatus) status: BoxShipmentStatus;
  /** Only applied when a single box is updated. */
  @IsOptional() @IsString() @MaxLength(100) trackingNumber?: string;
}

class TrackingDto {
  @IsString() @MaxLength(100) trackingNumber: string;
}

@ApiTags('box-shipments')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/box-shipments')
class BoxShipmentsController {
  constructor(private service: BoxShipmentsService) {}

  @Get()
  month(@Query() q: MonthDto) {
    return this.service.month(q.year, q.month);
  }

  @Post('add-due')
  addDue(@Body() b: MonthDto) {
    return this.service.addDue(b.year, b.month);
  }

  @Post('refresh-campaigns')
  refreshCampaigns(@Body() b: MonthDto) {
    return this.service.refreshCampaigns(b.year, b.month);
  }

  @Patch('status')
  setStatus(@Body() b: SetStatusDto) {
    return this.service.setStatus(b.ids, b.status, b.trackingNumber);
  }

  @Patch(':id/tracking')
  setTracking(@Param('id') id: string, @Body() b: TrackingDto) {
    return this.service.setTracking(id, b.trackingNumber);
  }
}

@Module({
  controllers: [BoxShipmentsController],
  providers: [BoxShipmentsService],
})
export class BoxShipmentsModule {}
