import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';

interface UploadedAvatarFile {
  buffer: Buffer;
  originalname: string;
}
import { PasswordResetService } from './password-reset.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import {
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ResendResetCodeDto,
  ResetPasswordDto,
} from './dto/password-reset.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private passwordResetService: PasswordResetService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }

  @Patch('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  updateAvatar(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: UploadedAvatarFile,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh đại diện');
    }
    return this.authService.updateAvatar(user.id, file);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordResetService.forgotPassword(dto);
  }

  @Post('resend-reset-code')
  resendResetCode(@Body() dto: ResendResetCodeDto) {
    return this.passwordResetService.resendCode(dto);
  }

  @Post('verify-reset-code')
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.passwordResetService.verifyCode(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto);
  }
}
