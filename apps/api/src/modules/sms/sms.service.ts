import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Text messages (verification codes). The SMS gateway — Wifisher — is
 * connected once the contract is signed: set SMS_PROVIDER and its keys and
 * add the call in `deliver`. Until then, in development the message is
 * written to the server log so codes can be read there; in production
 * sending fails loudly instead of pretending a code went out.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  private get provider() { return this.config.get<string>('SMS_PROVIDER') || ''; }
  private get isProduction() { return this.config.get('NODE_ENV') === 'production'; }

  async send(to: string, text: string) {
    if (!this.provider) {
      if (this.isProduction) throw new ServiceUnavailableException('Text messages are not set up yet. Please try again later.');
      this.logger.warn(`SMS not sent (no SMS_PROVIDER; development only): to=${to} text="${text}"`);
      return;
    }
    await this.deliver(to, text);
  }

  private async deliver(to: string, text: string) {
    // Wifisher goes here when the account exists (endpoint, sender name, key).
    throw new ServiceUnavailableException(`SMS provider "${this.provider}" is not connected yet.`);
  }
}
