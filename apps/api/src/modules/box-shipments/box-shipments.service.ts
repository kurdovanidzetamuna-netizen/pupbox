import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BoxShipmentStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { notify } from '../notifications/notify';
import { EmailService } from '../email/email.service';
import { moveBoxStock } from './box-stock';

/**
 * Which of a product's allergens the dog reacts to, ignoring letter case.
 * Same rule as allergenClash in @pupbox/content (the API can't load that
 * package's TypeScript at runtime) — keep the two in step.
 */
const allergenClash = (dog: string[] | null | undefined, product: string[] | null | undefined) => {
  const d = new Set((dog ?? []).map((a) => a.trim().toLowerCase()).filter(Boolean));
  return (product ?? []).filter((a) => d.has(a.trim().toLowerCase()));
};

/** Boxes in these states have left us; they count as sent to the customer. */
const SENT: BoxShipmentStatus[] = ['SHIPPED', 'DELIVERED'];
/** How far a plan order has come; it only moves forward with its boxes. */
const RANK: Record<string, number> = { PAID: 0, PROCESSING: 1, PACKED: 2, SHIPPED: 3, DELIVERED: 4 };

/** Where each status may go next. Going back is allowed to undo a mis-click. */
const NEXT: Record<BoxShipmentStatus, BoxShipmentStatus[]> = {
  TO_PACK: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['TO_PACK', 'SHIPPED', 'CANCELLED'],
  SHIPPED: ['PACKED', 'DELIVERED'],
  DELIVERED: ['SHIPPED'],
  CANCELLED: ['TO_PACK'],
};

const shipmentInclude = {
  subscription: {
    select: {
      id: true, boxesTotal: true, boxesDelivered: true, isGift: true, status: true, cancelledAt: true,
      plan: { select: { name: true } },
      // A box the customer built: these products instead of the month's campaign.
      // Only products still in the builder: one removed since is left out, as the renewal price leaves it out.
      customBox: { select: { id: true, mysteryCount: true, items: { where: { product: { deletedAt: null } }, select: { quantity: true, product: { select: { id: true, name: true, sku: true, allergens: true, inventory: { select: { quantity: true, reservedQty: true } } } } } } } },
      user: { select: { id: true, email: true, firstName: true, lastName: true, language: true } },
      dog: { select: { name: true, breed: true, size: true, allergies: true, specialNotes: true } },
      // A gift's purchase carries who it's for and the buyer's message.
      orders: { where: { isGift: true }, select: { giftRecipientName: true, giftMessage: true }, orderBy: { createdAt: 'asc' }, take: 1 },
    },
  },
  address: true,
  campaign: { select: { id: true, name: true, dogSize: true, products: { select: { quantity: true, product: { select: { id: true, name: true, sku: true, allergens: true, inventory: { select: { quantity: true, reservedQty: true } } } } } } } },
} satisfies Prisma.BoxShipmentInclude;

/** What goes in a box: the customer's own products, else the month's campaign. */
const contentsOf = (s: { subscription: { customBox: { items: any[] } | null }; campaign: { products: any[] } | null }) =>
  s.subscription.customBox ? s.subscription.customBox.items : s.campaign?.products ?? [];

