import { AuthService } from './auth.service';
interface UploadedAvatarFile {
    buffer: Buffer;
    originalname: string;
}
import { PasswordResetService } from './password-reset.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { ForgotPasswordDto, VerifyResetCodeDto, ResendResetCodeDto, ResetPasswordDto } from './dto/password-reset.dto';
export declare class AuthController {
    private authService;
    private passwordResetService;
    constructor(authService: AuthService, passwordResetService: PasswordResetService);
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
    me(user: {
        id: string;
    }): Promise<Omit<{
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
    updateAvatar(user: {
        id: string;
    }, file: UploadedAvatarFile): Promise<Omit<{
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
