import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto, VerifyResetCodeDto, ResendResetCodeDto, ResetPasswordDto } from './dto/password-reset.dto';
export declare class PasswordResetService {
    private prisma;
    private mail;
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
        resetToken: `${string}-${string}-${string}-${string}-${string}`;
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private createAndSendCode;
}
