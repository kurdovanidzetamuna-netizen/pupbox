'use client';
import { pricingPage, type StoredContent } from '@pupbox/content';
import { usePage } from '@/lib/usePage';

/** The words around the plan cards, from admin → Page Builder → Pricing Page → Plans. */
export type PlanLabels = {
  toggleMine: string; toggleGift: string; giftHeading: string; giftBanner: string; giftCard: string;
  cta: string; giftCta: string; popular: string; bestValue: string; giftBadge: string; freeDelivery: string;
  more: string; included: string; chooseThis: string; giftThis: string; empty: string;
};

export function usePlanLabels(content: StoredContent | null | undefined): PlanLabels {
  return usePage(pricingPage, content).plans as PlanLabels;
}
