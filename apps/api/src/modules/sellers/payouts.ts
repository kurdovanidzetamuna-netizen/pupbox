import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, OrderStatus } from '@prisma/client';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminPerms } from '../admin-auth/admin-permissions';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { dateRange, toCsv } from '../reports/reports.service';

/**
 * When a seller's line is owed:
 *  - due:      the order was delivered and the line isn't paid yet
 *  - upcoming: paid by the customer, still on its way (owed once delivered)
 *  - paid:     settled by a payout
 * Cancelled, refunded, failed and unpaid orders owe nothing.
 */
const DUE: OrderStatus[] = ['DELIVERED'];
const UPCOMING: OrderStatus[] = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED'];
const SOLD = [...UPCOMING, ...DUE];

type State = 'due' | 'upcoming' | 'paid';
const r2 = (n: number) => Math.round(n * 100) / 100;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** A day as it was in Tbilisi, e.g. 2026-10-12. */
const tbilisiDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tbilisi' });

class PayoutDto {
  @IsString() sellerId: string;
  @IsOptional() @Matches(DATE, { message: '"from" must be a date like 2026-10-01' }) from?: string;
  @IsOptional() @Matches(DATE, { message: '"to" must be a date like 2026-10-31' }) to?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

/** Admin: what we owe each seller, line by line, and the payouts we made. */
@ApiTags('Admin - Seller payouts')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'sellers.payouts', write: 'sellers.payouts' })
@Controller('admin/seller-payouts')
export class SellerPayoutsController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** Seller lines of sold orders, optionally for one seller and an order-date span. */
  private lines(sellerId?: string, from?: string, to?: string) {
    const createdAt = dateRange(from, to);
    return this.prisma.orderItem.findMany({
      where: {
        sellerId: sellerId ?? { not: null },
        sellerPrice: { not: null },
        order: { status: { in: SOLD }, ...(createdAt ? { createdAt } : {}) },
      },
      include: {
        order: { select: { id: true, status: true, createdAt: true } },
        seller: { select: { id: true, name: true, logoUrl: true } },
        payout: { select: { id: true, paidAt: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20000,
    });
  }

  private static state(l: { payoutId: string | null; order: { status: OrderStatus } }): State {
    return l.payoutId ? 'paid' : DUE.includes(l.order.status) ? 'due' : 'upcoming';
  }

  private static row(l: Awaited<ReturnType<SellerPayoutsController['lines']>>[number]) {
    const share = r2(Number(l.sellerPrice) * l.quantity);
    const p = (l.personalisation ?? {}) as { size?: string; engraving?: string };
    return {
      id: l.id,
      seller: l.seller,
      order: l.order.id.slice(-8).toUpperCase(),
      orderId: l.order.id,
      date: l.order.createdAt,
      orderStatus: l.order.status,
      name: l.name,
      choice: [p.size, p.engraving && `“${p.engraving}”`].filter(Boolean).join(' · '),
      quantity: l.quantity,
      sellerPrice: Number(l.sellerPrice),
      share,
      sales: Number(l.total),
      margin: r2(Number(l.total) - share),
      state: SellerPayoutsController.state(l),
      paidAt: l.payout?.paidAt ?? null,
    };
  }

  /** One row per seller: sold, their share, our margin, and due / upcoming / paid. */
  @Get('summary')
  async summary(@Query('from') from?: string, @Query('to') to?: string) {
    const rows = new Map<string, any>();
    for (const l of await this.lines(undefined, from, to)) {
      const x = SellerPayoutsController.row(l);
      const s = rows.get(x.seller!.id) ?? { seller: x.seller, units: 0, sales: 0, share: 0, margin: 0, due: 0, dueLines: 0, upcoming: 0, paid: 0 };
      s.units += x.quantity; s.sales += x.sales; s.share += x.share; s.margin += x.margin;
      s[x.state] += x.share;
      if (x.state === 'due') s.dueLines++;
      rows.set(x.seller!.id, s);
    }
    const list = [...rows.values()].map((s) => ({ ...s, sales: r2(s.sales), share: r2(s.share), margin: r2(s.margin), due: r2(s.due), upcoming: r2(s.upcoming), paid: r2(s.paid) }))
      .sort((a, b) => b.due - a.due || b.sales - a.sales);
    const sum = (k: string) => r2(list.reduce((n, s) => n + s[k], 0));
    return { rows: list, totals: { units: list.reduce((n, s) => n + s.units, 0), sales: sum('sales'), share: sum('share'), margin: sum('margin'), due: sum('due'), upcoming: sum('upcoming'), paid: sum('paid') } };
  }

  /** Every line behind a seller's numbers. */
  @Get('lines')
  async list(@Query('sellerId') sellerId: string, @Query('from') from?: string, @Query('to') to?: string) {
    if (!sellerId) throw new BadRequestException('Choose a seller');
    return (await this.lines(sellerId, from, to)).map(SellerPayoutsController.row);
  }

  /** The same lines as a spreadsheet, for one seller or all of them. */
  @Get('lines.csv')
  async csv(@Res() res: Response, @Query('sellerId') sellerId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    const rows = (await this.lines(sellerId || undefined, from, to)).map(SellerPayoutsController.row).map((x) => ({
      seller: x.seller?.name ?? '',
      order: x.order,
      date: tbilisiDay(x.date),
      order_status: x.orderStatus,
      product: x.name,
      choice: x.choice,
      quantity: x.quantity,
      seller_price: x.sellerPrice.toFixed(2),
      seller_share: x.share.toFixed(2),
      customer_paid: x.sales.toFixed(2),
      our_margin: x.margin.toFixed(2),
      payout_state: x.state,
      paid_at: x.paidAt ? tbilisiDay(x.paidAt) : '',
    }));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="seller-payouts.csv"');
    res.send(toCsv(rows));
  }

  /** Payouts made, newest first. */
  @Get()
  history(@Query('sellerId') sellerId?: string) {
    return this.prisma.sellerPayout.findMany({
      where: sellerId ? { sellerId } : {},
      orderBy: { paidAt: 'desc' },
      take: 200,
      include: { seller: { select: { id: true, name: true, logoUrl: true } }, _count: { select: { items: true } } },
    });
  }

  /**
   * Record that we paid a seller: settles every due line in the span (all of
   * them when there's no span). The amount is worked out here, never typed,
   * and a line can only ever be in one payout.
   */
  @Post()
  async pay(@Body() dto: PayoutDto, @Request() req: any) {
    const seller = await this.prisma.seller.findUnique({ where: { id: dto.sellerId }, select: { id: true, name: true } });
    if (!seller) throw new NotFoundException('Seller not found');
    const due = (await this.lines(seller.id, dto.from, dto.to)).filter((l) => SellerPayoutsController.state(l) === 'due');
    if (!due.length) throw new BadRequestException('Nothing is due to this seller for these dates.');
    const amount = r2(due.reduce((n, l) => n + Number(l.sellerPrice) * l.quantity, 0));
    const span = dateRange(dto.from, dto.to);

    const payout = await this.prisma.$transaction(async (tx) => {
      const p = await tx.sellerPayout.create({
        data: { sellerId: seller.id, amount: new Prisma.Decimal(amount), periodFrom: span?.gte ?? null, periodTo: span?.lt ?? null, note: dto.note?.trim() || null, paidById: req.user?.id ?? null },
      });
      const { count } = await tx.orderItem.updateMany({ where: { id: { in: due.map((l) => l.id) }, payoutId: null }, data: { payoutId: p.id } });
      // Someone else settled some of these lines a moment ago: start over.
      if (count !== due.length) throw new BadRequestException('These lines changed while you were paying. Refresh and try again.');
      return p;
    });
    await this.audit.log({ adminUserId: req.user?.id, action: 'CREATE', module: 'seller-payouts', entityType: 'SellerPayout', entityId: payout.id, after: { seller: seller.name, amount, lines: due.length } });
    return { ...payout, amount, lines: due.length };
  }
}
