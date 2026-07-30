import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForgotPasswordDto,
  ResendResetCodeDto,
  ResetPasswordDto,
  VerifyResetCodeDto,
} from './dto/password-reset.dto';

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const RESET_REQUEST_MESSAGE =
  'Nếu email đã được đăng ký, chúng tôi sẽ gửi mã xác nhận đến hộp thư của bạn';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  forgotPassword(dto: ForgotPasswordDto) {
    return this.requestResetCode(dto.email);
  }

  resendCode(dto: ResendResetCodeDto) {
    return this.requestResetCode(dto.email);
  }

  async verifyCode(dto: VerifyResetCodeDto) {
    const email = this.normalizeEmail(dto.email);
    const record = await this.prisma.passwordReset.findFirst({
      where: { email, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !record ||
      record.expiresAt <= new Date() ||
      record.attempts >= OTP_MAX_ATTEMPTS
    ) {
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    const valid = await bcrypt.compare(dto.code, record.codeHash);
    if (!valid) {
      const attempts = record.attempts + 1;

      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.prisma.passwordReset.delete({ where: { id: record.id } });
      } else {
        await this.prisma.passwordReset.update({
          where: { id: record.id },
          data: { attempts: { increment: 1 } },
        });
      }

      throw new BadRequestException(
        attempts >= OTP_MAX_ATTEMPTS
          ? 'Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới'
          : 'Mã xác nhận không đúng',
      );
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = this.hashResetToken(resetToken);
    const tokenExpires = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    const updated = await this.prisma.passwordReset.updateMany({
      where: {
        id: record.id,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        verified: true,
        resetToken: resetTokenHash,
        expiresAt: tokenExpires,
      },
    });

    if (updated.count !== 1) {
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    return { resetToken, message: 'Xác nhận thành công' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetTokenHash = this.hashResetToken(dto.resetToken);
    const record = await this.prisma.passwordReset.findUnique({
      where: { resetToken: resetTokenHash },
    });

    if (!record || !record.verified || record.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.passwordReset.deleteMany({
        where: {
          id: record.id,
          resetToken: resetTokenHash,
          verified: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException(
          'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
        );
      }

      await transaction.user.update({
        where: { email: record.email },
        data: { password: passwordHash },
      });

      // Thu hồi mọi mã hoặc token khác đã được tạo cho cùng tài khoản.
      await transaction.passwordReset.deleteMany({
        where: { email: record.email },
      });
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  private async requestResetCode(rawEmail: string) {
    const email = this.normalizeEmail(rawEmail);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Luôn trả cùng một nội dung để không làm lộ tài khoản có tồn tại hay không.
    if (!user) return { message: RESET_REQUEST_MESSAGE, email };

    const latest = await this.prisma.passwordReset.findFirst({
      where: { email, verified: false },
      orderBy: { createdAt: 'desc' },
    });

    if (latest) {
      const elapsedSeconds = (Date.now() - latest.createdAt.getTime()) / 1000;
      if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
        return { message: RESET_REQUEST_MESSAGE, email };
      }
    }

    await this.createAndSendCode(email);
    return { message: RESET_REQUEST_MESSAGE, email };
  }

  private async createAndSendCode(email: string) {
    const code = String(randomInt(100000, 1_000_000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.passwordReset.deleteMany({ where: { email } });
    const record = await this.prisma.passwordReset.create({
      data: { email, codeHash, expiresAt },
    });

    try {
      await this.mail.sendPasswordResetCode(email, code);
    } catch (error) {
      // Không giữ một OTP mà người dùng chưa bao giờ nhận được.
      await this.prisma.passwordReset.deleteMany({ where: { id: record.id } });
      throw error;
    }
  }

  private normalizeEmail(email: string) {
    return email.toLowerCase().trim();
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
