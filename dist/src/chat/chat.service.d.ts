import { ConfigService } from '@nestjs/config';
import { CefrLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare const FREE_CHAT_MESSAGE_LIMIT = 10;
export declare class ChatService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private openai;
    constructor(prisma: PrismaService, config: ConfigService);
    getQuota(userId: string): Promise<{
        used: number;
        limit: number;
        remaining: number | null;
        isPremium: boolean;
    }>;
    createConversation(userId: string, level: CefrLevel): Promise<{
        conversation: {
            id: string;
            level: import("@prisma/client").$Enums.CefrLevel;
            createdAt: Date;
        };
        messages: {
            id: string;
            role: import("@prisma/client").$Enums.ChatMessageRole;
            content: string;
            createdAt: Date;
        }[];
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
        };
    }>;
    sendMessage(userId: string, conversationId: string, content: string): Promise<{
        userMessage: {
            id: string;
            role: import("@prisma/client").$Enums.ChatMessageRole;
            content: string;
            createdAt: Date;
        };
        assistantMessage: {
            id: string;
            role: import("@prisma/client").$Enums.ChatMessageRole;
            content: string;
            createdAt: Date;
        };
        quota: {
            used: number;
            limit: number;
            remaining: number | null;
            isPremium: boolean;
        };
    }>;
    private resolvePremium;
    private ensureOpenAi;
    private buildSystemPrompt;
    private complete;
    private mapMessage;
}
