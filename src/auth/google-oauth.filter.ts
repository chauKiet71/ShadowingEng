import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class GoogleOAuthExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const message = encodeURIComponent(
      exception instanceof HttpException
        ? String(exception.message)
        : exception instanceof Error
          ? exception.message
          : 'Đăng nhập Google thất bại',
    );
    res.redirect(`/xac-thuc-google?error=${message}`);
  }
}
