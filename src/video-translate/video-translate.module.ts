import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VideoTranslateController } from './video-translate.controller';
import { VideoTranslateService } from './video-translate.service';

@Module({
  imports: [AuthModule],
  controllers: [VideoTranslateController],
  providers: [VideoTranslateService],
})
export class VideoTranslateModule {}
