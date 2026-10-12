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
  /** Building your own box: at least this many items, a packing fee, and % off the products for a monthly box. */
  customBox: { minItems: number; packingFee: number; monthlyDiscount: number };
}

const DEFAULTS: ShopSettings = {
  freeCancelHours: 12, renewalNoticeDays: 7, renewalGraceDays: 3, orderNotifyEmail: '',
  customBox: { minItems: 3, packingFee: 5, monthlyDiscount: 10 },
};

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
    customBox: {
      minItems: Math.max(1, Math.round(num(c.customBox?.minItems, DEFAULTS.customBox.minItems, 50))),
      packingFee: num(c.customBox?.packingFee, DEFAULTS.customBox.packingFee, 500),
      monthlyDiscount: num(c.customBox?.monthlyDiscount, DEFAULTS.customBox.monthlyDiscount, 90),
    },
  };
}
