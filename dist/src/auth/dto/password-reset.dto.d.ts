export declare class ForgotPasswordDto {
    email: string;
}
export declare class VerifyResetCodeDto {
    email: string;
    code: string;
}
export declare class ResendResetCodeDto {
    email: string;
}
export declare class ResetPasswordDto {
    resetToken: string;
    password: string;
}
