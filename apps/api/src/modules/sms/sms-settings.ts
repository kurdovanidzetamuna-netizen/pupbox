import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { normalisePhone } from '../auth/verification';

/**
 * Everything about text messages that admin can change on the "Text
 * messages" page, kept in its own private CMS row (`config-sms`) because it
 * holds the Wifisher API key: the general CMS endpoints never read or write
 * it (see cms.controller.ts), only admin/sms/settings does, and the key
 * always goes back masked.
 */
export const SMS_SLUG = 'config-sms';

/** Customer messages that can be switched on/off (codes always go: sign-up needs them). */
export const CUSTOMER_KINDS = ['ORDER_CUSTOMER', 'WELCOME', 'PAYMENT_FAILED', 'PAYMENT_RECOVERED', 'REFUND', 'EXTRA_CHARGE'] as const;
/** What a team number can get. */
export const TEAM_TOPICS = ['orders', 'signups', 'payments'] as const;
export type TeamTopic = (typeof TEAM_TOPICS)[number];

/**
 * The words of each customer text, in both languages, with {{fill-ins}}.
 * Admin can reword them (Text messages → Wording); what isn't changed uses these.
 */
export const SMS_TEXTS: Record<string, { label: string; fillIns: string[]; en: string; ka: string }> = {
  ORDER_CUSTOMER: { label: 'Order paid', fillIns: ['firstName', 'orderId', 'items', 'total'],
    en: 'PupBox: Thank you, {{firstName}}! Order #{{orderId}} is paid — {{items}}, {{total}}. We’ll let you know when it ships.',
    ka: 'PupBox: მადლობა, {{firstName}}! შეკვეთა #{{orderId}} გადახდილია — {{items}}, {{total}}. გაგზავნისას შეგატყობინებთ.' },
  WELCOME: { label: 'Welcome after sign-up', fillIns: ['firstName'],
    en: 'PupBox: Welcome, {{firstName}}! Your account is ready. Tell us about your dog and pick a box: pupbox.ge',
    ka: 'PupBox: მოგესალმებით, {{firstName}}! ანგარიში შექმნილია. მოგვიყევით თქვენს ძაღლზე და აირჩიეთ კოლოფი: pupbox.ge' },
  RENEWAL_RETRY: { label: 'Renewal declined — we’ll try again', fillIns: ['amount', 'nextTry'],
    en: 'PupBox: Your plan renewal ({{amount}}) didn’t go through. We’ll try again {{nextTry}}, or pay now: pupbox.ge/account/subscriptions',
    ka: 'PupBox: გეგმის განახლება ({{amount}}) ვერ გადაიხადა. ხელახლა ვცდით {{nextTry}}, ან გადაიხადეთ ახლა: pupbox.ge/account/subscriptions' },
  RENEWAL_REFUSED: { label: 'Renewal card refused for good', fillIns: ['amount'],
    en: 'PupBox: Your card was declined for your plan renewal ({{amount}}). Please pay with another card: pupbox.ge/account/subscriptions',
    ka: 'PupBox: გეგმის განახლებისას ({{amount}}) ბარათმა უარი თქვა. გთხოვთ, გადაიხადოთ სხვა ბარათით: pupbox.ge/account/subscriptions' },
  RENEWAL_ENDED: { label: 'Plan ended after the last try', fillIns: ['tries'],
    en: 'PupBox: We couldn’t renew your plan — the card was declined {{tries}} times, so it has ended. Restart any time: pupbox.ge/account',
    ka: 'PupBox: გეგმის განახლება ვერ მოხერხდა — ბარათმა {{tries}}-ჯერ უარი თქვა, ამიტომ გეგმა დასრულდა. თავიდან დაწყება ნებისმიერ დროს: pupbox.ge/account' },
  PAYMENT_RECOVERED: { label: 'Renewal paid after a retry', fillIns: ['amount'],
    en: 'PupBox: Payment received ({{amount}}) — your plan continues. Thank you!',
    ka: 'PupBox: გადახდა მიღებულია ({{amount}}) — თქვენი გეგმა გრძელდება. მადლობა!' },
  REFUND: { label: 'Money refunded', fillIns: ['amount', 'orderId', 'card'],
    en: 'PupBox: We’ve refunded {{amount}} for order #{{orderId}}{{card}}. It can take 3–5 working days to show.',
    ka: 'PupBox: შეკვეთა #{{orderId}}-ზე დაგიბრუნეთ {{amount}}{{card}}. ასახვას 3–5 სამუშაო დღე შეიძლება დასჭირდეს.' },
  EXTRA_CHARGE: { label: 'Extra payment for added items', fillIns: ['orderId', 'amount'],
    en: 'PupBox: We added items to your order #{{orderId}} as you asked. Please pay the difference of {{amount}} here: pupbox.ge/account/orders',
    ka: 'PupBox: თქვენი თხოვნით შეკვეთა #{{orderId}}-ს ნივთები დავამატეთ. გთხოვთ, გადაიხადოთ სხვაობა {{amount}} აქ: pupbox.ge/account/orders' },
};

