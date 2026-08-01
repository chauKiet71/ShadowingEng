import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IflytekPronunciationService } from './iflytek-pronunciation.service';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';

@Module({
  imports: [AuthModule],
  controllers: [SpeakingController],
  providers: [IflytekPronunciationService, SpeakingService],
})
export class SpeakingModule {}
