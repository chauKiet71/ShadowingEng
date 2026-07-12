import { IsBoolean } from 'class-validator';

export class UpdateLessonAccessDto {
  @IsBoolean()
  isLocked!: boolean;
}