/** One customer text in their language: admin's words if saved, else the built-in ones. */
export function smsText(cfg: SmsSettings, key: keyof typeof SMS_TEXTS & string, language: string | null | undefined, vars: Record<string, string | number>) {
  const l = language === 'en' ? 'en' : 'ka';
  const words = cfg.texts?.[key]?.[l]?.trim() || SMS_TEXTS[key][l];
  return words.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? '')).replace(/\s{2,}/g, ' ').trim();
}

export type TeamNumber = { name: string; phone: string; active: boolean; topics: TeamTopic[] };
export interface SmsSettings {
  /** Main switch for every message except codes. */
  enabled: boolean;
  /** Overrides WIFISHER_API_KEY / WIFISHER_SENDER from the server's .env when set. */
  apiKey: string;
  sender: string;
  team: TeamNumber[];
  customer: Record<(typeof CUSTOMER_KINDS)[number], boolean>;
  /** Customer messages (not codes) wait until the morning. Tbilisi time, "HH:MM". */
  quiet: { enabled: boolean; from: string; to: string; team: boolean };
  /** Sign-up and number-change codes. */
  codes: { resendSeconds: number; perHour: number; validMinutes: number };
  /** Card renewals: hours after the first try for each retry, and which tries text the customer. */
  retries: { afterHours: number[]; textOnTries: number[] };
  /** Admin's own wording per text and language; missing ones use SMS_TEXTS. */
  texts: Record<string, { en?: string; ka?: string }>;
}

export const SMS_DEFAULTS: SmsSettings = {
  enabled: true, apiKey: '', sender: '',
  team: [],
  customer: { ORDER_CUSTOMER: true, WELCOME: true, PAYMENT_FAILED: true, PAYMENT_RECOVERED: true, REFUND: true, EXTRA_CHARGE: true },
  quiet: { enabled: true, from: '22:00', to: '09:00', team: false },
  codes: { resendSeconds: 60, perHour: 5, validMinutes: 10 },
  retries: { afterHours: [3, 7, 24, 48, 216, 384, 552], textOnTries: [1, 4, 6, 7, 8] },
  texts: {},
};

const int = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
const time = (v: unknown, fallback: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback);

/** Cleans whatever is stored (or sent by admin) into a valid SmsSettings; unknown/bad values fall back to defaults. */
export function cleanSms(c: any, legacy?: any): SmsSettings {
  c = c ?? {};
  const team: TeamNumber[] = Array.isArray(c.team)
    ? c.team.map((t: any) => ({
      name: String(t?.name ?? '').trim().slice(0, 40),
      phone: normalisePhone(t?.phone) ?? '',
      active: t?.active !== false,
      topics: Array.isArray(t?.topics) ? TEAM_TOPICS.filter((x) => t.topics.includes(x)) : [...TEAM_TOPICS],
    })).filter((t: TeamNumber) => t.phone).slice(0, 20)
    // Before this page existed the team numbers and switches lived in config-settings.sms.
    : String(legacy?.adminNumbers ?? '').split(/[,;\n]/).map((x) => normalisePhone(x.trim())).filter(Boolean).map((phone) => ({
      name: '', phone: phone!, active: true,
      topics: TEAM_TOPICS.filter((x) => (x === 'orders' ? legacy?.orderAdmin : x === 'signups' ? legacy?.signupAdmin : legacy?.paymentAdmin) !== false),
    }));
  const legacyCustomer = (k: string) => (k === 'ORDER_CUSTOMER' ? legacy?.orderCustomer : k === 'WELCOME' ? legacy?.signupCustomer : legacy?.paymentCustomer) !== false;
  const customer = Object.fromEntries(CUSTOMER_KINDS.map((k) => [k, typeof c.customer?.[k] === 'boolean' ? c.customer[k] : legacyCustomer(k)])) as SmsSettings['customer'];

  // Retries: rising, at least an hour apart from the start, at most 60 days, 1–12 of them.
  const hours = Array.isArray(c.retries?.afterHours) ? c.retries.afterHours.map(Number).filter((n: number) => Number.isFinite(n) && n >= 1 && n <= 1440).map(Math.round) : null;
  const afterHours = hours && hours.length ? [...new Set<number>(hours)].sort((a, b) => a - b).slice(0, 12) : SMS_DEFAULTS.retries.afterHours;
  const tries = afterHours.length + 1;
  const textOnTries = Array.isArray(c.retries?.textOnTries)
    ? [...new Set<number>(c.retries.textOnTries.map(Number).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= tries))].sort((a, b) => a - b)
    : SMS_DEFAULTS.retries.textOnTries.filter((n) => n <= tries);

  return {
    enabled: c.enabled !== false,
    apiKey: typeof c.apiKey === 'string' ? c.apiKey.trim().slice(0, 300) : '',
    sender: typeof c.sender === 'string' ? c.sender.trim().slice(0, 11) : '',
    team, customer,
    quiet: { enabled: c.quiet?.enabled !== false, from: time(c.quiet?.from, SMS_DEFAULTS.quiet.from), to: time(c.quiet?.to, SMS_DEFAULTS.quiet.to), team: c.quiet?.team === true },
    codes: {
      resendSeconds: int(c.codes?.resendSeconds, SMS_DEFAULTS.codes.resendSeconds, 30, 600),
      perHour: int(c.codes?.perHour, SMS_DEFAULTS.codes.perHour, 1, 20),
      validMinutes: int(c.codes?.validMinutes, SMS_DEFAULTS.codes.validMinutes, 2, 60),
    },
    retries: { afterHours, textOnTries },
    // Only known texts; a wording equal to the built-in one isn't stored.
    texts: Object.fromEntries(Object.keys(SMS_TEXTS).map((k) => {
      const t = c.texts?.[k] ?? {};
      const one = (l: 'en' | 'ka') => (typeof t[l] === 'string' && t[l].trim() && t[l].trim() !== SMS_TEXTS[k][l] ? t[l].trim().slice(0, 480) : undefined);
      return [k, { en: one('en'), ka: one('ka') }];
    }).filter(([, v]) => (v as any).en || (v as any).ka)),
  };
}

