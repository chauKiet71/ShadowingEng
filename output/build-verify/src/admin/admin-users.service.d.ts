import { PrismaService } from '../prisma/prisma.service';
export declare class AdminUsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    updatePremium(userId: string, body: {
        premiumExpiresAt?: string | null;
        isPremium?: boolean;
        packageId?: string | null;
    }): Promise<{
        id: string;
        fullName: string;
        email: string;
        avatarUrl: string | null;
        isPremium: boolean;
        packageName: string | null;
        packageId: string | null;
        expiresAt: string | null;
    }>;
}
