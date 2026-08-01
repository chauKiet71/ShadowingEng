import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class AdminTransactionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStats(): Promise<{
        pending: number;
        paidToday: number;
        revenueToday: number;
        paidMonth: number;
        revenueMonth: number;
        expiredOrCancelled7d: number;
        paidTotal: number;
    }>;
    list(params: {
        page?: number;
        limit?: number;
        status?: PaymentStatus;
        search?: string;
    }): Promise<{
        orders: {
            id: string;
            paymentCode: string;
            amount: number;
            paidAmount: number | null;
            status: import("@prisma/client").$Enums.PaymentStatus;
            paidAt: string | null;
            expiresAt: string;
            createdAt: string;
            updatedAt: string;
            user: {
                id: string;
                email: string;
                fullName: string;
                avatarUrl: string | null;
            };
            package: {
                id: string;
                name: string;
            };
            events: {
                id: string;
                sepayTransactionId: string;
                status: import("@prisma/client").$Enums.PaymentEventStatus;
                reason: string | null;
                createdAt: string;
                processedAt: string | null;
            }[];
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
}
