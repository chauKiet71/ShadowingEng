import { CefrLevel, SpeakingDialect } from '@prisma/client';
export declare class CreateSpeakingSessionDto {
    scenarioId: string;
    level: CefrLevel;
    dialect: SpeakingDialect;
}
