import { Module } from '@nestjs/common';
import { DogsService } from './dogs.service';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { DOG_PHOTO_MAX_BYTES } from './dog-photo';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsEnum, IsDateString, ArrayMaxSize, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

enum DogGender { MALE = 'MALE', FEMALE = 'FEMALE' }
enum DogSize { EXTRA_SMALL = 'EXTRA_SMALL', SMALL = 'SMALL', MEDIUM = 'MEDIUM', LARGE = 'LARGE', EXTRA_LARGE = 'EXTRA_LARGE' }

class CreateDogDto {
  @IsString() name: string;
  @IsOptional() @IsString() breed?: string;
  @IsOptional() @IsDateString() birthday?: string;
  @IsOptional() @IsEnum(DogGender) gender?: DogGender;
  @IsOptional() @IsEnum(DogSize) size?: DogSize;
  @IsOptional() @Type(() => Number) @IsNumber() weightKg?: number;
  @IsOptional() @IsArray() allergies?: string[];
  @IsOptional() @IsArray() toyPreferences?: string[];
  @IsOptional() @IsArray() foodPreferences?: string[];
  @IsOptional() @IsString() chewingStrength?: string;
  /** Shop categories the dog loves (main ones and/or their kinds). */
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) @MaxLength(40, { each: true }) likedCategoryIds?: string[];
  @IsOptional() @IsString() specialNotes?: string;
}

/**
 * Only dog fields, validated. A bare Partial<> type isn't checked at all, so
 * a request could set anything on the row — including whose dog it is.
 */
class UpdateDogDto extends PartialType(CreateDogDto) {}

@ApiTags('My Dogs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me/dogs')
class DogsController {
  constructor(private service: DogsService) {}

  /** `?all=1` adds friends' dogs from gift plans, and each dog's plans. */
  @Get() @ApiOperation({ summary: 'Get my dogs' })
  findAll(@Request() req: any, @Query('all') all?: string) { return this.service.findByUser(req.user.id, all === '1'); }

  @Get(':id') @ApiOperation({ summary: 'One of my dogs, with its plans' })
  findOne(@Request() req: any, @Param('id') id: string) { return this.service.findOneFull(id, req.user.id); }

  @Post() @ApiOperation({ summary: 'Add a dog' })
  create(@Request() req: any, @Body() dto: CreateDogDto) {
    return this.service.create(req.user.id, { ...dto, birthday: dto.birthday ? new Date(dto.birthday) : undefined });
  }

  @Put(':id') @ApiOperation({ summary: 'Update dog' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateDogDto) {
    // A date-only birthday ("2021-05-02") must become a Date, as on create.
    return this.service.update(id, req.user.id, { ...dto, ...(dto.birthday !== undefined ? { birthday: dto.birthday ? new Date(dto.birthday) : null } : {}) });
  }

  /** A photo of the dog (JPG, PNG or WebP, up to 8 MB); replaces any earlier one. */
  @Post(':id/photo') @ApiOperation({ summary: 'Upload a photo of my dog' })
  @Throttle({ default: { limit: 10, ttl: 10 * 60_000 } })
  // A little over the limit, so an oversize file gets the friendly message from saveDogPhoto.
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: DOG_PHOTO_MAX_BYTES + 1 } }))
  uploadPhoto(@Request() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.setPhoto(id, req.user.id, file?.buffer);
  }

  @Delete(':id/photo') @ApiOperation({ summary: 'Remove my dog’s photo' })
  removePhoto(@Request() req: any, @Param('id') id: string) {
    return this.service.removePhoto(id, req.user.id);
  }

  @Delete(':id') @ApiOperation({ summary: 'Remove dog' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user.id);
  }
}

@Module({
  providers: [DogsService],
  controllers: [DogsController],
  exports: [DogsService],
})
export class DogsModule {}
