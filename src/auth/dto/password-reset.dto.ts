import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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
  @Length(64, 64, { message: 'Phiên đặt lại mật khẩu không hợp lệ' })
  @Matches(/^[a-f\d]{64}$/i, {
    message: 'Phiên đặt lại mật khẩu không hợp lệ',
  })
  resetToken: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(128, { message: 'Mật khẩu không được vượt quá 128 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/, {
    message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  password: string;
}
