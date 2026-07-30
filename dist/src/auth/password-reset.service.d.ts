import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto, ResendResetCodeDto, ResetPasswordDto, VerifyResetCodeDto } from './dto/password-reset.dto';
export declare class PasswordResetService {
    private readonly prisma;
    private readonly mail;
    constructor(prisma: PrismaService, mail: MailService);
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        email: string;
    }>;
    resendCode(dto: ResendResetCodeDto): Promise<{
        message: string;
        email: string;
    }>;
    verifyCode(dto: VerifyResetCodeDto): Promise<{
        resetToken: string;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private requestResetCode;
    private createAndSendCode;
    private normalizeEmail;
    private hashResetToken;
}
