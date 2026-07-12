import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LessonsService } from './lessons.service';
import { LessonAccessService } from './lesson-access.service';
import { LessonsController } from './lessons.controller';

@Module({
  imports: [AuthModule],
  controllers: [LessonsController],
  providers: [LessonsService, LessonAccessService],
  exports: [LessonAccessService],
})
export class LessonsModule {}
