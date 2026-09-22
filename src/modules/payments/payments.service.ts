import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateKhqrDto, KhqrCurrency } from './dto/generate-khqr.dto';
import { VerifyKhqrDto } from './dto/verify-khqr.dto';
import { BakongWebhookDto } from './dto/bakong-webhook.dto';
import { OrderStatus, PaymentStatus } from '../../generated/prisma';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BakongKHQR, khqrData, MerchantInfo } = require('bakong-khqr');

@Injectable()
export class PaymentsService {
  private bakongAccountId: string;
  private merchantName: string;
  private merchantCity: string;
  private bakongApiUrl: string;
  private bakongApiToken: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.bakongAccountId =
      this.configService.get<string>('BAKONG_ACCOUNT_ID') ||
      this.configService.get<string>('BAKONG_BAKONG_ID') ||
      'chey_kimrith@bkrt';
    this.merchantName =
      this.configService.get<string>('BAKONG_MERCHANT_NAME') || 'AH LEANG STORE';
    this.merchantCity =
      this.configService.get<string>('BAKONG_CITY') ||
      this.configService.get<string>('BAKONG_MERCHANT_CITY') ||
      'Phnom Penh';
    this.bakongApiUrl =
      this.configService.get<string>('BAKONG_API_URL') ||
      this.configService.get<string>('BAKONG_API_BASE_URL') ||
      'https://api-bakong.nbc.gov.kh/v1';
    this.bakongApiToken =
      this.configService.get<string>('BAKONG_API_TOKEN') ||
      this.configService.get<string>('BAKONG_TOKEN') ||
      '';
  }

  async generateKhqr(userId: string, dto: GenerateKhqrDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Order has already been paid');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    const currencyCode =
      dto.currency === KhqrCurrency.KHR || (dto.currency as string) === 'KHR'
        ? khqrData.currency.khr
        : khqrData.currency.usd;

    const amount = Number(order.totalAmount.toFixed(2));
    const billNumber = order.orderNumber;
    const storeLabel = 'AH LEANG STORE';
    const terminalLabel = 'ONLINE-01';
    const expirationTimestamp = Date.now() + 5 * 60 * 1000;

    try {
      const optionalData = {
        amount,
        currency: currencyCode,
        billNumber,
        storeLabel,
        terminalLabel,
        expirationTimestamp,
      };

      const merchantInfo = new MerchantInfo(
        this.bakongAccountId,
        this.merchantName,
        this.merchantCity,
        this.bakongAccountId,
        'Bakong',
        optionalData,
      );

      const bakongInstance = new BakongKHQR();
      const khqrResponse = bakongInstance.generateMerchant(merchantInfo);

      if (!khqrResponse || khqrResponse.status?.code !== 0 || !khqrResponse.data) {
        throw new InternalServerErrorException(
          `Failed to generate Bakong KHQR: ${khqrResponse?.status?.message || 'Unknown error'}`,
        );
      }

      const khqrString = khqrResponse.data.qr;
      const md5 = khqrResponse.data.md5;
      const deepLink = `bakong://qr?code=${encodeURIComponent(khqrString)}`;

      const qrCode = await QRCode.toDataURL(khqrString, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
      });

      // Save Payment metadata with MD5 so Bakong Webhook can match the transaction
      const payment = await this.prisma.payment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          amount,
          currency: dto.currency || 'USD',
          paymentMethod: 'BAKONG_KHQR',
          status: PaymentStatus.PENDING,
          md5,
          khqrString,
          deepLink,
        },
        update: {
          amount,
          currency: dto.currency || 'USD',
          status: PaymentStatus.PENDING,
          md5,
          khqrString,
          deepLink,
        },
      });

      return {
        paymentId: payment.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: amount,
        currency: dto.currency || 'USD',
        khqrString,
        qrCode,
        md5,
        deepLink,
        expiresInSeconds: 300,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Bakong KHQR Generation Error: ${errMsg}`,
      );
    }
  }

  async verifyKhqr(dto: VerifyKhqrDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.payment?.status === PaymentStatus.SUCCESS || order.status === OrderStatus.PAID) {
      return {
        status: PaymentStatus.SUCCESS,
        isPaid: true,
        orderId: order.id,
        message: 'Payment has already been confirmed as SUCCESS',
      };
    }

    let isSuccess = false;
    let transactionData = null;

    if (this.bakongApiToken) {
      try {
        const response = await fetch(`${this.bakongApiUrl}/check_transaction_by_md5`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.bakongApiToken}`,
          },
          body: JSON.stringify({ md5: dto.md5 }),
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.responseCode === 0 && resData.data) {
            isSuccess = true;
            transactionData = resData.data;
          }
        }
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn('Bakong Open API check failed:', errMsg);
      }
    } else {
      // In development mode, confirm payment when verify is called
      isSuccess = true;
    }

    if (isSuccess) {
      await this.prisma.$transaction([
        this.prisma.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            amount: order.totalAmount,
            currency: 'USD',
            paymentMethod: 'BAKONG_KHQR',
            status: PaymentStatus.SUCCESS,
            md5: dto.md5,
            transactionId: transactionData?.hash || `TXN-${Date.now()}`,
            rawResponse: transactionData || { verifiedAt: new Date().toISOString() },
          },
          update: {
            status: PaymentStatus.SUCCESS,
            md5: dto.md5,
            transactionId: transactionData?.hash || `TXN-${Date.now()}`,
            rawResponse: transactionData || { verifiedAt: new Date().toISOString() },
          },
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID },
        }),
      ]);

      return {
        status: PaymentStatus.SUCCESS,
        isPaid: true,
        orderId: order.id,
        message: 'Payment verified and stored in database as SUCCESS',
      };
    }

    return {
      status: PaymentStatus.PENDING,
      isPaid: false,
      orderId: order.id,
      message: 'Payment has not been completed yet',
    };
  }

  async handleWebhook(dto: BakongWebhookDto) {
    let payment = await this.prisma.payment.findFirst({
      where: { md5: dto.md5 },
    });

    const isSuccess = dto.status === 'SUCCESS' || !dto.status;

    if (isSuccess) {
      if (payment) {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              transactionId: dto.transactionId || `TXN-${Date.now()}`,
              rawResponse: dto.data || (dto as any),
            },
          }),
          this.prisma.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PAID },
          }),
        ]);
      }
    }

    return { received: true, status: isSuccess ? 'PAID' : 'FAILED' };
  }

  async getPaymentByOrder(orderId: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...(userId ? { userId } : {}) },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.payment) {
      throw new NotFoundException('Payment details not found or payment is still pending');
    }

    return order.payment;
  }
}
