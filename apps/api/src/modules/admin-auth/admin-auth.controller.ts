import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';

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
  @ApiOperation({ summary: 'Admin login' })
  login(@Body() dto: AdminLoginDto) {
    return this.service.login(dto.email, dto.password);
  }
}
