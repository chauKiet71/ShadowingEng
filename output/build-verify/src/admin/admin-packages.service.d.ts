import { PrismaService } from '../prisma/prisma.service';
export declare class AdminPackagesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listSubscribers(packageId: string): Promise<{
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
}
