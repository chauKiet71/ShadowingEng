import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const configuredPort = Number(this.config.get('SMTP_PORT') ?? 587);
    const port = Number.isInteger(configuredPort) ? configuredPort : 587;
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();

    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    this.from =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      `Shadowing ENGLISH <${user ?? 'noreply@localhost'}>`;

    this.transporter =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          })
        : null;

    if (!this.transporter && this.isProduction) {
      this.logger.error(
        'SMTP chưa được cấu hình đầy đủ. API quên mật khẩu sẽ tạm thời không gửi được email.',
      );
    }
  }

  async sendPasswordResetCode(email: string, code: string) {
    if (!this.transporter) {
      if (this.isProduction) {
        throw new ServiceUnavailableException(
          'Dịch vụ email chưa được cấu hình. Vui lòng thử lại sau',
        );
      }

      this.logger.warn(`[DEV] Mã OTP cho ${email}: ${code}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Mã xác nhận đặt lại mật khẩu - Shadowing ENGLISH',
        text: `Mã xác nhận đặt lại mật khẩu của bạn là ${code}. Mã có hiệu lực trong 10 phút.`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Shadowing ENGLISH</h2>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Mã xác nhận của bạn là:</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${code}</p>
            <p style="color: #666;">Mã có hiệu lực trong <strong>10 phút</strong>.</p>
            <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
          </div>
        `,
      });
      this.logger.log(`Đã gửi mã OTP đến ${email}`);
    } catch (error) {
      this.logger.error(
        `Không thể gửi email đặt lại mật khẩu đến ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Không thể gửi email xác nhận. Vui lòng thử lại sau',
      );
    }
  }
}
