import { PrismaService } from '../prisma/prisma.service';
export type AdminStatsRange = '7d' | '30d' | '90d' | 'custom';
export type AdminStatsQuery = {
    range?: AdminStatsRange;
    from?: string;
    to?: string;
};
type DayBucket = {
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
};
export declare class AdminStatsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStats(query?: AdminStatsQuery): Promise<{
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
        series: DayBucket[];
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
}
export {};
