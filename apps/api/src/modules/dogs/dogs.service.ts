import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DogsService {
  constructor(private prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.dog.findMany({
      where: { userId, deletedAt: null },
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

  async update(id: string, userId: string, data: any) {
    await this.findOne(id, userId);
    return this.prisma.dog.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.dog.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Admin: get all dogs for a customer
  findByCustomer(userId: string) {
    return this.prisma.dog.findMany({ where: { userId, deletedAt: null } });
  }
}
