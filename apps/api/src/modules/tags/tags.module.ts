import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

class CreateTagDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() description?: string;
}

class UpdateTagDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Tags')
@Controller('tags')
class TagsController {
  constructor(private service: TagsService) {}
  @Get() findAll() { return this.service.findAll(); }
}

@ApiTags('Admin — Tags')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/tags')
class AdminTagsController {
  constructor(private service: TagsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() dto: CreateTagDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateTagDto) { return this.service.update(id, dto); }
}

@Module({
  providers: [TagsService],
  controllers: [TagsController, AdminTagsController],
  exports: [TagsService],
})
export class TagsModule {}
