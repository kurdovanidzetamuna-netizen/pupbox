import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { removeDogPhoto, saveDogPhoto } from './dog-photo';

/** A dog's plans (newest first) and the gift order that named the friend. */
const DOG_EXTRAS = {
  subscriptions: {
    where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, isGift: true, endDate: true, boxesTotal: true, boxesDelivered: true, customBoxId: true, plan: { select: { name: true, translations: true } } },
  },
  orders: { where: { isGift: true }, orderBy: { createdAt: 'asc' }, take: 1, select: { giftRecipientName: true } },
} satisfies Prisma.DogInclude;

const withGiftFor = ({ orders, ...d }: any) => ({ ...d, giftFor: d.forGift ? orders?.[0]?.giftRecipientName ?? null : null });

@Injectable()
export class DogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * The customer's dogs. With `withGifts`, also the friends' dogs they bought
   * a gift plan for (each says who it's for), and every dog's plans — for the
   * "My dogs" page. Without, only their own (e.g. checkout's dog picker).
   */
  async findByUser(userId: string, withGifts = false) {
    if (!withGifts) {
      return this.prisma.dog.findMany({ where: { userId, deletedAt: null, forGift: false }, orderBy: { createdAt: 'asc' } });
    }
    const dogs = await this.prisma.dog.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ forGift: 'asc' }, { createdAt: 'asc' }],
      include: DOG_EXTRAS,
    });
    return dogs.map(withGiftFor);
  }

  /** One dog with its plans (and, for a friend's dog, who it's for). */
  async findOneFull(id: string, userId: string) {
    await this.findOne(id, userId);
    return withGiftFor(await this.prisma.dog.findUniqueOrThrow({ where: { id }, include: DOG_EXTRAS }));
  }

  async findOne(id: string, userId: string) {
    const dog = await this.prisma.dog.findFirst({ where: { id, deletedAt: null } });
    if (!dog) throw new NotFoundException('Dog not found');
    if (dog.userId !== userId) throw new ForbiddenException('Access denied');
    return dog;
  }

  async create(userId: string, data: {
    name: string; breed?: string; birthday?: Date; gender?: any;
    size?: any; weightKg?: number; allergies?: string[]; toyPreferences?: string[];
    foodPreferences?: string[]; chewingStrength?: string; specialNotes?: string;
  }) {
    return this.prisma.dog.create({ data: { ...data, userId } });
  }

  async setPhoto(id: string, userId: string, buf: Buffer | undefined) {
    const dog = await this.findOne(id, userId);
    const photoUrl = await saveDogPhoto(buf);
    await removeDogPhoto(dog.photoUrl);
    return this.prisma.dog.update({ where: { id }, data: { photoUrl } });
  }

  async removePhoto(id: string, userId: string) {
    const dog = await this.findOne(id, userId);
    await removeDogPhoto(dog.photoUrl);
    return this.prisma.dog.update({ where: { id }, data: { photoUrl: null } });
  }

  async update(id: string, userId: string, data: any) {
    await this.findOne(id, userId);
    return this.prisma.dog.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    // Boxes are packed for this dog's size and allergies: keep it while a subscription needs it.
    const inUse = await this.prisma.customerSubscription.count({ where: { dogId: id, status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } } });
    if (inUse) throw new BadRequestException('This dog has an active subscription. Edit the details instead, or remove it after the subscription ends.');
    return this.prisma.dog.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Admin: get all dogs for a customer
  findByCustomer(userId: string) {
    return this.prisma.dog.findMany({ where: { userId, deletedAt: null } });
  }
}
