import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
export declare class PaymentsService {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    createOrder(userId: string, packageId: string): Promise<{
        id: string;
        paymentCode: string;
        amount: number;
        status: import("@prisma/client").$Enums.PaymentStatus;
        expiresAt: Date;
        paidAt: Date | null;
        package: {
            id: string;
            name: string;
            durationUnit: import("@prisma/client").$Enums.DurationUnit;
            days: number;
            months: number;
        };
        bank: {
            bank: string;
            accountNumber: string;
            accountHolder: string;
        };
        qrUrl: string;
    }>;
    getOrder(userId: string, orderId: string): Promise<{
        id: string;
        paymentCode: string;
        amount: number;
        status: import("@prisma/client").$Enums.PaymentStatus;
        expiresAt: Date;
        paidAt: Date | null;
        package: {
            id: string;
            name: string;
            durationUnit: import("@prisma/client").$Enums.DurationUnit;
            days: number;
            months: number;
        };
        bank: {
            bank: string;
            accountNumber: string;
            accountHolder: string;
        };
        qrUrl: string;
    }>;
    verifyWebhook(authorization: string | undefined, signature: string | undefined, timestamp: string | undefined, rawBody: Buffer | undefined): void;
    processWebhook(dto: SepayWebhookDto): Promise<{
        success: boolean;
        matched: boolean;
        reason: string;
    } | {
        success: boolean;
        matched: boolean;
        duplicateOrder: boolean;
    } | {
        success: boolean;
        matched: boolean;
        duplicateOrder?: undefined;
    } | {
        success: boolean;
        duplicate: boolean;
    }>;
    private createOrderWithUniqueCode;
    private mapOrder;
    private extractPaymentCode;
    private calculatePremiumExpiry;
    private safeEqual;
}
