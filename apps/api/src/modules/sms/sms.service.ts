import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { smsSettings } from './sms-settings';

/** Why a message went out — kept on its log row. */
export type SmsKind = 'OTP' | 'WELCOME' | 'NEW_CUSTOMER_ADMIN' | 'ORDER_CUSTOMER' | 'ORDER_ADMIN' | 'PAYMENT_FAILED' | 'PAYMENT_FAILED_ADMIN' | 'PAYMENT_RECOVERED' | 'REFUND' | 'EXTRA_CHARGE' | 'TEST';
export type SmsMeta = { kind: SmsKind; userId?: string | null; orderId?: string | null; /** Hidden in the log (a code). */ secret?: string };

/** What the customer sees, with the real reason kept for the log. */
const failure = (reason: string) => Object.assign(new ServiceUnavailableException('We couldn’t send the text message. Please try again in a minute.'), { reason });

type WifisherReply = { status?: number; success?: boolean; data?: any; error?: { code?: number; message?: string } };

/**
 * Text messages, sent through Wifisher (https://sms-api.wifisher.com, API v2).
 * The API key and sender name come from admin → Text messages, or else from
 * the server's .env:
 *   SMS_PROVIDER=wifisher
 *   WIFISHER_API_KEY=…            from the Wifisher dashboard
 *   WIFISHER_SENDER=pupbox        the sender name Wifisher approved
 * With no key anywhere, development writes the message to the server log so
 * codes can be read there; production refuses instead of pretending a code
 * went out.
 *
 * A message can be held until later (quiet hours): it's logged as QUEUED
 * with a time, and a job sends it then.
 */
