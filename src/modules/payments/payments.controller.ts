import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { GenerateKhqrDto } from './dto/generate-khqr.dto';
import { VerifyKhqrDto } from './dto/verify-khqr.dto';
import { BakongWebhookDto } from './dto/bakong-webhook.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('khqr/generate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate Bakong KHQR code payload string and MD5 hash' })
  @ApiResponse({ status: 201, description: 'Bakong KHQR successfully generated' })
  async generateKhqr(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateKhqrDto,
  ) {
    return this.paymentsService.generateKhqr(userId, dto);
  }

  @Post('khqr/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Bakong KHQR payment transaction status by MD5' })
  async verifyKhqr(@Body() dto: VerifyKhqrDto) {
    return this.paymentsService.verifyKhqr(dto);
  }

  @Post('khqr/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bakong Open API instant payment callback webhook' })
  async handleWebhook(@Body() dto: BakongWebhookDto) {
    return this.paymentsService.handleWebhook(dto);
  }

  @Get('order/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment record details by Order ID' })
  async getPaymentByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.getPaymentByOrder(orderId, userId);
  }
}
