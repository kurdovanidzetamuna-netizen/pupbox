import { Controller, Post, Get, Put, Delete, Param, Body, HttpCode, HttpStatus, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChangePasswordDto, DeleteAccountDto } from './dto/account.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { Throttle } from '@nestjs/throttler';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { AuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { adminSocialConfig, facebookDataDeletion, publicProviders, saveSocialConfig } from './social';

class SendCodeDto {
  @IsIn(['EMAIL', 'PHONE']) channel: 'EMAIL' | 'PHONE';
}

class ConfirmCodeDto {
  @IsIn(['EMAIL', 'PHONE']) channel: 'EMAIL' | 'PHONE';
  @IsString() @Matches(/^[\d\s-]{6,11}$/, { message: 'The code is 6 digits' }) code: string;
}

class PhoneDto {
  @IsString() @MaxLength(30) phone: string;
  @IsOptional() @IsIn(['ka', 'en']) language?: 'ka' | 'en';
}
class PhoneCodeDto {
  @IsString() @MaxLength(30) phone: string;
  @IsString() @Matches(/^[\d\s-]{6,11}$/, { message: 'The code is 6 digits' }) code: string;
}

class SocialDto {
  /** The access token Google's or Facebook's sign-in window gave the site. */
  @IsString() @MaxLength(4096) token: string;
  @IsOptional() @IsIn(['ka', 'en']) language?: 'ka' | 'en';
  @IsOptional() @IsBoolean() marketingConsent?: boolean;
  @IsOptional() @IsString() @MaxLength(40) referralCode?: string;
}
class LinkDto {
  @IsString() @MaxLength(4096) token: string;
}

/** "google" / "facebook" in an address → the provider. */
const providerOf = (p: string): AuthProvider => {
  if (p === 'google') return 'GOOGLE';
  if (p === 'facebook') return 'FACEBOOK';
  throw new BadRequestException('Unknown sign-in provider');
};

@ApiTags('Customer Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private prisma: PrismaService) {}

  /** Which "Continue with…" buttons the site shows, with the public ids their scripts need. */
  @Get('providers')
  @ApiOperation({ summary: 'Sign-in providers that are switched on' })
  providers() {
    return publicProviders(this.prisma);
  }

  /** Facebook's data deletion callback (set in the Facebook app): forgets what Facebook shared with us. */
  @Post('facebook/data-deletion')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Facebook data deletion callback (signed by Facebook)' })
  facebookDeletion(@Body() body: { signed_request?: string }) {
    return facebookDataDeletion(this.prisma, body?.signed_request);
  }

  /** Continue with Google / Facebook: signs in, links an account with the same email, or creates one. */
  @Post(':provider(google|facebook)')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in or sign up with Google or Facebook' })
  social(@Param('provider') provider: string, @Body() dto: SocialDto) {
    return this.authService.socialSignIn(providerOf(provider), dto.token, dto);
  }

  /** My ways to sign in: password or not, Google / Facebook linked. */
  @Get('methods')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'My sign-in methods' })
  methods(@Request() req: any) {
    return this.authService.signInMethods(req.user.id);
  }

  @Post('link/:provider(google|facebook)')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Link Google or Facebook to my account' })
  link(@Request() req: any, @Param('provider') provider: string, @Body() dto: LinkDto) {
    return this.authService.linkIdentity(req.user.id, providerOf(provider), dto.token);
  }

  @Delete('link/:provider(google|facebook)')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Unlink Google or Facebook (never the last way in)' })
  unlink(@Request() req: any, @Param('provider') provider: string) {
    return this.authService.unlinkIdentity(req.user.id, providerOf(provider));
  }

  // Tighter limits than the API-wide one: these are what password guessing
  // and email bombing would hammer.
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new customer' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer login' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Sign-up: text a code to the number typed in the form (no account yet). */
  @Post('phone/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 12, ttl: 10 * 60_000 } })
  @ApiOperation({ summary: 'Text a sign-up code to a phone number' })
  sendPhoneCode(@Body() dto: PhoneDto, @Request() req: any) {
    return this.authService.sendPhoneCode({ phone: dto.phone, purpose: 'SIGNUP', ip: req.ip, language: dto.language });
  }

  /** Sign-up: check the code; a right one returns the proof to send with the new account. */
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 10 * 60_000 } })
  @ApiOperation({ summary: 'Check a sign-up phone code' })
  checkPhoneCode(@Body() dto: PhoneCodeDto) {
    return this.authService.checkPhoneCode({ phone: dto.phone, code: dto.code, purpose: 'SIGNUP' });
  }

  /** Signed in: text a code to a new number before it replaces the old one. */
  @Post('phone/change/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @ApiOperation({ summary: 'Text a code to my new phone number' })
  sendChangeCode(@Request() req: any, @Body() dto: PhoneDto) {
    return this.authService.sendPhoneCode({ phone: dto.phone, purpose: 'CHANGE', userId: req.user.id, ip: req.ip, language: dto.language });
  }

  /** Signed in: a right code makes the new number mine, confirmed. */
  @Post('phone/change/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 20, ttl: 10 * 60_000 } })
  @ApiOperation({ summary: 'Confirm my new phone number' })
  confirmChange(@Request() req: any, @Body() dto: PhoneCodeDto) {
    return this.authService.checkPhoneCode({ phone: dto.phone, code: dto.code, purpose: 'CHANGE', userId: req.user.id });
  }

  @Post('verify/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 6, ttl: 10 * 60_000 } })
  @ApiOperation({ summary: 'Send a verification code to my email or phone' })
  sendCode(@Request() req: any, @Body() dto: SendCodeDto) {
    return this.authService.sendVerification(req.user.id, dto.channel);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 20, ttl: 10 * 60_000 } })
  @ApiOperation({ summary: 'Confirm my email or phone with the code' })
  confirmCode(@Request() req: any, @Body() dto: ConfirmCodeDto) {
    return this.authService.confirmVerification(req.user.id, dto.channel, dto.code);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Change password while signed in; signs out other sessions' })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Erase my personal data (orders are kept without it)' })
  deleteAccount(@Request() req: any, @Body() dto: DeleteAccountDto) {
    return this.authService.deleteAccount(req.user.id, dto.password);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Email a link to set a new password (same answer whether or not the account exists)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @ApiOperation({ summary: 'Set a new password with the emailed link; signs out other sessions' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}

/** Admin → Settings → Sign in with Google & Facebook: the keys (secret masked) and on/off switches. */
@ApiTags('Admin — Settings')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'cms.edit', write: 'cms.edit' })
@Controller('admin/social-login')
export class AdminSocialController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get()
  get() {
    return adminSocialConfig(this.prisma);
  }

  @Put()
  async save(@Body() body: Record<string, any>, @Request() req: any) {
    const before = await adminSocialConfig(this.prisma);
    const after = await saveSocialConfig(this.prisma, body);
    await this.audit.log({ adminUserId: req.user?.id, action: 'UPDATE', module: 'settings', entityType: 'SocialSignIn', entityId: 'config-social', before, after });
    return after;
  }
}
