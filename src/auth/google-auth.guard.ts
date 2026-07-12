import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      const res = context.switchToHttp().getResponse<Response>();
      res.redirect(
        `/xac-thuc-google?error=${encodeURIComponent('Đăng nhập Google chưa được cấu hình trên server')}`,
      );
      return false;
    }

    return super.canActivate(context);
  }
}
