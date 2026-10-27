import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailTemplatesController } from './email-templates.controller';

@Global()
@Module({
  controllers: [EmailTemplatesController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
