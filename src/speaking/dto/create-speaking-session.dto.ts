import { CefrLevel, SpeakingDialect } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CreateSpeakingSessionDto {
  @IsUUID()
  scenarioId!: string;

  @IsEnum(CefrLevel)
  level!: CefrLevel;

  @IsEnum(SpeakingDialect)
  dialect!: SpeakingDialect;
}
