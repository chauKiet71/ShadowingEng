import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS')?.replace(/\s/g, '');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendPasswordResetCode(email: string, code: string) {
    const subject = 'Mã xác nhận đặt lại mật khẩu - Shadowing ENGLISH';
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Shadowing ENGLISH</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Mã xác nhận của bạn là:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${code}</p>
        <p style="color: #666;">Mã có hiệu lực trong <strong>10 phút</strong>.</p>
        <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(
        `[DEV] SMTP chưa cấu hình — Mã OTP cho ${email}: ${code}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', 'noreply@shadowing.com'),
        to: email,
        subject,
        html,
      });
      this.logger.log(`Đã gửi mã OTP đến ${email}`);
    } catch (error) {
      this.logger.warn(
        `[DEV] Gửi email thất bại — Mã OTP cho ${email}: ${code}`,
      );
      this.logger.error(
        error instanceof Error ? error.message : 'Unknown mail error',
      );
    }
  }
}
