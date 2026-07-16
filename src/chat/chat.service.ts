import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CefrLevel,
  ChatMessageRole,
  type ChatMessage,
} from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

export const FREE_CHAT_MESSAGE_LIMIT = 10;

const LEVEL_GUIDANCE: Record<CefrLevel, string> = {
  A1: 'Use only A1 vocabulary and very short present-tense sentences. Speak slowly and clearly. Topics: greetings, family, food, daily routines.',
  A2: 'Use A2 vocabulary and simple past/present. Short connected sentences. Topics: travel, shopping, hobbies, simple opinions.',
  B1: 'Use B1 vocabulary. Mix tenses naturally. Topics: work, travel plans, experiences, reasons and opinions.',
  B2: 'Use B2 vocabulary and clearer arguments. Discuss advantages/disadvantages, news, career, abstract ideas at a moderate level.',
  C1: 'Use C1 vocabulary and nuanced phrasing. Discuss complex topics, subtle opinions, and precise wording while staying natural.',
  C2: 'Use C2 vocabulary and near-native fluency. Handle sophisticated topics, idioms, and fine shades of meaning.',
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY chưa cấu hình — tính năng Chat AI sẽ không hoạt động',
      );
    }
  }

  async getQuota(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isPremium: true, chatMessagesUsed: true, premiumExpiresAt: true },
    });

    const isPremium = this.resolvePremium(user);
    return {
      used: user.chatMessagesUsed,
      limit: FREE_CHAT_MESSAGE_LIMIT,
      remaining: isPremium
        ? null
        : Math.max(0, FREE_CHAT_MESSAGE_LIMIT - user.chatMessagesUsed),
      isPremium,
    };
  }

  async createConversation(userId: string, level: CefrLevel) {
    this.ensureOpenAi();

    const conversation = await this.prisma.chatConversation.create({
      data: { userId, level },
    });

    const reply = await this.complete(level, [
      {
        role: 'user',
        content:
          'Please greet me warmly and start a simple conversation suitable for my level. Ask one easy question.',
      },
    ]);

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: ChatMessageRole.ASSISTANT,
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

  async sendMessage(userId: string, conversationId: string, content: string) {
    this.ensureOpenAi();

    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện');
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

    if (!isPremium && user.chatMessagesUsed >= FREE_CHAT_MESSAGE_LIMIT) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Bạn đã hết 10 tin nhắn miễn phí. Nâng cấp Premium để tiếp tục trò chuyện.',
        code: 'CHAT_QUOTA_EXCEEDED',
      });
    }

    const trimmed = content.trim();
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: ChatMessageRole.USER,
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
      .filter((m) => m.role !== ChatMessageRole.SYSTEM)
      .map((m) => ({
        role:
          m.role === ChatMessageRole.USER
            ? ('user' as const)
            : ('assistant' as const),
        content: m.content,
      }));

    let replyText: string;
    try {
      replyText = await this.complete(conversation.level, openaiMessages);
    } catch (error) {
      this.logger.error('OpenAI chat failed', error);
      throw new ServiceUnavailableException(
        'Không thể kết nối AI lúc này. Vui lòng thử lại sau.',
      );
    }

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: ChatMessageRole.ASSISTANT,
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

  private resolvePremium(user: {
    isPremium: boolean;
    premiumExpiresAt: Date | null;
  }) {
    if (!user.isPremium) return false;
    if (user.premiumExpiresAt && user.premiumExpiresAt <= new Date()) {
      return false;
    }
    return true;
  }

  private ensureOpenAi() {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY chưa được cấu hình trên server',
      );
    }
  }

  private buildSystemPrompt(level: CefrLevel) {
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

  private async complete(
    level: CefrLevel,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) {
    this.ensureOpenAi();
    const response = await this.openai!.chat.completions.create({
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
      throw new ServiceUnavailableException('AI không trả về nội dung');
    }
    return text;
  }

  private mapMessage(message: ChatMessage) {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    };
  }
}
