import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ResendResetCodeDto,
  ResetPasswordDto,
} from './dto/password-reset.dto';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

@Injectable()
export class PasswordResetService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }

    await this.createAndSendCode(email);

    return {
      message: 'Chúng tôi đã gửi mã xác nhận đến email của bạn',
      email,
    };
  }

  async resendCode(dto: ResendResetCodeDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }

    const latest = await this.prisma.passwordReset.findFirst({
      where: { email, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (latest) {
      const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        throw new HttpException(
          `Vui lòng đợi ${remaining} giây trước khi gửi lại mã`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.createAndSendCode(email);
    return { message: 'Đã gửi lại mã xác nhận', email };
  }

  async verifyCode(dto: VerifyResetCodeDto) {
    const email = dto.email.toLowerCase().trim();
    const record = await this.prisma.passwordReset.findFirst({
      where: { email, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    const valid = await bcrypt.compare(dto.code, record.codeHash);
    if (!valid) {
      throw new BadRequestException('Mã xác nhận không đúng');
    }

    const resetToken = randomUUID();
    const tokenExpires = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.prisma.passwordReset.update({
      where: { id: record.id },
      data: { verified: true, resetToken, expiresAt: tokenExpires },
    });

    return { resetToken, message: 'Xác nhận thành công' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordReset.findUnique({
      where: { resetToken: dto.resetToken },
    });

    if (!record || !record.verified || record.expiresAt < new Date()) {
      throw new BadRequestException(
        'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: record.email },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await this.prisma.passwordReset.deleteMany({
      where: { email: record.email },
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  private async createAndSendCode(email: string) {
    const code = String(randomInt(100000, 999999));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.passwordReset.deleteMany({
      where: { email, verified: false },
    });

    await this.prisma.passwordReset.create({
      data: { email, codeHash, expiresAt },
    });

    await this.mail.sendPasswordResetCode(email, code);
  }
}
