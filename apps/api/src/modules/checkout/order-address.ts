import type { PrismaService } from '../prisma/prisma.service';

export type AddressInput = {
  addressId?: string; firstName: string; lastName: string; phone: string; city: string;
  addressLine1: string; addressLine2?: string; addressLabel?: string; makeMainAddress?: boolean;
  latitude?: number; longitude?: number;
};

/**
 * Where an order goes: a saved address of this customer's (never someone
 * else's), the same one typed again, or a new one. Their own first address —
 * or one they ask for — becomes their main address, shown first next time.
 * For a gift these are the friend's details, kept apart in the buyer's list.
 */
export async function orderAddress(prisma: PrismaService, userId: string, data: AddressInput, gift?: { recipientName: string }) {
  // Create or find address — only one of this customer's own. For a gift
  // these are the friend's delivery details, entered by the buyer.
  let address = data.addressId ? await prisma.address.findFirst({ where: { id: data.addressId, userId, deletedAt: null } }) : null;
  // The same address typed again: use the saved one, so "My addresses" doesn't fill with copies.
  if (!address && !data.addressId) {
    address = await prisma.address.findFirst({
      where: { userId, deletedAt: null, isGift: !!gift, firstName: data.firstName, lastName: data.lastName, phone: data.phone, city: data.city, addressLine1: data.addressLine1, ...(data.addressLine2 ? { addressLine2: data.addressLine2 } : { OR: [{ addressLine2: null }, { addressLine2: '' }] }) },
      orderBy: { createdAt: 'desc' },
    });
  }
  // Their own address, named if they named it; the first one (or one they
  // ask for) becomes their main address, shown first next time.
  const makeMain = !gift && (!!data.makeMainAddress || !(await prisma.address.count({ where: { userId, deletedAt: null, isGift: false } })));
  if (makeMain && !(address?.isDefault)) await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  if (address && !gift && (makeMain || (data.addressLabel && !address.label))) {
    address = await prisma.address.update({ where: { id: address.id }, data: { ...(makeMain ? { isDefault: true } : {}), ...(data.addressLabel && !address.label ? { label: data.addressLabel } : {}) } });
  }
  if (!address) {
    address = await prisma.address.create({
      data: {
        ...(!gift ? { label: data.addressLabel || null, isDefault: makeMain } : {}),
        userId, firstName: data.firstName, lastName: data.lastName, phone: data.phone, city: data.city, addressLine1: data.addressLine1, addressLine2: data.addressLine2, latitude: data.latitude ?? null, longitude: data.longitude ?? null,
        // A friend's address for a gift: tagged and kept apart in the buyer's list.
        ...(gift ? { isGift: true, label: `Gift · ${gift.recipientName.trim()}`.slice(0, 40) } : {}),
      },
    });
  }
  return address;
}
