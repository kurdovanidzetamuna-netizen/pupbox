import type { PrismaService } from '../prisma/prisma.service';

/** Shop rules admin edits on the Settings page, stored as the CMS row `config-settings`. */
export const SETTINGS_SLUG = 'config-settings';

export interface ShopSettings {
  /** Cancelling within this many hours of paying (before any box ships) is free. */
  freeCancelHours: number;
  /** A renewal reminder with a payment link goes out this many days before a term ends. */
  renewalNoticeDays: number;
  /** A renewal not paid this many days after the term ended lets the plan end. */
  renewalGraceDays: number;
  /** Where "new order" emails go; empty = none. */
  orderNotifyEmail: string;
}

const DEFAULTS: ShopSettings = { freeCancelHours: 12, renewalNoticeDays: 7, renewalGraceDays: 3, orderNotifyEmail: '' };

const num = (v: unknown, fallback: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : fallback;
};

export async function shopSettings(prisma: PrismaService): Promise<ShopSettings> {
  const row = await prisma.cMSPage.findUnique({ where: { slug: SETTINGS_SLUG }, select: { content: true } });
  const c = (row?.content ?? {}) as any;
  return {
    freeCancelHours: num(c.cancellation?.freeHours, DEFAULTS.freeCancelHours, 720),
    renewalNoticeDays: num(c.renewal?.noticeDays, DEFAULTS.renewalNoticeDays, 60),
    renewalGraceDays: num(c.renewal?.graceDays, DEFAULTS.renewalGraceDays, 60),
    orderNotifyEmail: typeof c.notifications?.orderEmail === 'string' ? c.notifications.orderEmail.trim() : '',
  };
}
