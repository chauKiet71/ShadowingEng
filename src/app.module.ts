import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { LessonsModule } from './lessons/lessons.module';
import { CategoriesModule } from './categories/categories.module';
import { PackagesModule } from './packages/packages.module';
import { AuthModule } from './auth/auth.module';
import { ShadowingModule } from './shadowing/shadowing.module';
import { PaymentsModule } from './payments/payments.module';
import { ChatModule } from './chat/chat.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { SpeakingModule } from './speaking/speaking.module';
import { VideoTranslateModule } from './video-translate/video-translate.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      exclude: ['/api/*path', '/media/*path'],
      serveStaticOptions: {
        fallthrough: true,
        index: false,
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LessonsModule,
    CategoriesModule,
    PackagesModule,
    ShadowingModule,
    PaymentsModule,
    ChatModule,
    VocabularyModule,
    SpeakingModule,
    VideoTranslateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
