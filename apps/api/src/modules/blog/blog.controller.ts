import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { BlogService } from './blog.service';
import { AdminPerms } from '../admin-auth/admin-permissions';

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
  createPost(@Body() body: any) {
    return this.blogService.createPost(body);
  }

  @Put('admin/posts/:id')
  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @AdminPerms({ write: 'cms.edit' })
  updatePost(@Param('id') id: string, @Body() body: any) {
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