// Read on every message and charge; a short cache keeps that cheap.
let cache: { at: number; value: SmsSettings } | null = null;
export function forgetSmsSettings() { cache = null; }

export async function smsSettings(prisma: PrismaService): Promise<SmsSettings> {
  if (cache && Date.now() - cache.at < 15_000) return cache.value;
  const [row, legacy] = await Promise.all([
    prisma.cMSPage.findUnique({ where: { slug: SMS_SLUG }, select: { content: true } }),
    prisma.cMSPage.findUnique({ where: { slug: 'config-settings' }, select: { content: true } }),
  ]);
  const value = cleanSms(row?.content ?? {}, (legacy?.content as any)?.sms);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSmsSettings(prisma: PrismaService, input: any) {
  for (const t of Array.isArray(input?.team) ? input.team : []) {
    if (!normalisePhone(t?.phone)) throw new BadRequestException(`“${String(t?.phone ?? '').slice(0, 30)}” isn’t a valid mobile number. Write it like 599 12 34 56.`);
  }
  const hours = input?.retries?.afterHours;
  if (Array.isArray(hours) && hours.some((h: any) => !(Number(h) >= 1 && Number(h) <= 1440))) throw new BadRequestException('Each retry must be between 1 hour and 60 days after the first try.');
  const current = await smsSettings(prisma);
  // The key comes back masked; only a new one (or "" to remove it) replaces it.
  const apiKey = input?.apiKey === undefined || input.apiKey === maskKey(current.apiKey) ? current.apiKey : String(input.apiKey);
  const value = cleanSms({ ...input, apiKey });
  await prisma.cMSPage.upsert({
    where: { slug: SMS_SLUG },
    update: { content: value as any },
    create: { key: SMS_SLUG, slug: SMS_SLUG, title: 'Text message settings', status: 'DRAFT', content: value as any },
  });
  forgetSmsSettings();
  return value;
}

export const maskKey = (k: string) => (k ? `••••••${k.slice(-4)}` : '');

/** Is it quiet time now (Tbilisi)? If so, when it ends. */
export function quietUntil(q: SmsSettings['quiet'], now = new Date()): Date | null {
  if (!q.enabled || q.from === q.to) return null;
  const local = new Date(now.getTime() + 4 * 3600_000);
  const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
  const [fh, fm] = q.from.split(':').map(Number), [th, tm] = q.to.split(':').map(Number);
  const from = fh * 60 + fm, to = th * 60 + tm;
  const inside = from < to ? mins >= from && mins < to : mins >= from || mins < to;
  if (!inside) return null;
  const end = new Date(local);
  end.setUTCHours(th, tm, 0, 0);
  if (end <= local) end.setUTCDate(end.getUTCDate() + 1);
  return new Date(end.getTime() - 4 * 3600_000);
}
