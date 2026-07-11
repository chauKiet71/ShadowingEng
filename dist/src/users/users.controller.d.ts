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
            package: {
                name: string;
            } | null;
            isPremium: boolean;
            status: import("@prisma/client").$Enums.UserStatus;
            email: string;
            fullName: string;
            id: string;
            avatarUrl: string | null;
            lastActivity: Date | null;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getProfile(id: string): Promise<{
        package: {
            status: import("@prisma/client").$Enums.PackageStatus;
            id: string;
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
        isPremium: boolean;
        email: string;
        fullName: string;
        id: string;
        avatarUrl: string | null;
        xp: number;
        level: number;
        streakDays: number;
        createdAt: Date;
    } | null>;
}
