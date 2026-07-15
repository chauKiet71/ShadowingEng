import { JwtService } from '@nestjs/jwt';
import type { Profile } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
interface UploadedAvatarFile {
    buffer: Buffer;
    originalname: string;
}
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        user: Omit<{
            package: {
                id: string;
                name: string;
                duration: string;
                durationUnit: import("@prisma/client").$Enums.DurationUnit;
                days: number;
                months: number;
            } | null;
            isPremium: boolean;
            status: import("@prisma/client").$Enums.UserStatus;
            email: string;
            fullName: string;
            id: string;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            xp: number;
            level: number;
            streakDays: number;
            premiumExpiresAt: Date | null;
            packageId: string | null;
        }, "status">;
        accessToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: Omit<{
            package: {
                id: string;
                name: string;
                duration: string;
                durationUnit: import("@prisma/client").$Enums.DurationUnit;
                days: number;
                months: number;
            } | null;
            isPremium: boolean;
            status: import("@prisma/client").$Enums.UserStatus;
            email: string;
            fullName: string;
            id: string;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            xp: number;
            level: number;
            streakDays: number;
            premiumExpiresAt: Date | null;
            packageId: string | null;
        }, "status">;
        accessToken: string;
    }>;
    loginWithGoogle(profile: Profile): Promise<{
        user: Omit<{
            package: {
                id: string;
                name: string;
                duration: string;
                durationUnit: import("@prisma/client").$Enums.DurationUnit;
                days: number;
                months: number;
            } | null;
            isPremium: boolean;
            status: import("@prisma/client").$Enums.UserStatus;
            email: string;
            fullName: string;
            id: string;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            xp: number;
            level: number;
            streakDays: number;
            premiumExpiresAt: Date | null;
            packageId: string | null;
        }, "status">;
        accessToken: string;
    }>;
    getProfile(userId: string): Promise<Omit<{
        package: {
            id: string;
            name: string;
            duration: string;
            durationUnit: import("@prisma/client").$Enums.DurationUnit;
            days: number;
            months: number;
        } | null;
        isPremium: boolean;
        status: import("@prisma/client").$Enums.UserStatus;
        email: string;
        fullName: string;
        id: string;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        xp: number;
        level: number;
        streakDays: number;
        premiumExpiresAt: Date | null;
        packageId: string | null;
    }, "status">>;
    updateAvatar(userId: string, file: UploadedAvatarFile): Promise<Omit<{
        package: {
            id: string;
            name: string;
            duration: string;
            durationUnit: import("@prisma/client").$Enums.DurationUnit;
            days: number;
            months: number;
        } | null;
        isPremium: boolean;
        status: import("@prisma/client").$Enums.UserStatus;
        email: string;
        fullName: string;
        id: string;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        xp: number;
        level: number;
        streakDays: number;
        premiumExpiresAt: Date | null;
        packageId: string | null;
    }, "status">>;
    private signToken;
    private sanitizeUser;
}
export {};
