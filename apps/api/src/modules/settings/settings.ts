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
  /** A friend's referral code used as a promo code: what the friend gets on their first order, and what the inviter gets. */
  referral: ReferralOffer;
  /** Building your own box: at least this many items, a packing fee, and % off the products for a monthly box. */
  customBox: {
    minItems: number; packingFee: number; monthlyDiscount: number;
    /** Surprise items: on/off, price each, and at most this many per box. */
    mystery: { enabled: boolean; price: number; max: number };
  };
}

export type ReferralScope = 'BOX' | 'SHOP' | 'CUSTOM_BOX' | 'GIFT';
export const REFERRAL_SCOPES: ReferralScope[] = ['BOX', 'SHOP', 'CUSTOM_BOX', 'GIFT'];
export interface ReferralOffer {
  enabled: boolean;
  /** The friend's first-order discount. */
  friendType: 'PERCENTAGE' | 'FIXED';
  friendValue: number;
  /** Which parts of the order it applies to: plans, shop products, built boxes, plans given as a gift. */
  appliesTo: ReferralScope[];
  /** The order's items must come to at least this much. */
  minOrder: number;
  /** The inviter's coupon once the friend's first order sticks (₾). */
  inviterReward: number;
}
export const REFERRAL_DEFAULTS: ReferralOffer = { enabled: true, friendType: 'PERCENTAGE', friendValue: 10, appliesTo: [...REFERRAL_SCOPES], minOrder: 0, inviterReward: 10 };

export function cleanReferral(r: any): ReferralOffer {
  r = r ?? {};
  const friendType = r.friendType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
  return {
    enabled: r.enabled !== false,
    friendType,
    friendValue: num(r.friendValue, REFERRAL_DEFAULTS.friendValue, friendType === 'PERCENTAGE' ? 90 : 1000),
    appliesTo: Array.isArray(r.appliesTo) ? REFERRAL_SCOPES.filter((x) => r.appliesTo.includes(x)) : [...REFERRAL_SCOPES],
    minOrder: num(r.minOrder, 0, 10000),
    inviterReward: num(r.inviterReward, REFERRAL_DEFAULTS.inviterReward, 1000),
  };
}

const DEFAULTS: ShopSettings = {
  freeCancelHours: 12, renewalNoticeDays: 7, renewalGraceDays: 3, orderNotifyEmail: '',
  referral: REFERRAL_DEFAULTS,
  customBox: { minItems: 3, packingFee: 5, monthlyDiscount: 10, mystery: { enabled: true, price: 15, max: 2 } },
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
    referral: cleanReferral(c.referral),
    customBox: {
      minItems: Math.max(1, Math.round(num(c.customBox?.minItems, DEFAULTS.customBox.minItems, 50))),
      packingFee: num(c.customBox?.packingFee, DEFAULTS.customBox.packingFee, 500),
      monthlyDiscount: num(c.customBox?.monthlyDiscount, DEFAULTS.customBox.monthlyDiscount, 90),
      mystery: {
        enabled: c.customBox?.mystery?.enabled !== false,
        price: num(c.customBox?.mystery?.price, DEFAULTS.customBox.mystery.price, 500),
        max: Math.round(num(c.customBox?.mystery?.max, DEFAULTS.customBox.mystery.max, 10)),
      },
    },
  };
}
