import { Controller, Get, Post, Param, Body, Query, UseGuards, Request, Module } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { GiftsService } from './gifts.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { ArrayMaxSize, IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DogGender, DogSize } from '@prisma/client';

class ClaimDogDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(60) name: string;
  @IsOptional() @Trim() @IsString() @MaxLength(80) breed?: string;
  @IsOptional() @IsEnum(DogSize) size?: DogSize;
  @IsOptional() @IsEnum(DogGender) gender?: DogGender;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(150) weightKg?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(20) allergies?: string[];
}

class ClaimAddressDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) firstName: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) lastName: string;
  @Trim() @IsString() @Matches(/^\+?[0-9\s()-]{7,20}$/) phone: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) city: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(200) addressLine1: string;
  @IsOptional() @Trim() @IsString() @MaxLength(200) addressLine2?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(20) postalCode?: string;
}

/** What the recipient sends to claim a gift: their dog (new or existing) and where to deliver. */
class ClaimGiftDto {
  @IsOptional() @IsString() dogId?: string;
  @IsOptional() @ValidateNested() @Type(() => ClaimDogDto) dog?: ClaimDogDto;
  @IsOptional() @ValidateNested() @Type(() => ClaimAddressDto) address?: ClaimAddressDto;
}

/** Trims strings so a field of only spaces counts as empty. */
function Trim() { return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)); }

@ApiTags('gifts')
@Controller('gifts')
export class GiftsController {
  constructor(private readonly gifts: GiftsService) {}

  /**
   * Public: what the claim page shows before sign-in. The token is the only
   * credential, so this returns nothing sensitive about the buyer.
   */
  @Get(':token')
  @ApiOperation({ summary: 'Preview a gifted subscription from its claim token' })
  preview(@Param('token') token: string) {
    return this.gifts.preview(token);
  }

  /** Requires sign-in: the recipient needs an account to manage the subscription afterwards. */
  @Post(':token/claim')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Claim a gifted subscription, attaching a dog and address' })
  claim(@Request() req: any, @Param('token') token: string, @Body() body: ClaimGiftDto) {
    return this.gifts.claim(token, req.user.id, body);
  }
}

@ApiTags('gifts')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'subscriptions.view', write: 'subscriptions.manage' })
@Controller('admin/gifts')
export class AdminGiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get()
  @ApiOperation({ summary: 'List gifts, oldest unclaimed first' })
  @ApiQuery({ name: 'claimed', required: false, enum: ['true', 'false'] })
  list(@Query('claimed') claimed?: string) {
    return this.gifts.adminList(claimed === undefined ? undefined : claimed === 'true');
  }

  @Get('summary')
  @ApiOperation({ summary: 'Unclaimed gift counts and value for the dashboard' })
  summary() {
    return this.gifts.adminSummary();
  }

  @Post(':id/resend')
  @ApiOperation({ summary: 'Re-send the gift card email' })
  resend(@Param('id') id: string) {
    return this.gifts.resend(id);
  }
}

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [GiftsController, AdminGiftsController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
