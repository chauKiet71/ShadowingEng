import { IsEnum } from 'class-validator';
import { CefrLevel } from '@prisma/client';

export class CreateConversationDto {
  @IsEnum(CefrLevel)
  level!: CefrLevel;
}
