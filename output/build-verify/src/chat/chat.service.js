"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = exports.FREE_CHAT_MESSAGE_LIMIT = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const openai_1 = __importDefault(require("openai"));
const prisma_service_1 = require("../prisma/prisma.service");
exports.FREE_CHAT_MESSAGE_LIMIT = 10;
const LEVEL_GUIDANCE = {
    A1: 'Use only A1 vocabulary and very short present-tense sentences. Speak slowly and clearly. Topics: greetings, family, food, daily routines.',
    A2: 'Use A2 vocabulary and simple past/present. Short connected sentences. Topics: travel, shopping, hobbies, simple opinions.',
    B1: 'Use B1 vocabulary. Mix tenses naturally. Topics: work, travel plans, experiences, reasons and opinions.',
    B2: 'Use B2 vocabulary and clearer arguments. Discuss advantages/disadvantages, news, career, abstract ideas at a moderate level.',
    C1: 'Use C1 vocabulary and nuanced phrasing. Discuss complex topics, subtle opinions, and precise wording while staying natural.',
    C2: 'Use C2 vocabulary and near-native fluency. Handle sophisticated topics, idioms, and fine shades of meaning.',
};
let ChatService = ChatService_1 = class ChatService {
    prisma;
    config;
    logger = new common_1.Logger(ChatService_1.name);
    openai = null;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        const apiKey = this.config.get('OPENAI_API_KEY');
        if (apiKey) {
            this.openai = new openai_1.default({ apiKey });
        }
        else {
            this.logger.warn('OPENAI_API_KEY chưa cấu hình — tính năng Chat AI sẽ không hoạt động');
        }
    }
    async getQuota(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { isPremium: true, chatMessagesUsed: true, premiumExpiresAt: true },
        });
        const isPremium = this.resolvePremium(user);
        return {
            used: user.chatMessagesUsed,
            limit: exports.FREE_CHAT_MESSAGE_LIMIT,
            remaining: isPremium
                ? null
                : Math.max(0, exports.FREE_CHAT_MESSAGE_LIMIT - user.chatMessagesUsed),
            isPremium,
        };
    }
    async createConversation(userId, level) {
        this.ensureOpenAi();
        const conversation = await this.prisma.chatConversation.create({
            data: { userId, level },
        });
        const reply = await this.complete(level, [
            {
                role: 'user',
                content: 'Please greet me warmly and start a simple conversation suitable for my level. Ask one easy question.',
            },
        ]);
        const assistantMessage = await this.prisma.chatMessage.create({
            data: {
                conversationId: conversation.id,
                role: client_1.ChatMessageRole.ASSISTANT,
                content: reply,
            },
        });
        const quota = await this.getQuota(userId);
        return {
            conversation: {
                id: conversation.id,
                level: conversation.level,
                createdAt: conversation.createdAt,
            },
            messages: [this.mapMessage(assistantMessage)],
            quota,
        };
    }
    async sendMessage(userId, conversationId, content) {
        this.ensureOpenAi();
        const conversation = await this.prisma.chatConversation.findFirst({
            where: { id: conversationId, userId },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Không tìm thấy cuộc trò chuyện');
        }
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: {
                isPremium: true,
                chatMessagesUsed: true,
                premiumExpiresAt: true,
            },
        });
        const isPremium = this.resolvePremium(user);
        if (!isPremium && user.chatMessagesUsed >= exports.FREE_CHAT_MESSAGE_LIMIT) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                message: 'Bạn đã hết 10 tin nhắn miễn phí. Nâng cấp Premium để tiếp tục trò chuyện.',
                code: 'CHAT_QUOTA_EXCEEDED',
            });
        }
        const trimmed = content.trim();
        const userMessage = await this.prisma.chatMessage.create({
            data: {
                conversationId,
                role: client_1.ChatMessageRole.USER,
                content: trimmed,
            },
        });
        if (!isPremium) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { chatMessagesUsed: { increment: 1 } },
            });
        }
        const history = await this.prisma.chatMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            take: 40,
        });
        const openaiMessages = history
            .filter((m) => m.role !== client_1.ChatMessageRole.SYSTEM)
            .map((m) => ({
            role: m.role === client_1.ChatMessageRole.USER
                ? 'user'
                : 'assistant',
            content: m.content,
        }));
        let replyText;
        try {
            replyText = await this.complete(conversation.level, openaiMessages);
        }
        catch (error) {
            this.logger.error('OpenAI chat failed', error);
            throw new common_1.ServiceUnavailableException('Không thể kết nối AI lúc này. Vui lòng thử lại sau.');
        }
        const assistantMessage = await this.prisma.chatMessage.create({
            data: {
                conversationId,
                role: client_1.ChatMessageRole.ASSISTANT,
                content: replyText,
            },
        });
        const quota = await this.getQuota(userId);
        return {
            userMessage: this.mapMessage(userMessage),
            assistantMessage: this.mapMessage(assistantMessage),
            quota,
        };
    }
    resolvePremium(user) {
        if (!user.isPremium)
            return false;
        if (user.premiumExpiresAt && user.premiumExpiresAt <= new Date()) {
            return false;
        }
        return true;
    }
    ensureOpenAi() {
        if (!this.openai) {
            throw new common_1.ServiceUnavailableException('OPENAI_API_KEY chưa được cấu hình trên server');
        }
    }
    buildSystemPrompt(level) {
        return [
            'You are a friendly English conversation tutor for Vietnamese learners.',
            `The learner's CEFR level is ${level}.`,
            LEVEL_GUIDANCE[level],
            'Rules:',
            '- Keep most replies in English at the selected CEFR level.',
            '- Do not use vocabulary or grammar clearly above that level.',
            '- Keep replies concise (2-5 short sentences).',
            '- Ask one follow-up question to keep the chat going.',
            '- If the learner makes a small mistake, gently correct it in 1 short sentence.',
            '- If the learner asks in Vietnamese or is stuck, you may briefly explain in Vietnamese, then continue in English.',
            '- Stay encouraging and natural. No markdown, no bullet lists unless the learner asks.',
        ].join('\n');
    }
    async complete(level, messages) {
        this.ensureOpenAi();
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.7,
            max_tokens: 350,
            messages: [
                { role: 'system', content: this.buildSystemPrompt(level) },
                ...messages,
            ],
        });
        const text = response.choices[0]?.message?.content?.trim();
        if (!text) {
            throw new common_1.ServiceUnavailableException('AI không trả về nội dung');
        }
        return text;
    }
    mapMessage(message) {
        return {
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ChatService);
//# sourceMappingURL=chat.service.js.map