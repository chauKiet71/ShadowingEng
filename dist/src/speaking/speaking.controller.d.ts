import { CreateSpeakingSessionDto } from './dto/create-speaking-session.dto';
import { TranslateSpeakingDto } from './dto/translate-speaking.dto';
import { SpeakingService } from './speaking.service';
type UploadedAudio = {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
};
export declare class SpeakingController {
    private readonly speakingService;
    constructor(speakingService: SpeakingService);
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
    getQuota(user: {
        id: string;
    }): Promise<{
        used: number;
        limit: number;
        remaining: number | null;
        isPremium: boolean;
        resetsAt: string;
    }>;
    createSession(user: {
        id: string;
    }, dto: CreateSpeakingSessionDto): Promise<{
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
    translate(dto: TranslateSpeakingDto): Promise<{
        translation: string;
    }>;
    getSession(user: {
        id: string;
    }, id: string): Promise<{
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
    submitTurn(user: {
        id: string;
    }, id: string, file: UploadedAudio, durationMsRaw?: string): Promise<{
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
    completeSession(user: {
        id: string;
    }, id: string): Promise<{
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
}
export {};
