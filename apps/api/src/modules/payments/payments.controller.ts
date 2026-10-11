import { Controller, Post, Get, Param, Body, UseGuards, Request, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { SkipThrottle } from '@nestjs/throttler';
import { IsBoolean, IsOptional } from 'class-validator';

class InitiateDto {
  /** Ask the bank to keep this card for next time. */
  @IsOptional() @IsBoolean() saveCard?: boolean;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  initiatePayment(@Param('orderId') orderId: string, @Request() req: any, @Body() body: InitiateDto) {
    return this.paymentsService.initiatePayment(orderId, req.user.id, { saveCard: body?.saveCard === true });
  }

  // Flitt's servers call this; never rate-limit the bank.
  @SkipThrottle()
  @Post('webhook/flitt')
  handleWebhook(@Body() body: Record<string, any>) {
    return this.paymentsService.handleWebhook(body);
  }

  @Get('order/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getOrderPayment(@Param('orderId') orderId: string, @Request() req: any) {
    return this.paymentsService.getOrderPayment(orderId, req.user.id);
  }
}
