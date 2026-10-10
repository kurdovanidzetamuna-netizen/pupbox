import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { BlogService } from './blog.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { IsArray, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

class BlogPostDto {
  @IsString() @MaxLength(200) title: string;
  @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'Use lowercase letters, numbers and - in the address' }) @MaxLength(160) slug: string;
  @IsOptional() @IsString() @MaxLength(600) excerpt?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() @MaxLength(500) featuredImage?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(120) authorName?: string;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
  @IsOptional() @IsString() @MaxLength(200) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(400) seoDesc?: string;
  @IsOptional() @IsString() @MaxLength(500) ogImage?: string;
  @IsOptional() @IsObject() translations?: Record<string, any>;
  @IsOptional() @IsArray() @IsString({ each: true }) tagIds?: string[];
}

class UpdateBlogPostDto extends PartialType(BlogPostDto) {}

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('posts')
  listPosts(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('category') categorySlug?: string,
    @Query('tag') tagSlug?: string,
  ) {
    return this.blogService.listPosts({ page: +page, limit: +limit, categorySlug, tagSlug });
  }

  @Get('posts/:slug')
  getPost(@Param('slug') slug: string) {
    return this.blogService.getPost(slug);
  }

  @Get('categories')
  listCategories() {
    return this.blogService.listCategories();
  }

  @Get('tags')
  listTags() {
    return this.blogService.listTags();
  }

  @Get('slugs')
  allSlugs() {
    return this.blogService.allPublishedSlugs();
  }

  // Admin
  @Get('admin/posts')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ read: 'cms.view' })
  adminListPosts(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.blogService.listPosts({ page: +page, limit: +limit, adminMode: true });
  }

  @Post('admin/posts')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  createPost(@Body() body: BlogPostDto) {
    return this.blogService.createPost(body);
  }

  @Put('admin/posts/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  updatePost(@Param('id') id: string, @Body() body: UpdateBlogPostDto) {
    return this.blogService.updatePost(id, body);
  }

  @Delete('admin/posts/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  deletePost(@Param('id') id: string) {
    return this.blogService.deletePost(id);
  }
}
