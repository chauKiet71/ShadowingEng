import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
interface UploadedAvatarFile {
    buffer: Buffer;
    originalname: string;
}
import { PasswordResetService } from './password-reset.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { ForgotPasswordDto, VerifyResetCodeDto, ResendResetCodeDto, ResetPasswordDto } from './dto/password-reset.dto';
interface GoogleAuthRequest extends Request {
    user: {
        accessToken: string;
    };
}
export declare class AuthController {
    private authService;
    private passwordResetService;
    constructor(authService: AuthService, passwordResetService: PasswordResetService);
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
    googleAuth(): void;
    googleAuthCallback(req: GoogleAuthRequest, res: Response): void;
    me(user: {
        id: string;
    }): Promise<Omit<{
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
    updateAvatar(user: {
        id: string;
    }, file: UploadedAvatarFile): Promise<Omit<{
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
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        email: string;
    }>;
    resendResetCode(dto: ResendResetCodeDto): Promise<{
        message: string;
        email: string;
    }>;
    verifyResetCode(dto: VerifyResetCodeDto): Promise<{
        resetToken: `${string}-${string}-${string}-${string}-${string}`;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
export {};
