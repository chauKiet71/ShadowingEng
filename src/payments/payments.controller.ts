import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & {
  user: { id: string };
  rawBody?: Buffer;
};

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    return this.paymentsService.createOrder(req.user.id, dto.packageId);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  getOrder(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.paymentsService.getOrder(req.user.id, id);
  }

  @Post('webhooks/sepay')
  receiveSepayWebhook(
    @Req() req: AuthenticatedRequest,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-sepay-signature') signature: string | undefined,
    @Headers('x-sepay-timestamp') timestamp: string | undefined,
    @Body() dto: SepayWebhookDto,
  ) {
    this.paymentsService.verifyWebhook(
      authorization,
      signature,
      timestamp,
      req.rawBody,
    );
    return this.paymentsService.processWebhook(dto);
  }
}
