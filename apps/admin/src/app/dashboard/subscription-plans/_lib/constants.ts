import type { BoxConfig, GiftBox } from './types';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const EMPTY_FORM = {
  name: '', slug: '', durationValue: 1, durationUnit: 'MONTH', boxCount: 1,
  monthlyPrice: '', discountPercent: '',
  deliveryIncluded: true, autoRenewal: true, giftable: true, description: '', benefits: '',
  badge: '', isActive: true, sortOrder: 0,
};
export const EMPTY_KA = { name: '', description: '', benefits: '' };

export const EMPTY_CONFIG = {
  boxes: [] as BoxConfig[],
  giftBoxes: [] as GiftBox[],
  operationalCost: 0,
  deliveryCost: 0,
  deliveryFree: true,
  couponIds: [] as string[],
  referralDiscountPercent: 0,
};

export type PlanConfig = typeof EMPTY_CONFIG;

/** Badges every install has; custom ones are kept in localStorage on top. */
export const DEFAULT_BADGES = ['Most Popular', 'Best Value', 'New', 'Limited'];
