import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { removeDogPhoto, saveDogPhoto } from './dog-photo';

@Injectable()
export class DogsService {
  constructor(private prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.dog.findMany({
      // A friend's dog from a gift plan lives with that plan, not in "My dogs".
      where: { userId, deletedAt: null, forGift: false },
      orderBy: { createdAt: 'asc' },
    });
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
