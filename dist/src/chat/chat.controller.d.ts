import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getQuota(user: {
        id: string;
    }): Promise<{
        used: number;
        limit: number;
        remaining: number | null;
        isPremium: boolean;
    }>;
    createConversation(user: {
        id: string;
    }, dto: CreateConversationDto): Promise<{
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
    sendMessage(user: {
        id: string;
    }, id: string, dto: SendMessageDto): Promise<{
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
}