@Injectable()
export class SmsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsService.name);
  private timer?: NodeJS.Timeout;

  constructor(private config: ConfigService, private prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => this.sendQueued().catch((e) => this.logger.error(`Queued SMS run failed: ${e.message}`)), 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { clearInterval(this.timer); }

  private get isProduction() { return this.config.get('NODE_ENV') === 'production'; }
  private get base() { return (this.config.get<string>('WIFISHER_URL') || 'https://sms-api.wifisher.com/api/v2').replace(/\/$/, ''); }
  /** Who sends: admin's key and sender first, then .env. */
  private async conn() {
    const s = await smsSettings(this.prisma);
    const key = s.apiKey || this.config.get<string>('WIFISHER_API_KEY') || '';
    const env = (this.config.get<string>('SMS_PROVIDER') || '').toLowerCase();
    return {
      provider: s.apiKey ? 'wifisher' : env,
      key, keyFrom: s.apiKey ? 'admin' : key ? 'server' : '',
      sender: s.sender || this.config.get<string>('WIFISHER_SENDER') || 'pupbox',
    };
  }

  /**
   * Sends one message and keeps a log row of it (sent, failed, or skipped
   * when SMS isn't set up). Throws when it couldn't be sent, so a caller
   * waiting on a code can tell the customer; notifications catch and move on.
   */
  async send(to: string, text: string, meta: SmsMeta = { kind: 'TEST' }, opts: { sendAt?: Date | null } = {}) {
    const logged = meta.secret ? text.split(meta.secret).join('••••••') : text;
    const log = (status: 'SENT' | 'FAILED' | 'SKIPPED' | 'QUEUED', extra: { providerId?: string | null; error?: string; sendAt?: Date } = {}) =>
      this.prisma.smsLog.create({ data: { to, kind: meta.kind, status, text: logged.slice(0, 480), userId: meta.userId ?? null, orderId: meta.orderId ?? null, ...extra } })
        .catch((e) => this.logger.error(`SMS log not saved: ${e.message}`));
    // Quiet hours: kept and sent later (never a code — those carry a secret and are needed now).
    if (opts.sendAt && opts.sendAt.getTime() > Date.now() && !meta.secret) {
      await log('QUEUED', { sendAt: opts.sendAt });
      return { id: null, queued: opts.sendAt };
    }
    const c = await this.conn();
    if (!c.provider) {
      await log('SKIPPED', { error: 'SMS not set up' });
      if (this.isProduction) throw new ServiceUnavailableException('Text messages are not set up yet. Please try again later.');
      this.logger.warn(`SMS not sent (no SMS_PROVIDER; development only): to=${to} text="${text}"`);
      return { id: null };
    }
    try {
      const r = await this.deliver(to, text, c);
      await log('SENT', { providerId: r.id != null ? String(r.id) : null });
      return r;
    } catch (e: any) {
      await log('FAILED', { error: e?.reason || e?.message });
      throw e;
    }
  }


  /** Wifisher wants the number with its country code and no "+": 995599123456. */
  private number(to: string) { return to.replace(/[^\d]/g, '').replace(/^00/, ''); }

  /** Sends what was held for quiet hours once its time comes. Each row is claimed first, so it goes once. */
  async sendQueued(now = new Date()) {
    const due = await this.prisma.smsLog.findMany({ where: { status: 'QUEUED', sendAt: { lte: now } }, orderBy: { sendAt: 'asc' }, take: 50 });
    if (!due.length) return 0;
    const c = await this.conn();
    let sent = 0;
    for (const m of due) {
      const { count } = await this.prisma.smsLog.updateMany({ where: { id: m.id, status: 'QUEUED' }, data: { status: 'SENDING' } });
      if (!count) continue;
      try {
        if (!c.provider) throw Object.assign(new Error('SMS not set up'), { skip: true });
        const r = await this.deliver(m.to, m.text, c);
        await this.prisma.smsLog.update({ where: { id: m.id }, data: { status: 'SENT', providerId: r.id != null ? String(r.id) : null } });
        sent++;
      } catch (e: any) {
        await this.prisma.smsLog.update({ where: { id: m.id }, data: { status: e?.skip ? 'SKIPPED' : 'FAILED', error: String(e?.reason || e?.message).slice(0, 300) } });
      }
    }
    return sent;
  }

  private async call(path: string, c: { key: string }, init: RequestInit = {}): Promise<WifisherReply> {
    if (!c.key) throw new ServiceUnavailableException('Text messages are not set up yet (no Wifisher key).');
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: { 'api-key': c.key, Accept: 'application/json', ...(init.headers || {}) },
      // A slow gateway mustn't hold a sign-up for ever.
      signal: AbortSignal.timeout(10_000),
    }).catch((e) => {
      this.logger.error(`Wifisher unreachable: ${e?.message ?? e}`);
      throw failure(`Wifisher unreachable: ${e?.message ?? e}`);
    });
    const body = (await res.json().catch(() => ({}))) as WifisherReply;
    if (!res.ok || body.success === false) {
      const why = body.error?.message || `HTTP ${res.status}`;
      // Balance, key and sender problems are ours to fix, not the customer's.
      this.logger.error(`Wifisher ${path} failed (${body.error?.code ?? res.status}): ${why}`);
      throw failure(why);
    }
    return body;
  }

  private async deliver(to: string, text: string, c: { provider: string; key: string; sender: string }) {
    if (c.provider !== 'wifisher') throw new ServiceUnavailableException(`SMS provider "${c.provider}" is not supported.`);
    const form = new FormData();
    form.append('from', c.sender);
    form.append('to', this.number(to));
    form.append('content', text);
    const reply = await this.call('/send', c, { method: 'POST', body: form });
    const id = reply.data?.message_id ?? reply.data?.id ?? reply.data;
    this.logger.log(`SMS sent to ${this.number(to).slice(0, 6)}•••${this.number(to).slice(-2)}${id && typeof id !== 'object' ? ` (id ${id})` : ''}`);
    return { id: typeof id === 'object' ? null : id ?? null };
  }

  /** For admin: is it set up, how many messages are left, which sender names exist. */
  async status() {
    const c = await this.conn();
    const configured = c.provider === 'wifisher' && !!c.key && !!c.sender;
    const out: { provider: string; configured: boolean; sender: string; keyFrom: string; balance: number | null; senders: string[]; error: string | null; queued: number } = {
      provider: c.provider || 'none', configured, sender: c.sender, keyFrom: c.keyFrom, balance: null, senders: [], error: null,
      queued: await this.prisma.smsLog.count({ where: { status: 'QUEUED' } }),
    };
    if (c.provider !== 'wifisher' || !c.key) return out;
    try {
      const b = await this.call('/balance', c);
      out.balance = Number(b.data?.sms_balance ?? b.data?.balance ?? NaN);
      if (Number.isNaN(out.balance)) out.balance = null;
      const s = await this.call('/senderNames', c);
      const d = s.data;
      out.senders = Array.isArray(d) ? d.map(String) : d && typeof d === 'object' ? Object.values(d).map(String) : d ? [String(d)] : [];
    } catch {
      out.error = 'Wifisher didn’t answer — check the API key.';
    }
    return out;
  }
}
