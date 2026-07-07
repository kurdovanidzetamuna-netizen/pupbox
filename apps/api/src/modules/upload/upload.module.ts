import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [AdminAuthModule, MulterModule.register({})],
  controllers: [UploadController],
})
export class UploadModule {}