function monthWindow(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new BadRequestException('Choose a valid month');
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

/**
 * The monthly box cycle. Each month has a list of boxes to send: one for
 * every active subscription that still has boxes left. Admin adds
 * subscribers to the month (again later in the month, for new ones), packs,
 * and marks boxes shipped — which is what moves the customer's "boxes sent".
 */
@Injectable()
export class BoxShipmentsService {
  private readonly logger = new Logger(BoxShipmentsService.name);

  constructor(private prisma: PrismaService, private email: EmailService) {}

  /**
   * Active subscriptions that should get a box this month but aren't on its
   * list yet. Boxes left = plan's boxes − boxes already sent − boxes listed
   * but not yet sent; `next` is the number the new box gets.
   */
  private async dueNotListed(year: number, month: number) {
    const { end } = monthWindow(year, month);
    const subs = await this.prisma.customerSubscription.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lt: end },
        shipments: { none: { year, month } },
      },
      select: {
        id: true, userId: true, isGift: true, addressId: true, boxesTotal: true, boxesDelivered: true, customBoxId: true,
        dog: { select: { size: true } },
        _count: { select: { shipments: { where: { status: { in: ['TO_PACK', 'PACKED'] } } } } },
      },
    });
    return subs
      .map((s) => ({ ...s, next: s.boxesDelivered + s._count.shipments + 1 }))
      .filter((s) => s.next <= s.boxesTotal);
  }

  /** The address a subscription's boxes go to: its order's, or the owner's default (gifts: the recipient's). */
  private async addressFor(sub: { id: string; userId: string; isGift: boolean; addressId: string | null }) {
    // The subscription's own address — the one the customer keeps up to date.
    if (sub.addressId) return sub.addressId;
    if (!sub.isGift) {
      const order = await this.prisma.order.findFirst({
        where: { subscriptionId: sub.id, addressId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { addressId: true },
      });
      if (order?.addressId) return order.addressId;
    }
    const addr = await this.prisma.address.findFirst({
      where: { userId: sub.userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    return addr?.id ?? null;
  }

  async month(year: number, month: number) {
    monthWindow(year, month);
    const [items, waiting, campaigns] = await Promise.all([
      this.prisma.boxShipment.findMany({
        where: { year, month },
        include: shipmentInclude,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      }),
      this.dueNotListed(year, month),
      this.prisma.boxCampaign.count({ where: { year, month, isActive: true } }),
    ]);

    // What to take off the shelf for the boxes still to pack, against what's
    // on the shelf (stock not already held by unpaid shop orders).
    const pick = new Map<string, { name: string; sku: string; quantity: number; inStock: number; short: boolean }>();
    for (const s of items) {
      if (s.status !== 'TO_PACK') continue;
      for (const p of contentsOf(s)) {
        const inv = p.product.inventory;
        const row = pick.get(p.product.id) ?? { name: p.product.name, sku: p.product.sku, quantity: 0, inStock: Math.max(0, (inv?.quantity ?? 0) - (inv?.reservedQty ?? 0)), short: false };
        row.quantity += p.quantity;
        row.short = row.quantity > row.inStock;
        pick.set(p.product.id, row);
      }
    }

    // Boxes whose contents the dog is allergic to: swap the item before packing.
    const withClashes = items.map((i) => ({
      ...i,
      gift: i.subscription.isGift
        ? { for: i.subscription.orders[0]?.giftRecipientName ?? null, message: i.subscription.orders[0]?.giftMessage ?? null }
        : null,
      // The customer's own box, listed so it can be packed without a campaign.
      ownBox: i.subscription.customBox ? [
        ...i.subscription.customBox.items.map((x) => ({ name: x.product.name, sku: x.product.sku, quantity: x.quantity, mystery: false })),
        // Surprise items: admin picks them from the mystery pool when packing.
        ...(i.subscription.customBox.mysteryCount ? [{ name: 'Mystery item', sku: '', quantity: i.subscription.customBox.mysteryCount, mystery: true }] : []),
      ] : null,
      clashes: contentsOf(i)
        .map((p: any) => ({ product: p.product.name, allergens: allergenClash(i.subscription.dog?.allergies, p.product.allergens) }))
        .filter((c: any) => c.allergens.length),
    }));

    // What mystery items can be packed from (Products → "Can be a mystery item").
    const mysteryNeeded = items.filter((i) => i.status === 'TO_PACK').reduce((n, i) => n + (i.subscription.customBox?.mysteryCount ?? 0), 0);
    const mysteryPool = mysteryNeeded ? (await this.prisma.product.findMany({
      where: { inMystery: true, deletedAt: null }, orderBy: { name: 'asc' },
      select: { name: true, sku: true, inventory: { select: { quantity: true, reservedQty: true } } },
    })).map((p) => ({ name: p.name, sku: p.sku, inStock: Math.max(0, (p.inventory?.quantity ?? 0) - (p.inventory?.reservedQty ?? 0)) })) : [];

    const counts = Object.fromEntries((['TO_PACK', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map((st) => [st, items.filter((i) => i.status === st).length]));
    return {
      year, month, items: withClashes, counts,
      allergyClashes: withClashes.filter((i) => i.clashes.length && (i.status === 'TO_PACK' || i.status === 'PACKED')).length,
      shortOfStock: [...pick.values()].filter((p) => p.short).length,
      waiting: waiting.length,
      campaigns,
      withoutCampaign: items.filter((i) => !i.campaignId && !i.subscription.customBox && i.status !== 'CANCELLED').length,
      withoutAddress: items.filter((i) => !i.addressId && i.status !== 'CANCELLED').length,
      // Listed while active, cancelled since: someone must decide whether it still goes.
      cancelledSubscriptions: items.filter((i) => (i.status === 'TO_PACK' || i.status === 'PACKED') && i.subscription.status === 'CANCELLED').length,
      pickList: [...pick.values()].sort((a, b) => a.name.localeCompare(b.name)),
      mystery: { needed: mysteryNeeded, pool: mysteryPool },
    };
  }

  /** Puts every subscriber who is due a box this month on the month's list. Safe to run again. */
  async addDue(year: number, month: number) {
    const due = await this.dueNotListed(year, month);
    const campaigns = await this.prisma.boxCampaign.findMany({ where: { year, month, isActive: true }, select: { id: true, dogSize: true } });

    let added = 0;
    for (const sub of due) {
      // A box the customer built has its own products, not a campaign.
      const campaign = sub.customBoxId ? null : campaigns.find((c) => c.dogSize && c.dogSize === sub.dog?.size) ?? campaigns.find((c) => !c.dogSize) ?? null;
      try {
        await this.prisma.boxShipment.create({
          data: {
            subscriptionId: sub.id, year, month,
            boxNumber: sub.next,
            campaignId: campaign?.id ?? null,
            addressId: await this.addressFor(sub),
          },
        });
        added++;
      } catch (e) {
        // Two admins pressing at once: the unique (subscription, month) key keeps one.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    return { added };
  }

  /** Picks up a campaign created after boxes were listed. Only boxes not yet packed change. */
  async refreshCampaigns(year: number, month: number) {
    const campaigns = await this.prisma.boxCampaign.findMany({ where: { year, month, isActive: true }, select: { id: true, dogSize: true } });
    const open = await this.prisma.boxShipment.findMany({
      where: { year, month, status: 'TO_PACK', subscription: { customBoxId: null } },
      select: { id: true, campaignId: true, subscription: { select: { dog: { select: { size: true } } } } },
    });
    let changed = 0;
    for (const s of open) {
      const size = s.subscription.dog?.size;
      const id = (campaigns.find((c) => c.dogSize && c.dogSize === size) ?? campaigns.find((c) => !c.dogSize))?.id ?? null;
      if (id !== s.campaignId) {
        await this.prisma.boxShipment.update({ where: { id: s.id }, data: { campaignId: id } });
        changed++;
      }
    }
    return { changed };
  }

  /** Moves boxes to a new status; returns how many moved and which couldn't. */
  async setStatus(ids: string[], status: BoxShipmentStatus, trackingNumber?: string) {
    if (!ids?.length) throw new BadRequestException('Choose at least one box');
    if (!NEXT[status]) throw new BadRequestException('Unknown status');

    const rows = await this.prisma.boxShipment.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, subscriptionId: true } });
    const movable = rows.filter((r) => NEXT[r.status].includes(status));
    const now = new Date();
    const stamp: Prisma.BoxShipmentUpdateInput =
      status === 'PACKED' ? { packedAt: now }
      : status === 'SHIPPED' ? { shippedAt: now }
      : status === 'DELIVERED' ? { deliveredAt: now }
      : {};

    const newlySent: string[] = [];
    for (const r of movable) {
      // "Boxes sent" moves by one as a box leaves or is moved back, so counts
      // from before this list existed are kept.
      const wasSent = SENT.includes(r.status);
      const isSent = SENT.includes(status);
      await this.prisma.$transaction([
        this.prisma.boxShipment.update({
          where: { id: r.id },
          data: { status, ...stamp, ...(trackingNumber !== undefined && ids.length === 1 ? { trackingNumber: trackingNumber.trim() || null } : {}) },
        }),
        ...(wasSent === isSent ? [] : [this.prisma.customerSubscription.update({
          where: { id: r.subscriptionId },
          data: { boxesDelivered: { increment: isSent ? 1 : -1 } },
        })]),
      ]);
      if (status === 'SHIPPED' && !wasSent) newlySent.push(r.id);
      await this.moveStock(r.id, status);
    }

    if (status === 'DELIVERED') {
      for (const r of movable) {
        const b = await this.prisma.boxShipment.findUnique({ where: { id: r.id }, select: { boxNumber: true, subscription: { select: { userId: true, boxesTotal: true, isGift: true, dog: { select: { name: true } }, orders: { where: { isGift: true }, select: { giftRecipientName: true }, take: 1 } } } } });
        if (b) notify(this.prisma, b.subscription.userId, 'BOX_DELIVERED', { dogName: b.subscription.dog?.name ?? null, boxNumber: b.boxNumber, boxesTotal: b.subscription.boxesTotal, gift: b.subscription.isGift, recipient: b.subscription.orders[0]?.giftRecipientName ?? null }, '/account/subscriptions');
      }
    }
    for (const id of newlySent) this.notifyShipped(id).catch((e) => this.logger.error(`Box shipped email failed for ${id}: ${e.message}`));
    for (const id of new Set(movable.map((r) => r.subscriptionId))) await this.ordersFollowBoxes(id);

    return { updated: movable.length, skipped: rows.length - movable.length };
  }

  /**
   * A plan's order follows its boxes, so Orders doesn't keep it under "to
   * pack" once its box is on the way. Each paid term covers the next
   * `boxCount` boxes: its order is packed and shipped with its first box and
   * delivered with its last. Only forward, and no message to the customer —
   * the box already sent one. Orders with shop products are packed from
   * Orders as before.
   */
  private async ordersFollowBoxes(subscriptionId: string) {
    const sub = await this.prisma.customerSubscription.findUnique({
      where: { id: subscriptionId },
      select: {
        plan: { select: { boxCount: true } },
        shipments: { where: { status: { not: 'CANCELLED' } }, select: { boxNumber: true, status: true, shippedAt: true, deliveredAt: true, trackingNumber: true } },
        // The terms that brought boxes, oldest first; a refunded term counts only if its boxes went out.
        orders: {
          where: { type: { in: ['SUBSCRIPTION', 'RENEWAL'] }, OR: [{ status: { in: ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] } }, { status: 'REFUNDED', shippedAt: { not: null } }] },
          orderBy: { createdAt: 'asc' },
          select: { id: true, status: true, shippedAt: true, trackingNumber: true },
        },
      },
    });
    if (!sub) return;
    const per = Math.max(1, sub.plan.boxCount);
    for (const [k, o] of sub.orders.entries()) {
      if (!(o.status in RANK)) continue;
      const mine = sub.shipments.filter((b) => b.boxNumber > k * per && b.boxNumber <= (k + 1) * per).sort((a, b) => a.boxNumber - b.boxNumber);
      const last = mine.find((b) => b.boxNumber === (k + 1) * per);
      const out = mine.filter((b) => SENT.includes(b.status));
      const to = last?.status === 'DELIVERED' ? 'DELIVERED' : out.length ? 'SHIPPED' : mine.some((b) => b.status === 'PACKED') ? 'PACKED' : null;
      if (!to || RANK[to] <= RANK[o.status]) continue;
      await this.prisma.order.updateMany({
        where: { id: o.id, status: o.status as OrderStatus },
        data: {
          status: to,
          ...(RANK[to] >= RANK.SHIPPED && !o.shippedAt ? { shippedAt: out[0]?.shippedAt ?? new Date() } : {}),
          ...(to === 'DELIVERED' ? { deliveredAt: last?.deliveredAt ?? new Date() } : {}),
          ...(!o.trackingNumber && out[0]?.trackingNumber ? { trackingNumber: out[0].trackingNumber } : {}),
        },
      });
    }
  }

  private moveStock(shipmentId: string, status: BoxShipmentStatus) {
    return moveBoxStock(this.prisma, shipmentId, status);
  }


  async setTracking(id: string, trackingNumber: string) {
    const row = await this.prisma.boxShipment.findUnique({ where: { id }, select: { id: true } });
    if (!row) throw new NotFoundException('Box not found');
    return this.prisma.boxShipment.update({ where: { id }, data: { trackingNumber: trackingNumber?.trim() || null } });
  }

  private async notifyShipped(shipmentId: string) {
    const s = await this.prisma.boxShipment.findUnique({ where: { id: shipmentId }, include: shipmentInclude });
    if (!s) return;
    const { user, dog, boxesTotal } = s.subscription;
    notify(this.prisma, user.id, 'BOX_SHIPPED', { dogName: dog?.name ?? null, boxNumber: s.boxNumber, boxesTotal, tracking: s.trackingNumber, gift: s.subscription.isGift, recipient: s.subscription.orders[0]?.giftRecipientName ?? null }, '/account/subscriptions');
    await this.email.sendBoxShipped({
      email: user.email,
      firstName: user.firstName,
      language: user.language,
      dogName: dog?.name ?? null,
      boxNumber: s.boxNumber,
      boxesTotal,
      trackingNumber: s.trackingNumber,
    });
  }
}
