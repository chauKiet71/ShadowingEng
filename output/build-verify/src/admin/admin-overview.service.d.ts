import { PrismaService } from '../prisma/prisma.service';
export declare class AdminOverviewService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        generatedAt: string;
        kpis: {
            usersTotal: number;
            usersNewToday: number;
            usersNew7d: number;
            dau: number;
            premiumActive: number;
            premiumExpiring7d: number;
            revenueToday: number;
            revenueMonth: number;
            paidOrdersToday: number;
            paidOrdersMonth: number;
            conversionRate30d: number;
        };
        features: {
            lessonsCompletedToday: number;
            listeningSessionsToday: number;
            listeningMinutesToday: number;
            speakingSessionsToday: number;
            videoJobsReadyToday: number;
            videoJobsFailedToday: number;
            vocabUpdatedToday: number;
        };
        payments: {
            pending: number;
            paidToday: number;
            expiredOrCancelled7d: number;
            recent: {
                id: string;
                paymentCode: string;
                amount: number;
                status: import("@prisma/client").$Enums.PaymentStatus;
                paidAt: string | null;
                createdAt: string;
                userName: string;
                packageName: string;
            }[];
        };
        content: {
            lessonsTotal: number;
            categoriesTotal: number;
            lockedLessons: number;
        };
        alerts: {
            videoFailed: {
                id: string;
                title: string;
                errorMessage: string | null;
                userName: string;
                at: string;
            }[];
            premiumExpiring: {
                id: string;
                fullName: string;
                email: string;
                packageName: string;
                expiresAt: string | null;
            }[];
        };
        activity: ({
            type: "user";
            title: string;
            subtitle: string;
            at: string;
        } | {
            type: "payment";
            title: string;
            subtitle: string;
            at: string;
        } | {
            type: "alert";
            title: string;
            subtitle: string;
            at: string;
        })[];
    }>;
}
