import { MarginType, Prisma } from '@prisma/client';

/** What the site may know about a seller: never their contact details or notes. */
export const PUBLIC_SELLER = { id: true, name: true, slug: true, logoUrl: true, description: true, translations: true } as const satisfies Prisma.SellerSelect;

/** Shop price for a seller's product: their price plus our margin, to the tetri. */
export function finalPrice(sellerPrice: number, marginType: MarginType, marginValue: number) {
  const p = marginType === 'PERCENT' ? sellerPrice * (1 + marginValue / 100) : sellerPrice + marginValue;
  return Math.round(p * 100) / 100;
}
