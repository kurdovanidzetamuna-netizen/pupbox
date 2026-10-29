import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { marketingSettings, type MarketingSettings } from './marketing-settings';

const GRAPH = 'https://graph.facebook.com/v23.0';
// Read when used: .env is loaded after this file.
const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge').replace(/\/$/, '');
const DEMO = /@pupbox\.(dev|test)$/i;

/** What the site sends with an order so ads can be credited (see CheckoutService.createOrder). */
export interface OrderTracking {
  /** 'all' = the visitor accepted ads and analytics cookies; anything else = only what the site needs. */
  consent?: string;
  fbp?: string; fbc?: string; gclid?: string; ttclid?: string;
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
  landing?: string; referrer?: string;
  ip?: string; ua?: string;
}

/** Meta wants personal details lower-cased, trimmed and SHA-256 hashed; it never receives them in the clear. */
const hash = (v: string | null | undefined) => (v && v.trim() ? createHash('sha256').update(v.trim().toLowerCase()).digest('hex') : undefined);
const phoneDigits = (p?: string | null) => {
  const d = (p ?? '').replace(/\D/g, '');
  return d ? (d.startsWith('995') ? d : d.length === 9 ? `995${d}` : d) : undefined;
};

type Result = { at: string; ok: boolean; event: string; message: string };

/**
 * Meta Conversions API: tells Meta about a purchase from our server, so
 * ads are credited even when a browser blocks the pixel. The browser pixel
 * reports the same purchase with the order id as its event ID, and Meta
 * counts the pair once. Sent only when the buyer accepted ad cookies.
 * Never throws: a report that can't go out is logged and the order carries on.
 */
@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);
  /** The latest sends, for admin to see the connection working. */
  readonly recent: Result[] = [];
  constructor(private prisma: PrismaService) {}

  private remember(r: Omit<Result, 'at'>) {
    this.recent.unshift({ at: new Date().toISOString(), ...r });
    this.recent.length = Math.min(this.recent.length, 15);
  }

  private async send(cfg: MarketingSettings, events: any[], label: string): Promise<Result> {
    const body = { data: events, ...(cfg.meta.testCode ? { test_event_code: cfg.meta.testCode } : {}) };
    try {
      const res = await fetch(`${GRAPH}/${cfg.meta.pixel}/events?access_token=${encodeURIComponent(cfg.meta.token)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
      });
      const out: any = await res.json().catch(() => ({}));
      const ok = res.ok && !out?.error;
      const message = ok ? `Meta received ${out?.events_received ?? events.length} event(s)` : out?.error?.error_user_msg || out?.error?.message || `HTTP ${res.status}`;
      if (!ok) this.logger.warn(`Meta ${label} not accepted: ${message}`);
      this.remember({ ok, event: label, message });
      return { at: new Date().toISOString(), ok, event: label, message };
    } catch (e: any) {
      const message = e?.name === 'TimeoutError' ? 'Meta didn’t answer in 10 seconds' : e?.message ?? 'Network error';
      this.logger.warn(`Meta ${label} failed: ${message}`);
      this.remember({ ok: false, event: label, message });
      return { at: new Date().toISOString(), ok: false, event: label, message };
    }
  }

  /** A paid order → one Purchase event, if the Conversions API is on and the buyer agreed. */
  async orderPaid(orderId: string) {
    try {
      const cfg = await marketingSettings(this.prisma);
      if (!cfg.meta.capi || !cfg.meta.pixel || !cfg.meta.token) return;
      const o = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          address: { select: { city: true, phone: true } },
          items: { select: { productId: true, subscriptionPlanId: true, quantity: true, price: true } },
        },
      });
      if (!o || DEMO.test(o.user.email)) return;
      const t = (o.tracking ?? {}) as OrderTracking;
      if (t.consent !== 'all') return;
      const event = {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: o.id,
        action_source: 'website',
        event_source_url: `${site()}/ka/checkout/thank-you`,
        user_data: {
          em: [hash(o.user.email)].filter(Boolean),
          ph: [hash(phoneDigits(o.address?.phone || o.user.phone))].filter(Boolean),
          fn: [hash(o.user.firstName)].filter(Boolean),
          ln: [hash(o.user.lastName)].filter(Boolean),
          ct: [hash(o.address?.city?.replace(/\s/g, ''))].filter(Boolean),
          country: [hash('ge')],
          external_id: [hash(o.user.id)],
          ...(t.ip ? { client_ip_address: t.ip } : {}),
          ...(t.ua ? { client_user_agent: t.ua } : {}),
          ...(t.fbp ? { fbp: t.fbp } : {}),
          ...(t.fbc ? { fbc: t.fbc } : {}),
        },
        custom_data: {
          currency: 'GEL',
          value: Number(o.total),
          order_id: o.orderNumber,
          content_type: 'product',
          content_ids: o.items.map((i) => i.productId || i.subscriptionPlanId).filter(Boolean),
          contents: o.items.map((i) => ({ id: i.productId || i.subscriptionPlanId, quantity: i.quantity, item_price: Number(i.price) })),
          num_items: o.items.reduce((n, i) => n + i.quantity, 0),
        },
      };
      await this.send(cfg, [event], `Purchase ₾${Number(o.total).toFixed(2)}`);
    } catch (e: any) { this.logger.error(`Meta purchase report failed for ${orderId}: ${e.message}`); }
  }

  /** Admin's "Send a test event": checks the pixel ID and token together. */
  async test(): Promise<Result> {
    const cfg = await marketingSettings(this.prisma);
    if (!cfg.meta.pixel || !cfg.meta.token) return { at: new Date().toISOString(), ok: false, event: 'Test', message: 'Add the pixel ID and the access token first.' };
    return this.send(cfg, [{
      event_name: 'PageView',
      event_time: Math.floor(Date.now() / 1000),
      event_id: `test-${Date.now()}`,
      action_source: 'website',
      event_source_url: `${site()}/ka`,
      user_data: { external_id: [hash('pupbox-admin-test')], client_user_agent: 'PupBox admin test' },
    }], cfg.meta.testCode ? 'Test (shows under Test events)' : 'Test');
  }
}
