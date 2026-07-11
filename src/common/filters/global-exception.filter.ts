import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      return response.status(status).json(
        typeof res === 'string' ? { statusCode: status, message: res } : res,
      );
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`Prisma error [${exception.code}]: ${exception.message}`);

      if (['P1001', 'P1000', 'P1017'].includes(exception.code)) {
        return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          statusCode: 503,
          message: 'Không thể kết nối database. Vui lòng kiểm tra DATABASE_URL.',
        });
      }

      if (exception.code === 'P2021' || exception.code === 'P2022') {
        return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          statusCode: 503,
          message: 'Database chưa sẵn sàng. Hãy khởi động lại server để đồng bộ schema.',
        });
      }
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma init error: ${exception.message}`);
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: 503,
        message: 'Lỗi kết nối database. Kiểm tra cấu hình DATABASE_URL trong .env',
      });
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    this.logger.error(message, exception instanceof Error ? exception.stack : undefined);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : message,
    });
  }
}
