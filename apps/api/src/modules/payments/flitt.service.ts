import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class FlittService {
  private readonly logger = new Logger(FlittService.name);
  private readonly apiUrl = 'https://pay.flitt.com/api/checkout/url';

  constructor(private config: ConfigService) {}

  private get merchantId(): string {
    return this.config.get('FLITT_MERCHANT_ID') || '';
  }

  private get secretKey(): string {
    return this.config.get('FLITT_SECRET_KEY') || '';
  }

  buildSignature(params: Record<string, string | number>): string {
    const sorted = Object.keys(params)
      .sort()
      .map((k) => params[k]);
    const toHash = [this.secretKey, ...sorted].join('|');
    return crypto.createHash('sha1').update(toHash).digest('hex');
  }

  verifySignature(params: Record<string, string | number>): boolean {
    const { response_signature_string, signature, ...rest } = params as any;
    const expected = this.buildSignature(rest);
    const received = (signature || response_signature_string || '') as string;
    return expected === received;
  }

  async createCheckout(opts: {
    orderId: string;
    amount: number; // in GEL
    description: string;
    serverCallbackUrl: string;
    responseUrl: string;
  }): Promise<{ checkoutUrl: string; paymentId: string }> {
    const amountInTetri = Math.round(opts.amount * 100);

    const params: Record<string, string | number> = {
      merchant_id: this.merchantId,
      order_id: opts.orderId,
      order_desc: opts.description,
      amount: amountInTetri,
      currency: 'GEL',
      server_callback_url: opts.serverCallbackUrl,
      response_url: opts.responseUrl,
    };

    params.signature = this.buildSignature(params);

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Flitt error: ${res.status} ${text}`);
      throw new Error(`Flitt API error: ${res.status}`);
    }

    const data = await res.json();

    if (data?.response?.response_status !== 'success') {
      this.logger.error(`Flitt response error: ${JSON.stringify(data)}`);
      throw new Error('Flitt payment creation failed');
    }

    return {
      checkoutUrl: data.response.checkout_url,
      paymentId: data.response.payment_id,
    };
  }
}
