import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNotEmpty, MaxLength, Matches, IsIn, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { AdminPerms } from '../admin-auth/admin-permissions';

/** Trims strings so a field of only spaces counts as empty. */
const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

class CancelDto {
  @IsOptional() @IsString() reason?: string;
}

class AddressDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) firstName: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) lastName: string;
  @Trim() @IsString() @Matches(/^\+?[0-9\s()-]{7,20}$/) phone: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) city: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(200) addressLine1: string;
  @IsOptional() @Trim() @IsString() @MaxLength(200) addressLine2?: string;
}

class AdminDogDto {
  @IsOptional() @Trim() @IsString() @IsNotEmpty() @MaxLength(60) name?: string;
  @IsOptional() @IsIn(['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', '']) size?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @IsOptional() @IsString() @MaxLength(500) specialNotes?: string;
}

class ToggleAutoRenewalDto {
  @IsBoolean() enabled: boolean;
}

class AdminUpdateDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() cancelReason?: string;
  @IsOptional() @IsBoolean() autoRenewal?: boolean;
}

@ApiTags('My Subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me/subscriptions')
class SubscriptionsController {
  constructor(private service: SubscriptionsService) {}
  @Get() findAll(@Request() req: any) { return this.service.findByUser(req.user.id); }
  @Get(':id') findOne(@Request() req: any, @Param('id') id: string) { return this.service.findOne(id, req.user.id); }
  @Get(':id/cancel-preview') cancelPreview(@Request() req: any, @Param('id') id: string) {
    return this.service.cancelPreview(id, req.user.id);
  }
  @Patch(':id/cancel') cancel(@Request() req: any, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.service.cancel(id, req.user.id, dto.reason);
  }
  @Post(':id/extend') extend(@Request() req: any, @Param('id') id: string) {
    return this.service.extend(id, req.user.id);
  }
  @Patch(':id/address') changeAddress(@Request() req: any, @Param('id') id: string, @Body() dto: AddressDto) {
    return this.service.changeAddress(id, req.user.id, dto);
  }
  @Patch(':id/auto-renewal') toggleAutoRenewal(@Request() req: any, @Param('id') id: string, @Body() dto: ToggleAutoRenewalDto) {
    return this.service.toggleAutoRenewal(id, req.user.id, dto.enabled);
  }
}

@ApiTags('Admin — Subscriptions')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'subscriptions.view', write: 'subscriptions.manage' })
@Controller('admin/subscriptions')
class AdminSubscriptionsController {
  constructor(private service: SubscriptionsService) {}
  @Get() list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('gifts') gifts?: string,
  ) {
    return this.service.adminList({ status, page: page ? +page : 1, limit: limit ? +limit : 20, gifts: gifts === 'true' || gifts === '1' });
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: AdminUpdateDto) { return this.service.adminUpdate(id, dto as any); }
  // On the customer's behalf, under the same rules as in their account.
  @Get(':id/cancel-preview') cancelPreview(@Param('id') id: string) { return this.service.cancelPreview(id); }
  @Post(':id/cancel') cancel(@Param('id') id: string, @Body() dto: CancelDto) { return this.service.cancel(id, undefined, dto.reason || 'Cancelled by admin'); }
  @Patch(':id/address') changeAddress(@Param('id') id: string, @Body() dto: AddressDto) { return this.service.changeAddress(id, undefined, dto); }
  @Patch(':id/dog') updateDog(@Param('id') id: string, @Body() dto: AdminDogDto) { return this.service.adminUpdateDog(id, dto); }
}

@Module({
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController, AdminSubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
