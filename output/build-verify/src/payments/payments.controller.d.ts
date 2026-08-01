import type { Request } from 'express';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { PaymentsService } from './payments.service';
type AuthenticatedRequest = Request & {
    user: {
        id: string;
    };
    rawBody?: Buffer;
};
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createOrder(req: AuthenticatedRequest, dto: CreatePaymentOrderDto): Promise<{
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
    getOrder(req: AuthenticatedRequest, id: string): Promise<{
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
    receiveSepayWebhook(req: AuthenticatedRequest, authorization: string | undefined, signature: string | undefined, timestamp: string | undefined, dto: SepayWebhookDto): Promise<{
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
}
export {};
