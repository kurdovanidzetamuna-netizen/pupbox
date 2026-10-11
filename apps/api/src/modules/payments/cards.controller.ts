import { Controller, Delete, Get, NotFoundException, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/** What the browser may see of a card: never its token. */
const SELECT = { id: true, brand: true, last4: true, expMonth: true, expYear: true, isDefault: true, createdAt: true } as const;

/** The customer's saved cards: list, choose the default, remove. */
@ApiTags('My Cards')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('me/cards')
export class CardsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@Request() req: any) {
    return this.prisma.savedCard.findMany({ where: { userId: req.user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }], select: SELECT });
  }

  @Patch(':id/default')
  async makeDefault(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const card = await this.prisma.savedCard.findFirst({ where: { id, userId }, select: { id: true } });
    if (!card) throw new NotFoundException('Card not found');
    await this.prisma.$transaction([
      this.prisma.savedCard.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.savedCard.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return this.list(req);
  }

  /** Removing the default hands it to the newest card left. */
  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const card = await this.prisma.savedCard.findFirst({ where: { id, userId }, select: { isDefault: true } });
    if (!card) throw new NotFoundException('Card not found');
    await this.prisma.savedCard.delete({ where: { id } });
    if (card.isDefault) {
      const next = await this.prisma.savedCard.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
      if (next) await this.prisma.savedCard.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return this.list(req);
  }
}
