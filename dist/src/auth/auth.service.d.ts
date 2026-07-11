import { JwtService } from '@nestjs/jwt';
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
            id: string;
            email: string;
            fullName: string;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            status: import("@prisma/client").$Enums.UserStatus;
            xp: number;
            level: number;
            streakDays: number;
            isPremium: boolean;
        }, "status">;
        accessToken: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: Omit<{
            id: string;
            email: string;
            fullName: string;
            avatarUrl: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            status: import("@prisma/client").$Enums.UserStatus;
            xp: number;
            level: number;
            streakDays: number;
            isPremium: boolean;
        }, "status">;
        accessToken: string;
    }>;
    getProfile(userId: string): Promise<Omit<{
        id: string;
        email: string;
        fullName: string;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        status: import("@prisma/client").$Enums.UserStatus;
        xp: number;
        level: number;
        streakDays: number;
        isPremium: boolean;
    }, "status">>;
    updateAvatar(userId: string, file: UploadedAvatarFile): Promise<Omit<{
        id: string;
        email: string;
        fullName: string;
        avatarUrl: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        status: import("@prisma/client").$Enums.UserStatus;
        xp: number;
        level: number;
        streakDays: number;
        isPremium: boolean;
    }, "status">>;
    private signToken;
    private sanitizeUser;
}
export {};
