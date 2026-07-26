import { AdminOverviewService } from './admin-overview.service';
import { AdminPackagesService } from './admin-packages.service';
import { AdminStatsRange, AdminStatsService } from './admin-stats.service';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminUsersService } from './admin-users.service';
import { UpdateAdminUserPremiumDto } from './dto/update-admin-user-premium.dto';
export declare class AdminController {
    private readonly overviewService;
    private readonly transactionsService;
    private readonly statsService;
    private readonly packagesService;
    private readonly usersService;
    constructor(overviewService: AdminOverviewService, transactionsService: AdminTransactionsService, statsService: AdminStatsService, packagesService: AdminPackagesService, usersService: AdminUsersService);
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
    getStats(range?: string, from?: string, to?: string): Promise<{
        range: AdminStatsRange;
        days: number;
        from: string;
        to: string;
        generatedAt: string;
        summary: {
            newUsers: number;
            avgDailyActive: number;
            revenue: number;
            paidOrders: number;
            lessonsCompleted: number;
            listeningMinutes: number;
            speakingSessions: number;
            videoReady: number;
            videoFailed: number;
            vocabUpdates: number;
        };
        series: {
            date: string;
            newUsers: number;
            activeUsers: number;
            revenue: number;
            paidOrders: number;
            lessonsCompleted: number;
            speakingSessions: number;
            videoReady: number;
            videoFailed: number;
            vocabUpdates: number;
        }[];
        funnel: {
            registered: number;
            activated: number;
            engaged: number;
            paid: number;
        };
        featureMix: {
            listening: number;
            speaking: number;
            video: number;
            vocabulary: number;
        };
    }>;
    listPackageSubscribers(id: string): Promise<{
        package: {
            id: string;
            name: string;
        };
        total: number;
        subscribers: {
            id: string;
            fullName: string;
            email: string;
            avatarUrl: string | null;
            isPremium: boolean;
            packageName: string;
            subscribedAt: string;
            expiresAt: string | null;
        }[];
    }>;
    updateUserPremium(id: string, body: UpdateAdminUserPremiumDto): Promise<{
        id: string;
        fullName: string;
        email: string;
        avatarUrl: string | null;
        isPremium: boolean;
        packageName: string | null;
        packageId: string | null;
        expiresAt: string | null;
    }>;
    getTransactionStats(): Promise<{
        pending: number;
        paidToday: number;
        revenueToday: number;
        paidMonth: number;
        revenueMonth: number;
        expiredOrCancelled7d: number;
        paidTotal: number;
    }>;
    listTransactions(page?: string, limit?: string, status?: string, search?: string): Promise<{
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
