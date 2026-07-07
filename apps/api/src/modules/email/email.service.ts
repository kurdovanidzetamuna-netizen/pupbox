import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService, private prisma: PrismaService) {}

  private get apiKey() { return this.config.get('RESEND_API_KEY') || ''; }
  private get from() { return this.config.get('EMAIL_FROM') || 'noreply@pupbox.ge'; }
  private get siteUrl() { return this.config.get('NEXT_PUBLIC_SITE_URL') || 'https://pupbox.ge'; }

  private async getTemplate(key: string): Promise<{ subject: string; body: string } | null> {
    const tpl = await this.prisma.emailTemplate.findFirst({ where: { key, isActive: true } });
    return tpl ? { subject: tpl.subject, body: tpl.body } : null;
  }

  private renderTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.apiKey) {
      this.logger.warn(`Email not sent (no RESEND_API_KEY): to=${to} subject=${subject}`);
      return;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.from, to, subject, html }),
      });
      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`Resend error: ${res.status} ${err}`);
      }
    } catch (e) {
      this.logger.error(`Email send failed: ${e}`);
    }
  }

  async sendWelcome(user: { email: string; firstName: string }) {
    const tpl = await this.getTemplate('welcome');
    const subject = tpl ? this.renderTemplate(tpl.subject, { firstName: user.firstName }) : `Welcome to Pupbox, ${user.firstName}! 🐾`;
    const html = tpl
      ? this.renderTemplate(tpl.body, { firstName: user.firstName, siteUrl: this.siteUrl })
      : this.buildWelcomeHtml(user.firstName);
    await this.send(user.email, subject, html);
  }

  async sendOrderConfirmation(order: { id: string; total: number; user: { email: string; firstName: string } }) {
    const tpl = await this.getTemplate('order_confirmation');
    const vars = {
      firstName: order.user.firstName,
      orderId: order.id.slice(-8).toUpperCase(),
      total: `₾${Number(order.total).toFixed(2)}`,
      siteUrl: this.siteUrl,
    };
    const subject = tpl ? this.renderTemplate(tpl.subject, vars) : `Order confirmed — #${vars.orderId}`;
    const html = tpl ? this.renderTemplate(tpl.body, vars) : this.buildOrderConfirmHtml(vars);
    await this.send(order.user.email, subject, html);
  }

  async sendPaymentConfirmation(order: { id: string; total: number; user: { email: string; firstName: string } }) {
    const tpl = await this.getTemplate('payment_confirmation');
    const vars = {
      firstName: order.user.firstName,
      orderId: order.id.slice(-8).toUpperCase(),
      total: `₾${Number(order.total).toFixed(2)}`,
      ordersUrl: `${this.siteUrl}/account/orders`,
    };
    const subject = tpl ? this.renderTemplate(tpl.subject, vars) : `Payment confirmed — #${vars.orderId} 🎉`;
    const html = tpl ? this.renderTemplate(tpl.body, vars) : this.buildPaymentHtml(vars);
    await this.send(order.user.email, subject, html);
  }

  async sendSubscriptionActivated(data: { email: string; firstName: string; planName: string }) {
    const tpl = await this.getTemplate('subscription_activated');
    const vars = { firstName: data.firstName, planName: data.planName, siteUrl: this.siteUrl };
    const subject = tpl ? this.renderTemplate(tpl.subject, vars) : `Your Pupbox subscription is active! 🐾`;
    const html = tpl ? this.renderTemplate(tpl.body, vars) : this.buildSubscriptionHtml(vars);
    await this.send(data.email, subject, html);
  }

  async sendReferralReward(data: { email: string; firstName: string; couponCode: string }) {
    const html = `<p>Hi ${data.firstName},</p><p>Your friend just placed their first order — here's your ₾10 reward coupon: <strong>${data.couponCode}</strong></p><p>Use it on your next order at <a href="${this.siteUrl}">${this.siteUrl}</a></p>`;
    await this.send(data.email, `You earned a ₾10 reward coupon! 🎁`, html);
  }

  private buildWelcomeHtml(firstName: string): string {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px"><div style="text-align:center;margin-bottom:24px"><span style="font-size:2rem">🐾</span><h1 style="color:#f97316">Welcome to Pupbox!</h1></div><p>Hi ${firstName},</p><p>Thank you for joining Pupbox — Georgia's favourite monthly dog subscription box!</p><p>Explore our plans and treat your pup to something special.</p><a href="${this.siteUrl}/prices" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold;margin-top:16px">View Subscription Plans</a><p style="margin-top:32px;color:#9ca3af;font-size:0.85rem">© ${new Date().getFullYear()} Pupbox</p></body></html>`;
  }

  private buildOrderConfirmHtml(vars: Record<string, string>): string {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="color:#f97316">Order Received! 📦</h2><p>Hi ${vars.firstName},</p><p>We've received your order <strong>#${vars.orderId}</strong> for <strong>${vars.total}</strong>.</p><p>Please complete your payment to confirm the order.</p><a href="${vars.siteUrl}/account/orders" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold;margin-top:16px">View My Orders</a></body></html>`;
  }

  private buildPaymentHtml(vars: Record<string, string>): string {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="color:#16a34a">Payment Confirmed! 🎉</h2><p>Hi ${vars.firstName},</p><p>Your payment for order <strong>#${vars.orderId}</strong> totalling <strong>${vars.total}</strong> has been confirmed.</p><p>We're now preparing your order.</p><a href="${vars.ordersUrl}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold;margin-top:16px">Track My Order</a></body></html>`;
  }

  private buildSubscriptionHtml(vars: Record<string, string>): string {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="color:#f97316">Subscription Active! 🐾</h2><p>Hi ${vars.firstName},</p><p>Your <strong>${vars.planName}</strong> subscription is now active. Your first box is on its way!</p><a href="${vars.siteUrl}/account/orders" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:bold;margin-top:16px">My Account</a></body></html>`;
  }
}
