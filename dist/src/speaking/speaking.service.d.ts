import { ConfigService } from '@nestjs/config';
import { CefrLevel, SpeakingDialect } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare const FREE_SPEAKING_TURNS_PER_DAY = 3;
export declare const MAX_SPEAKING_AUDIO_BYTES: number;
export declare const MAX_SPEAKING_DURATION_MS = 60000;
export declare class SpeakingService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private openai;
    constructor(prisma: PrismaService, config: ConfigService);
    listScenarios(): Promise<{
        id: string;
        description: string;
        sortOrder: number;
        icon: string;
        title: string;
        slug: string;
        color: string;
        learnerRole: string;
        aiRole: string;
        objective: string;
        minLevel: import("@prisma/client").$Enums.CefrLevel;
        maxLevel: import("@prisma/client").$Enums.CefrLevel;
    }[]>;
    getQuota(userId: string): Promise<{
        used: number;
        limit: number;
        remaining: number | null;
        isPremium: boolean;
        resetsAt: string;
    }>;
    createSession(userId: string, scenarioId: string, level: CefrLevel, dialect: SpeakingDialect): Promise<{
        session: {
            id: string;
            level: import("@prisma/client").$Enums.CefrLevel;
            dialect: import("@prisma/client").$Enums.SpeakingDialect;
            status: import("@prisma/client").$Enums.SpeakingSessionStatus;
            turnCount: number;
            createdAt: Date;
            completedAt: Date | null;
            scenario: {
                id: string;
                slug: string;
                title: string;
                description: string;
                icon: string;
                color: string;
                learnerRole: string;
                aiRole: string;
                objective: string;
            };
        };
        turn: {
            id: string;
            turnIndex: number;
            promptText: string;
            transcript: string | null;
            suggestion: string | null;
            feedback: string | null;
            aiReply: string | null;
            scores: {
                pronunciation: number | null;
                fluency: number | null;
                grammar: number | null;
                vocabulary: number | null;
                coherence: number | null;
                overall: number | null;
                relevance: string | null;
                cefrOverall: string | null;
            };
            durationMs: number | null;
            createdAt: Date;
        };
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
            resetsAt: string;
        };
    }>;
    getSession(userId: string, sessionId: string): Promise<{
        session: {
            id: string;
            level: import("@prisma/client").$Enums.CefrLevel;
            dialect: import("@prisma/client").$Enums.SpeakingDialect;
            status: import("@prisma/client").$Enums.SpeakingSessionStatus;
            turnCount: number;
            createdAt: Date;
            completedAt: Date | null;
            scenario: {
                id: string;
                slug: string;
                title: string;
                description: string;
                icon: string;
                color: string;
                learnerRole: string;
                aiRole: string;
                objective: string;
            };
        };
        turns: {
            id: string;
            turnIndex: number;
            promptText: string;
            transcript: string | null;
            suggestion: string | null;
            feedback: string | null;
            aiReply: string | null;
            scores: {
                pronunciation: number | null;
                fluency: number | null;
                grammar: number | null;
                vocabulary: number | null;
                coherence: number | null;
                overall: number | null;
                relevance: string | null;
                cefrOverall: string | null;
            };
            durationMs: number | null;
            createdAt: Date;
        }[];
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
            resetsAt: string;
        };
    }>;
    submitTurn(userId: string, sessionId: string, file: {
        buffer: Buffer;
        mimetype: string;
        originalname: string;
        size: number;
    }, durationMs?: number): Promise<{
        turn: {
            id: string;
            turnIndex: number;
            promptText: string;
            transcript: string | null;
            suggestion: string | null;
            feedback: string | null;
            aiReply: string | null;
            scores: {
                pronunciation: number | null;
                fluency: number | null;
                grammar: number | null;
                vocabulary: number | null;
                coherence: number | null;
                overall: number | null;
                relevance: string | null;
                cefrOverall: string | null;
            };
            durationMs: number | null;
            createdAt: Date;
        };
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
            resetsAt: string;
        };
    }>;
    completeSession(userId: string, sessionId: string): Promise<{
        session: {
            id: string;
            level: import("@prisma/client").$Enums.CefrLevel;
            dialect: import("@prisma/client").$Enums.SpeakingDialect;
            status: import("@prisma/client").$Enums.SpeakingSessionStatus;
            turnCount: number;
            createdAt: Date;
            completedAt: Date | null;
            scenario: {
                id: string;
                slug: string;
                title: string;
                description: string;
                icon: string;
                color: string;
                learnerRole: string;
                aiRole: string;
                objective: string;
            };
        };
        turns: {
            id: string;
            turnIndex: number;
            promptText: string;
            transcript: string | null;
            suggestion: string | null;
            feedback: string | null;
            aiReply: string | null;
            scores: {
                pronunciation: number | null;
                fluency: number | null;
                grammar: number | null;
                vocabulary: number | null;
                coherence: number | null;
                overall: number | null;
                relevance: string | null;
                cefrOverall: string | null;
            };
            durationMs: number | null;
            createdAt: Date;
        }[];
        summary: {
            turnsSpoken: number;
            averageOverall: number | null;
            averagePronunciation: number | null;
            averageFluency: number | null;
            averageGrammar: number | null;
            averageVocabulary: number | null;
            averageCoherence: number | null;
        };
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
            resetsAt: string;
        };
    }>;
    private ensureCatalog;
    private resolvePremium;
    private usageDate;
    private nextResetAt;
    private getTodayUsage;
    private assertAndReserveQuota;
    private releaseQuotaReservation;
    private transcribeAudio;
    private ensureOpenAi;
    translateToVietnamese(text: string): Promise<{
        translation: string;
    }>;
    private generateAiReply;
    private mapSession;
    private mapTurn;
}
