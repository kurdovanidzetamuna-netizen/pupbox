import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminJwtGuard } from './admin-jwt.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [AdminAuthService, AdminJwtStrategy, AdminJwtGuard],
  controllers: [AdminAuthController],
  exports: [AdminJwtGuard],
})
export class AdminAuthModule {}
