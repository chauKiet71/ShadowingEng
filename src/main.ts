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
