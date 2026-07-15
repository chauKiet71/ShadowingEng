import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DurationUnit,
  PackageStatus,
  PaymentEventStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';

const ORDER_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createOrder(userId: string, packageId: string) {
    const pkg = await this.prisma.package.findFirst({
      where: {
        id: packageId,
        status: PackageStatus.ACTIVE,
        isVisible: true,
      },
    });
    if (!pkg) throw new NotFoundException('Gói đăng ký không tồn tại');

    const now = new Date();
    await this.prisma.paymentOrder.updateMany({
      where: {
        userId,
        status: PaymentStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: { status: PaymentStatus.EXPIRED },
    });

    let order = await this.prisma.paymentOrder.findFirst({
      where: {
        userId,
        packageId,
        amount: pkg.price,
        status: PaymentStatus.PENDING,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!order) {
      order = await this.createOrderWithUniqueCode(
        userId,
        packageId,
        pkg.price,
      );
    }

    return this.mapOrder(order, pkg);
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.paymentOrder.findFirst({
      where: { id: orderId, userId },
      include: { package: true },
    });
    if (!order) throw new NotFoundException('Đơn thanh toán không tồn tại');

    if (
      order.status === PaymentStatus.PENDING &&
      order.expiresAt <= new Date()
    ) {
      const expired = await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: PaymentStatus.EXPIRED },
        include: { package: true },
      });
      return this.mapOrder(expired, expired.package);
    }

    return this.mapOrder(order, order.package);
  }

  verifyWebhook(
    authorization: string | undefined,
    signature: string | undefined,
    timestamp: string | undefined,
    rawBody: Buffer | undefined,
  ) {
    const hmacSecret = this.config.get<string>('SEPAY_WEBHOOK_SECRET')?.trim();
    if (hmacSecret) {
      if (!signature || !timestamp || !rawBody) {
        throw new UnauthorizedException('Thiếu chữ ký webhook SePay');
      }

      const timestampNumber = Number(timestamp);
      if (
        !Number.isFinite(timestampNumber) ||
        Math.abs(Date.now() / 1000 - timestampNumber) > 300
      ) {
        throw new UnauthorizedException('Webhook SePay đã hết hạn');
      }

      const expected =
        'sha256=' +
        createHmac('sha256', hmacSecret)
          .update(`${timestamp}.${rawBody.toString('utf8')}`)
          .digest('hex');

      if (!this.safeEqual(signature, expected)) {
        throw new UnauthorizedException('Chữ ký webhook SePay không hợp lệ');
      }
      return;
    }

    const apiKey = this.config.get<string>('SEPAY_WEBHOOK_API_KEY')?.trim();
    if (!apiKey) {
      throw new UnauthorizedException(
        'Server chưa cấu hình xác thực webhook SePay',
      );
    }
    if (!this.safeEqual(authorization ?? '', `Apikey ${apiKey}`)) {
      throw new UnauthorizedException('API key webhook SePay không hợp lệ');
    }
  }

  async processWebhook(dto: SepayWebhookDto) {
    const sepayTransactionId = String(dto.id);
    const existing = await this.prisma.paymentTransaction.findUnique({
      where: { sepayTransactionId },
    });
    if (existing) {
      return { success: true, duplicate: true };
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const event = await tx.paymentTransaction.create({
          data: {
            sepayTransactionId,
            payload: { ...dto } as Prisma.InputJsonValue,
          },
        });

        const reject = async (reason: string, orderId?: string) => {
          await tx.paymentTransaction.update({
            where: { id: event.id },
            data: {
              orderId,
              status: PaymentEventStatus.REJECTED,
              reason,
              processedAt: new Date(),
            },
          });
          return { success: true, matched: false, reason };
        };

        if (dto.transferType !== 'in') {
          return reject('Giao dịch không phải tiền vào');
        }

        const expectedAccount = this.config
          .get<string>('SEPAY_ACCOUNT_NUMBER', '12897891')
          .replace(/\s+/g, '');
        if (dto.accountNumber.replace(/\s+/g, '') !== expectedAccount) {
          return reject('Sai tài khoản nhận');
        }

        const paymentCode = this.extractPaymentCode(dto);
        if (!paymentCode) {
          return reject('Không tìm thấy mã thanh toán');
        }

        const order = await tx.paymentOrder.findUnique({
          where: { paymentCode },
          include: { package: true },
        });
        if (!order) return reject('Mã thanh toán không tồn tại');

        if (order.status === PaymentStatus.PAID) {
          await tx.paymentTransaction.update({
            where: { id: event.id },
            data: {
              orderId: order.id,
              status: PaymentEventStatus.COMPLETED,
              reason: 'Đơn đã được thanh toán trước đó',
              processedAt: new Date(),
            },
          });
          return { success: true, matched: true, duplicateOrder: true };
        }

        if (
          order.status !== PaymentStatus.PENDING ||
          order.expiresAt <= new Date()
        ) {
          if (order.status === PaymentStatus.PENDING) {
            await tx.paymentOrder.update({
              where: { id: order.id },
              data: { status: PaymentStatus.EXPIRED },
            });
          }
          return reject('Đơn thanh toán đã hết hạn', order.id);
        }

        if (dto.transferAmount !== order.amount) {
          return reject(
            `Sai số tiền: nhận ${dto.transferAmount}, cần ${order.amount}`,
            order.id,
          );
        }

        const user = await tx.user.findUnique({
          where: { id: order.userId },
          select: { premiumExpiresAt: true },
        });
        if (!user) return reject('Tài khoản người dùng không tồn tại', order.id);

        const premiumExpiresAt = this.calculatePremiumExpiry(
          user.premiumExpiresAt,
          order.package.durationUnit,
          order.package.days,
          order.package.months,
        );
        const paidAt = new Date();

        await tx.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: PaymentStatus.PAID,
            paidAmount: dto.transferAmount,
            paidAt,
          },
        });
        await tx.user.update({
          where: { id: order.userId },
          data: {
            isPremium: true,
            packageId: order.packageId,
            premiumExpiresAt,
          },
        });
        await tx.paymentTransaction.update({
          where: { id: event.id },
          data: {
            orderId: order.id,
            status: PaymentEventStatus.COMPLETED,
            processedAt: paidAt,
          },
        });

        return { success: true, matched: true };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { success: true, duplicate: true };
      }
      throw error;
    }
  }

  private async createOrderWithUniqueCode(
    userId: string,
    packageId: string,
    amount: number,
  ) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.paymentOrder.create({
          data: {
            userId,
            packageId,
            amount,
            paymentCode: `SHD${randomBytes(5).toString('hex').toUpperCase()}`,
            expiresAt: new Date(Date.now() + ORDER_TTL_MS),
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new BadRequestException('Không thể tạo mã thanh toán, hãy thử lại');
  }

  private mapOrder<
    T extends {
      id: string;
      paymentCode: string;
      amount: number;
      status: PaymentStatus;
      expiresAt: Date;
      paidAt: Date | null;
    },
    P extends {
      id: string;
      name: string;
      durationUnit: DurationUnit;
      days: number;
      months: number;
    },
  >(order: T, pkg: P) {
    const bank = this.config.get<string>('SEPAY_BANK', 'ACB');
    const accountNumber = this.config.get<string>(
      'SEPAY_ACCOUNT_NUMBER',
      '12897891',
    );
    const accountHolder = this.config.get<string>(
      'SEPAY_ACCOUNT_HOLDER',
      'LE CHAU KIET',
    );
    const qr = new URL('https://vietqr.app/img');
    qr.searchParams.set('bank', bank);
    qr.searchParams.set('acc', accountNumber);
    qr.searchParams.set('amount', String(order.amount));
    qr.searchParams.set('addInfo', order.paymentCode);
    qr.searchParams.set('template', 'compact');
    qr.searchParams.set('showinfo', 'true');
    qr.searchParams.set('holder', accountHolder);

    return {
      id: order.id,
      paymentCode: order.paymentCode,
      amount: order.amount,
      status: order.status,
      expiresAt: order.expiresAt,
      paidAt: order.paidAt,
      package: {
        id: pkg.id,
        name: pkg.name,
        durationUnit: pkg.durationUnit,
        days: pkg.days,
        months: pkg.months,
      },
      bank: { bank, accountNumber, accountHolder },
      qrUrl: qr.toString(),
    };
  }

  private extractPaymentCode(dto: SepayWebhookDto) {
    const configuredPrefix = this.config
      .get<string>('SEPAY_PAYMENT_PREFIX', 'SHD')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const pattern = new RegExp(`${configuredPrefix}[A-Z0-9]{10}`, 'i');
    const source = `${dto.code ?? ''} ${dto.content ?? ''}`;
    return source.match(pattern)?.[0]?.toUpperCase() ?? null;
  }

  private calculatePremiumExpiry(
    currentExpiry: Date | null,
    unit: DurationUnit,
    days: number,
    months: number,
  ) {
    const now = new Date();
    const result =
      currentExpiry && currentExpiry > now ? new Date(currentExpiry) : now;
    if (unit === DurationUnit.DAY) {
      result.setDate(result.getDate() + Math.max(days, 1));
    } else {
      result.setMonth(result.getMonth() + Math.max(months, 1));
    }
    return result;
  }

  private safeEqual(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
