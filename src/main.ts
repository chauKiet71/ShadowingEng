import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { join } from 'path';
import express, { type Request, type Response, type NextFunction } from 'express';
import { AppModule } from './app.module';
import { syncDatabaseSchema } from './prisma/database-sync';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  await syncDatabaseSchema();

  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useWebSocketAdapter(new WsAdapter(app));
  app.setGlobalPrefix('api');

  const corsOrigins = new Set([
    'https://www.hihienglish.com',
    'https://hihienglish.com',
    'https://hihienglish.netlify.app',
    'https://hihienglishh.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173',
    ...(process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]);
  const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || corsOrigins.has(origin) || localDevOrigin.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Guest-Token',
      'Accept',
    ],
    maxAge: 86400,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.use(
    '/media',
    express.static(join(process.cwd(), 'storage'), {
      fallthrough: false,
      index: false,
      maxAge: '1h',
    }),
  );

  expressApp.get(
    /^(?!\/api|\/media).*/,
    (req: Request, res: Response, next: NextFunction) => {
      if (req.path.match(/\.\w+$/)) return next();
      res.sendFile(join(process.cwd(), 'public', 'index.html'));
    },
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Shadowing ENGLISH running at http://localhost:${port}`);
}
bootstrap();
