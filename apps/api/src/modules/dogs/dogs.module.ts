import { Module } from '@nestjs/common';
import { DogsService } from './dogs.service';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsEnum, IsDateString } from 'class-validator';
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

  @Get() @ApiOperation({ summary: 'Get my dogs' })
  findAll(@Request() req: any) { return this.service.findByUser(req.user.id); }

  @Post() @ApiOperation({ summary: 'Add a dog' })
  create(@Request() req: any, @Body() dto: CreateDogDto) {
    return this.service.create(req.user.id, { ...dto, birthday: dto.birthday ? new Date(dto.birthday) : undefined });
  }

  @Put(':id') @ApiOperation({ summary: 'Update dog' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateDogDto) {
    // A date-only birthday ("2021-05-02") must become a Date, as on create.
    return this.service.update(id, req.user.id, { ...dto, ...(dto.birthday !== undefined ? { birthday: dto.birthday ? new Date(dto.birthday) : null } : {}) });
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
