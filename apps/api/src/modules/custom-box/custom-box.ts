import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { shopSettings } from '../settings/settings';
import { r2 } from '../../common/money';

/**
 * What a customer may put in a box they build: its own catalogue, kept in
 * admin → Custom box items — never the shop's products.
 */
export const BOX_PRODUCT_WHERE = {
  deletedAt: null,
  inCustomBox: true,
  standaloneSale: false,
  status: { in: ['ACTIVE', 'OUT_OF_STOCK'] },
} satisfies Prisma.ProductWhereInput;

export type BoxLine = { productId: string; quantity: number };

const MAX_PER_PRODUCT = 20;

/** One row per product, whole numbers 1…20. */
export function tidy(lines: BoxLine[]): BoxLine[] {
  const by = new Map<string, number>();
  for (const l of lines ?? []) {
    const q = Math.floor(Number(l?.quantity));
    if (!l?.productId || !(q > 0)) continue;
    by.set(l.productId, Math.min(MAX_PER_PRODUCT, (by.get(l.productId) ?? 0) + q));
  }
  return [...by].map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * What a built box costs today. Each product at its shop price (sale price
 * when there is one) — less the monthly discount for a monthly box — plus the
 * packing fee. Strict (adding to the basket, checkout): every product must
 * still be allowed and in stock, and there must be enough items. Lenient
 * (refreshing a basket, renewals): products no longer allowed or out of stock
 * are left out; `ok` says whether the box still has enough items.
 */
export async function quoteBox(prisma: PrismaService, raw: BoxLine[], monthly: boolean, { strict = true, mystery: wantMystery = 0 } = {}) {
  const { customBox: cfg } = await shopSettings(prisma);
  // Surprise items: only while admin offers them, and no more than the limit.
  const askedMystery = Math.max(0, Math.floor(Number(wantMystery) || 0));
  const allowedMystery = cfg.mystery.enabled ? Math.min(askedMystery, cfg.mystery.max) : 0;
  if (strict && askedMystery > allowedMystery) {
    throw new BadRequestException(cfg.mystery.enabled ? `At most ${cfg.mystery.max} mystery items per box.` : 'Mystery items aren’t offered right now. Remove it and try again.');
  }
  const lines = tidy(raw);
  const products = lines.length ? await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
    select: { id: true, name: true, sku: true, price: true, salePrice: true, sellerId: true, deletedAt: true, inCustomBox: true, standaloneSale: true, status: true, personalisation: true, translations: true, inventory: { select: { quantity: true, reservedQty: true } } },
  }) : [];

  const items: { productId: string; name: string; sku: string | null; sellerId: string | null; quantity: number; unit: number; shopUnit: number; total: number }[] = [];
  for (const l of lines) {
    const p = products.find((x) => x.id === l.productId);
    const allowed = p && !p.deletedAt && p.inCustomBox && !p.standaloneSale && ['ACTIVE', 'OUT_OF_STOCK'].includes(p.status) && !p.personalisation;
    const left = p?.inventory ? Math.max(0, p.inventory.quantity - p.inventory.reservedQty) : 0;
    if (!allowed || left < l.quantity) {
      if (!strict) continue;
      throw new BadRequestException(!allowed
        ? `${p ? `"${p.name}"` : 'A product'} can no longer go in a custom box. Remove it and try again.`
        : `Only ${left} of "${p!.name}" left. Lower the amount and try again.`);
    }
    const shopUnit = Number(p!.salePrice ?? p!.price);
    const unit = monthly ? r2(shopUnit * (1 - cfg.monthlyDiscount / 100)) : shopUnit;
    items.push({ productId: p!.id, name: p!.name, sku: p!.sku, sellerId: p!.sellerId, quantity: l.quantity, unit, shopUnit, total: r2(unit * l.quantity) });
  }

  const mysteryUnit = monthly ? r2(cfg.mystery.price * (1 - cfg.monthlyDiscount / 100)) : cfg.mystery.price;
  const mystery = { count: allowedMystery, unit: mysteryUnit, total: r2(mysteryUnit * allowedMystery) };
  const count = items.reduce((n, i) => n + i.quantity, 0) + mystery.count;
  const itemsTotal = r2(items.reduce((n, i) => n + i.total, 0) + mystery.total);
  const fullTotal = r2(items.reduce((n, i) => n + i.shopUnit * i.quantity, 0) + cfg.mystery.price * mystery.count);
  const ok = count >= cfg.minItems;
  if (strict && !ok) throw new BadRequestException(`A custom box needs at least ${cfg.minItems} items.`);
  const packingFee = count ? cfg.packingFee : 0;
  return { items, mystery, count, itemsTotal, saving: r2(fullTotal - itemsTotal), packingFee, total: r2(itemsTotal + packingFee), minItems: cfg.minItems, ok };
}
export type BoxQuote = Awaited<ReturnType<typeof quoteBox>>;

/** A box's saved contents: its products and how many mystery items. */
export async function boxContents(prisma: PrismaService, boxId: string): Promise<{ lines: BoxLine[]; mystery: number }> {
  const box = await prisma.customBox.findUnique({ where: { id: boxId }, select: { mysteryCount: true, items: { select: { productId: true, quantity: true } } } });
  return { lines: box?.items ?? [], mystery: box?.mysteryCount ?? 0 };
}

/** Today's price of a saved box (see quoteBox). */
export async function quoteSavedBox(prisma: PrismaService, boxId: string, monthly: boolean, opts: { strict?: boolean } = {}) {
  const { lines, mystery } = await boxContents(prisma, boxId);
  return { lines, quote: await quoteBox(prisma, lines, monthly, { ...opts, mystery }) };
}

export const CUSTOM_PLAN_SLUG = 'custom-box-monthly';

/**
 * The built-in plan behind monthly custom boxes (a box a month, renewing
 * monthly, delivery included). Never listed; created on first use.
 */
export async function customBoxPlan(prisma: PrismaService) {
  const found = await prisma.subscriptionPlan.findUnique({ where: { slug: CUSTOM_PLAN_SLUG } });
  if (found) return found;
  return prisma.subscriptionPlan.create({
    data: {
      slug: CUSTOM_PLAN_SLUG, isCustomBox: true, name: 'My box (monthly)',
      translations: { ka: { name: 'ჩემი კოლოფი (ყოველთვიური)' } },
      durationValue: 1, durationUnit: 'MONTH', boxCount: 1, price: 0,
      deliveryIncluded: true, autoRenewal: true, giftable: false, isActive: true,
      description: 'A box the customer built, every month.', benefits: [],
    },
  });
}
