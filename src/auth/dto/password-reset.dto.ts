import { IsEmail, IsString, Length, MinLength, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class VerifyResetCodeDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Mã xác nhận phải có 6 số' })
  @Matches(/^\d{6}$/, { message: 'Mã xác nhận phải là 6 chữ số' })
  code: string;
}

export class ResendResetCodeDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  resetToken: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/, {
    message:
      'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  password: string;
}
