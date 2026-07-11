import { UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getStats(): Promise<{
        total: number;
        newUsers: number;
        proUsers: number;
        activeUsers: number;
    }>;
    findAll(page?: string, limit?: string, status?: UserStatus, isPremium?: string, search?: string): Promise<{
        users: {
            id: string;
            email: string;
            fullName: string;
            avatarUrl: string | null;
            status: import("@prisma/client").$Enums.UserStatus;
            isPremium: boolean;
            lastActivity: Date | null;
            createdAt: Date;
            package: {
                name: string;
            } | null;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getProfile(id: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        avatarUrl: string | null;
        xp: number;
        level: number;
        streakDays: number;
        isPremium: boolean;
        createdAt: Date;
        package: {
            id: string;
            status: import("@prisma/client").$Enums.PackageStatus;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            price: number;
            duration: string;
            durationUnit: import("@prisma/client").$Enums.DurationUnit;
            days: number;
            months: number;
            monthlyPrice: number;
            originalPrice: number | null;
            badge: string | null;
            sortOrder: number;
            icon: string;
            isVisible: boolean;
            benefits: import("@prisma/client/runtime/client").JsonValue | null;
            limits: import("@prisma/client/runtime/client").JsonValue | null;
        } | null;
    } | null>;
}
