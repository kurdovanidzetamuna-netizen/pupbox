import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BoxShipmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/** Boxes in these states have left us; they count as sent to the customer. */
const SENT: BoxShipmentStatus[] = ['SHIPPED', 'DELIVERED'];

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
      id: true, boxesTotal: true, boxesDelivered: true, isGift: true,
      plan: { select: { name: true } },
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      dog: { select: { name: true, breed: true, size: true, allergies: true, specialNotes: true } },
    },
  },
  address: true,
  campaign: { select: { id: true, name: true, dogSize: true, products: { select: { quantity: true, product: { select: { id: true, name: true, sku: true } } } } } },
} satisfies Prisma.BoxShipmentInclude;

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
        id: true, userId: true, isGift: true, boxesTotal: true, boxesDelivered: true,
        dog: { select: { size: true } },
        _count: { select: { shipments: { where: { status: { in: ['TO_PACK', 'PACKED'] } } } } },
      },
    });
    return subs
      .map((s) => ({ ...s, next: s.boxesDelivered + s._count.shipments + 1 }))
      .filter((s) => s.next <= s.boxesTotal);
  }

  /** The address a subscription's boxes go to: its order's, or the owner's default (gifts: the recipient's). */
  private async addressFor(sub: { id: string; userId: string; isGift: boolean }) {
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

    // What to take off the shelf for the boxes still to pack.
    const pick = new Map<string, { name: string; sku: string; quantity: number }>();
    for (const s of items) {
      if (s.status !== 'TO_PACK') continue;
      for (const p of s.campaign?.products ?? []) {
        const row = pick.get(p.product.id) ?? { name: p.product.name, sku: p.product.sku, quantity: 0 };
        row.quantity += p.quantity;
        pick.set(p.product.id, row);
      }
    }

    const counts = Object.fromEntries((['TO_PACK', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map((st) => [st, items.filter((i) => i.status === st).length]));
    return {
      year, month, items, counts,
      waiting: waiting.length,
      campaigns,
      withoutCampaign: items.filter((i) => !i.campaignId && i.status !== 'CANCELLED').length,
      withoutAddress: items.filter((i) => !i.addressId && i.status !== 'CANCELLED').length,
      pickList: [...pick.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  /** Puts every subscriber who is due a box this month on the month's list. Safe to run again. */
  async addDue(year: number, month: number) {
    const due = await this.dueNotListed(year, month);
    const campaigns = await this.prisma.boxCampaign.findMany({ where: { year, month, isActive: true }, select: { id: true, dogSize: true } });

    let added = 0;
    for (const sub of due) {
      const campaign = campaigns.find((c) => c.dogSize && c.dogSize === sub.dog?.size) ?? campaigns.find((c) => !c.dogSize) ?? null;
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
      where: { year, month, status: 'TO_PACK' },
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
    }

    for (const id of newlySent) this.notifyShipped(id).catch((e) => this.logger.error(`Box shipped email failed for ${id}: ${e.message}`));

    return { updated: movable.length, skipped: rows.length - movable.length };
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
    await this.email.sendBoxShipped({
      email: user.email,
      firstName: user.firstName,
      dogName: dog?.name ?? null,
      boxNumber: s.boxNumber,
      boxesTotal,
      trackingNumber: s.trackingNumber,
    });
  }
}
