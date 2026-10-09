import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export type Lang = 'ka' | 'en';
const lang = (l?: string | null): Lang => (l === 'en' ? 'en' : 'ka');

/** Everything a customer typed (names, gift notes) is escaped before it goes into an email. */
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** One email, already in the reader's language. Body paragraphs are HTML built from escaped values. */
interface Message {
  subject: string;
  heading: string;
  body: string[];
  button?: { text: string; url: string };
  after?: string[];
}

const hi = (l: Lang, name: string) => (l === 'ka' ? `გამარჯობა, ${esc(name)}!` : `Hi ${esc(name)},`);

/**
 * Customer emails, in Georgian or English — the language the customer uses
 * on the site (User.language). An admin-made template in the EmailTemplate
 * table named `<key>_<lang>` (or `<key>` for English) replaces the built-in
 * text below; templates use {{variables}}.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService, private prisma: PrismaService) {}

  private get apiKey() { return this.config.get('RESEND_API_KEY') || ''; }
  /** False until an email service key is set; nothing actually leaves before then. */
  get isConfigured() { return !!this.apiKey; }
  private get from() { return this.config.get('EMAIL_FROM') || 'noreply@pupbox.ge'; }
  private get siteUrl() { return this.config.get('NEXT_PUBLIC_SITE_URL') || 'https://pupbox.ge'; }

  private async getTemplate(key: string, l: Lang): Promise<{ subject: string; body: string } | null> {
    const keys = l === 'en' ? [`${key}_en`, key] : [`${key}_ka`];
    for (const k of keys) {
      const tpl = await this.prisma.emailTemplate.findFirst({ where: { key: k, isActive: true } });
      if (tpl) return { subject: tpl.subject, body: tpl.body };
    }
    return null;
  }

  private renderTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => esc(vars[k]));
  }

  private layout(l: Lang, m: Message): string {
    const p = (html: string) => `<p style="margin:0 0 14px;line-height:1.55">${html}</p>`;
    const button = m.button
      ? `<div style="margin:24px 0"><a href="${m.button.url}" style="display:inline-block;background:#0d9488;color:#ffffff;padding:12px 26px;border-radius:12px;text-decoration:none;font-weight:bold">${m.button.text}</a></div>`
      : '';
    return `<!DOCTYPE html><html lang="${l}"><body style="margin:0;background:#f8fafc;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2937">
<div style="max-width:520px;margin:0 auto;padding:28px 24px">
<p style="font-size:20px;font-weight:800;color:#0d9488;margin:0 0 20px">🐾 Pupbox</p>
<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px 24px">
<h1 style="font-size:20px;margin:0 0 16px;color:#111827">${m.heading}</h1>
${m.body.map(p).join('\n')}${button}${(m.after ?? []).map((a) => `<p style="margin:0 0 10px;color:#6b7280;font-size:13px;line-height:1.5">${a}</p>`).join('')}
</div>
<p style="color:#9ca3af;font-size:12px;margin:18px 0 0">© ${new Date().getFullYear()} Pupbox · <a href="${this.siteUrl}" style="color:#9ca3af">${this.siteUrl.replace(/^https?:\/\//, '')}</a></p>
</div></body></html>`;
  }

  /** Sends `key` to `to` in `l`, using an admin template when one exists. */
  private async deliver(to: string, key: string, l: Lang, vars: Record<string, string>, built: Message) {
    const tpl = await this.getTemplate(key, l);
    const subject = tpl ? this.renderTemplate(tpl.subject, vars) : built.subject;
    const html = tpl ? this.renderTemplate(tpl.body, vars) : this.layout(l, built);
    await this.send(to, subject, html);
  }

  /**
   * Hands the email to Resend. Throws if Resend refuses it, so callers that
   * record a send (gift cards) can undo and retry; the others ignore errors.
   */
  private async send(to: string, subject: string, html: string) {
    if (!this.apiKey) {
      this.logger.warn(`Email not sent (no RESEND_API_KEY): to=${to} subject=${subject}`);
      return;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to, subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(`Resend error: ${res.status} ${detail}`);
      throw new Error(`Email not accepted (${res.status})`);
    }
  }


  async sendWelcome(d: { email: string; firstName: string; language?: string | null }) {
    const l = lang(d.language);
    const url = `${this.siteUrl}/prices`;
    await this.deliver(d.email, 'welcome', l, { firstName: d.firstName, siteUrl: this.siteUrl }, l === 'ka' ? {
      subject: `კეთილი იყოს შენი მობრძანება Pupbox-ში, ${d.firstName}! 🐾`,
      heading: 'მოგესალმებით Pupbox-ში!',
      body: [hi(l, d.firstName), 'მადლობა, რომ შემოგვიერთდი — ყოველთვიური კოლოფები ნუგბრით, სათამაშოებითა და მოვლის საშუალებებით შენი ძაღლისთვის, მიწოდებით მთელ საქართველოში.'],
      button: { text: 'გეგმების ნახვა', url },
    } : {
      subject: `Welcome to Pupbox, ${d.firstName}! 🐾`,
      heading: 'Welcome to Pupbox!',
      body: [hi(l, d.firstName), 'Thanks for joining Pupbox — monthly boxes of treats, toys and care for your dog, delivered across Georgia.'],
      button: { text: 'See the plans', url },
    });
  }

  async sendPaymentConfirmation(order: { id: string; total: number; user: { email: string; firstName: string; language?: string | null } }) {
    const l = lang(order.user.language);
    const orderId = order.id.slice(-8).toUpperCase();
    const total = `₾${Number(order.total).toFixed(2)}`;
    const url = `${this.siteUrl}/account/orders`;
    await this.deliver(order.user.email, 'payment_confirmation', l, { firstName: order.user.firstName, orderId, total, ordersUrl: url }, l === 'ka' ? {
      subject: `გადახდა დადასტურდა — შეკვეთა #${orderId} 🎉`,
      heading: 'გადახდა დადასტურდა',
      body: [hi(l, order.user.firstName), `მივიღეთ შენი გადახდა <strong>${total}</strong> შეკვეთისთვის <strong>#${orderId}</strong>. უკვე ვამზადებთ.`],
      button: { text: 'ჩემი შეკვეთები', url },
    } : {
      subject: `Payment confirmed — order #${orderId} 🎉`,
      heading: 'Payment confirmed',
      body: [hi(l, order.user.firstName), `We've received your payment of <strong>${total}</strong> for order <strong>#${orderId}</strong>. We're preparing it now.`],
      button: { text: 'My orders', url },
    });
  }

  async sendOrderShipped(d: { email: string; firstName: string; language?: string | null; orderId: string; trackingNumber?: string | null }) {
    const l = lang(d.language);
    const orderId = d.orderId.slice(-8).toUpperCase();
    const url = `${this.siteUrl}/account/orders`;
    const tracking = d.trackingNumber ? (l === 'ka' ? `თრექინგის ნომერი: <strong>${esc(d.trackingNumber)}</strong>` : `Tracking number: <strong>${esc(d.trackingNumber)}</strong>`) : '';
    await this.deliver(d.email, 'order_shipped', l, { firstName: d.firstName, orderId, trackingNumber: d.trackingNumber ?? '', ordersUrl: url }, l === 'ka' ? {
      subject: `შეკვეთა #${orderId} გზაშია 🚚`,
      heading: 'შენი შეკვეთა გზაშია',
      body: [hi(l, d.firstName), `შეკვეთა <strong>#${orderId}</strong> გამოიგზავნა.`, ...(tracking ? [tracking] : [])],
      button: { text: 'ჩემი შეკვეთები', url },
    } : {
      subject: `Your order #${orderId} is on its way 🚚`,
      heading: 'Your order is on its way',
      body: [hi(l, d.firstName), `Order <strong>#${orderId}</strong> has shipped.`, ...(tracking ? [tracking] : [])],
      button: { text: 'My orders', url },
    });
  }

  async sendBoxShipped(d: { email: string; firstName: string; language?: string | null; dogName: string | null; boxNumber: number; boxesTotal: number; trackingNumber: string | null }) {
    const l = lang(d.language);
    const url = `${this.siteUrl}/account/subscriptions`;
    const n = `${d.boxNumber}/${d.boxesTotal}`;
    const tracking = d.trackingNumber ? (l === 'ka' ? `თრექინგის ნომერი: <strong>${esc(d.trackingNumber)}</strong>` : `Tracking number: <strong>${esc(d.trackingNumber)}</strong>`) : '';
    const vars = { firstName: d.firstName, dogName: d.dogName ?? '', boxNumber: String(d.boxNumber), boxesTotal: String(d.boxesTotal), trackingNumber: d.trackingNumber ?? '', accountUrl: url };
    await this.deliver(d.email, 'box_shipped', l, vars, l === 'ka' ? {
      subject: `კოლოფი ${n} გზაშია 📦`,
      heading: 'შენი კოლოფი გზაშია',
      body: [hi(l, d.firstName), `კოლოფი <strong>${n}</strong>${d.dogName ? ` (${esc(d.dogName)})` : ''} ახლახან გამოგიგზავნეთ.`, ...(tracking ? [tracking] : [])],
      button: { text: 'ჩემი კოლოფები', url },
    } : {
      subject: `Box ${d.boxNumber} of ${d.boxesTotal} is on its way${d.dogName ? ` to ${d.dogName}` : ''} 📦`,
      heading: 'Your box is on its way',
      body: [hi(l, d.firstName), `Box <strong>${d.boxNumber} of ${d.boxesTotal}</strong>${d.dogName ? ` for ${esc(d.dogName)}` : ''} has just left us.`, ...(tracking ? [tracking] : [])],
      button: { text: 'My boxes', url },
    });
  }

  /**
   * The gift card. This email is the only way the recipient learns the gift
   * exists, and the claim link is its only credential — until they follow it
   * the subscription has no dog and no address, so nothing can ship.
   * Written in the buyer's language: we know nothing about the recipient yet.
   */
  async sendGiftCard(d: { recipientEmail: string; recipientName: string; buyerName: string; planName: string; message?: string; claimToken: string; language?: string | null }) {
    const l = lang(d.language);
    const url = `${this.siteUrl}/gift/${d.claimToken}`;
    const note = d.message
      ? `<span style="display:block;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;font-style:italic;color:#92400e">“${esc(d.message)}”<br><span style="font-style:normal;font-size:13px;color:#b45309">— ${esc(d.buyerName)}</span></span>`
      : '';
    const vars = { recipientName: d.recipientName, buyerName: d.buyerName, planName: d.planName, message: d.message ?? '', claimUrl: url, siteUrl: this.siteUrl };
    await this.deliver(d.recipientEmail, 'gift_card', l, vars, l === 'ka' ? {
      subject: 'შენს ძაღლს Pupbox აჩუქეს! 🎁',
      heading: '🎁 შენ საჩუქარი მიიღე',
      body: [hi(l, d.recipientName), `<strong>${esc(d.planName)}</strong> გამოწერა საჩუქრად შენი ძაღლისთვის. გამომგზავნი: <strong>${esc(d.buyerName)}</strong>.`, ...(note ? [note] : []),
        'მოგვიყევი შენი ძაღლის შესახებ — ზომა, ჯიში და ალერგიები — და ყოველ კოლოფს მას მოვარგებთ. ერთი წუთი დაგჭირდება.'],
      button: { text: 'საჩუქრის მიღება →', url },
      after: [`თუ ღილაკი არ მუშაობს, ეს ბმული ბრაუზერში ჩასვი:<br>${url}`],
    } : {
      subject: `${d.buyerName} sent your dog a Pupbox gift! 🎁`,
      heading: "🎁 You've been given a Pupbox!",
      body: [hi(l, d.recipientName), `<strong>${esc(d.buyerName)}</strong> has given your dog a <strong>${esc(d.planName)}</strong> subscription.`, ...(note ? [note] : []),
        "Tell us about your dog — size, breed and any allergies — and we'll tailor every box to them. It takes a minute."],
      button: { text: 'Claim your gift →', url },
      after: [`If the button doesn't work, paste this into your browser:<br>${url}`],
    });
  }

  async sendReferralReward(d: { email: string; firstName: string; couponCode: string; language?: string | null }) {
    const l = lang(d.language);
    const url = `${this.siteUrl}/shop`;
    await this.deliver(d.email, 'referral_reward', l, { firstName: d.firstName, couponCode: d.couponCode, siteUrl: this.siteUrl }, l === 'ka' ? {
      subject: 'შენ მიიღე ₾10-იანი კუპონი! 🎁',
      heading: 'მადლობა რეკომენდაციისთვის',
      body: [hi(l, d.firstName), `შენმა მეგობარმა პირველი შეკვეთა გააკეთა — აი შენი ₾10-იანი კუპონი: <strong>${esc(d.couponCode)}</strong>. გამოიყენე შემდეგ შეკვეთაზე.`],
      button: { text: 'მაღაზიაში გადასვლა', url },
    } : {
      subject: 'You earned a ₾10 reward coupon! 🎁',
      heading: 'Thanks for the recommendation',
      body: [hi(l, d.firstName), `Your friend just placed their first order — here's your ₾10 coupon: <strong>${esc(d.couponCode)}</strong>. Use it on your next order.`],
      button: { text: 'Shop now', url },
    });
  }

  async sendPasswordReset(d: { email: string; firstName: string; language?: string | null; token: string }) {
    const l = lang(d.language);
    const url = `${this.siteUrl}/reset-password?token=${encodeURIComponent(d.token)}`;
    // Without an email service in development, the link is the only way to test the flow.
    if (!this.apiKey && this.config.get('NODE_ENV') !== 'production') this.logger.warn(`Password reset link (development only): ${url}`);
    await this.deliver(d.email, 'password_reset', l, { firstName: d.firstName, resetUrl: url }, l === 'ka' ? {
      subject: 'Pupbox-ის პაროლის აღდგენა',
      heading: 'ახალი პაროლის დაყენება',
      body: [hi(l, d.firstName), 'მივიღეთ მოთხოვნა შენი Pupbox-ის პაროლის აღდგენაზე. ბმული ერთი საათის განმავლობაში მოქმედებს და მხოლოდ ერთხელ გამოიყენება.'],
      button: { text: 'ახალი პაროლის დაყენება', url },
      after: ['თუ ეს შენ არ იყავი, უბრალოდ უგულებელყავი ეს წერილი — პაროლი არ შეიცვლება.'],
    } : {
      subject: 'Reset your Pupbox password',
      heading: 'Set a new password',
      body: [hi(l, d.firstName), 'We got a request to reset your Pupbox password. The link works for one hour, once.'],
      button: { text: 'Set a new password', url },
      after: ["If it wasn't you, ignore this email — your password stays the same."],
    });
  }
}
