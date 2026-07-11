import { ConfigService } from '@nestjs/config';
import { type ScoredWord } from './word-scorer';
export interface ShadowingResult {
    transcript: string;
    words: ScoredWord[];
    score: number;
}
export declare class ShadowingService {
    private config;
    private readonly logger;
    private openai;
    constructor(config: ConfigService);
    isConfigured(): boolean;
    scoreRecording(audioBase64: string, expectedText: string): Promise<ShadowingResult>;
}
