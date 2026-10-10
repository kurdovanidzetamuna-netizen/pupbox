import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AdminJwtGuard } from './admin-jwt.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';
import { Throttle } from '@nestjs/throttler';

class AdminLoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private service: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // The admin account opens everything; guessing its password must be slow.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Admin login' })
  login(@Body() dto: AdminLoginDto) {
    return this.service.login(dto.email, dto.password);
  }

  /** The signed-in admin's role and permissions as they are now (not as when they signed in). */
  @Get('me')
  @UseGuards(AdminJwtGuard)
  me(@Request() req: any) {
    return req.user;
  }
}
