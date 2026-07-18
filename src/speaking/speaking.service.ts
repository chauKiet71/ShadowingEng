import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CefrLevel,
  Prisma,
  SpeakingDialect,
  SpeakingSessionStatus,
} from '@prisma/client';
import OpenAI, { toFile } from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { SPEAKING_SCENARIOS } from './speaking-scenarios';

export const FREE_SPEAKING_TURNS_PER_DAY = 3;
export const MAX_SPEAKING_AUDIO_BYTES = 3.8 * 1024 * 1024;
export const MAX_SPEAKING_DURATION_MS = 60_000;

const LEVEL_GUIDANCE: Record<CefrLevel, string> = {
  A1: 'Use only A1 vocabulary and very short present-tense sentences.',
  A2: 'Use A2 vocabulary and simple past/present. Keep sentences short and clear.',
  B1: 'Use B1 vocabulary. Mix tenses naturally and ask practical follow-ups.',
  B2: 'Use B2 vocabulary and clearer arguments while staying conversational.',
  C1: 'Use C1 vocabulary and nuanced phrasing, still natural and concise.',
  C2: 'Use C2 vocabulary and near-native fluency without sounding academic.',
};

@Injectable()
export class SpeakingService {
  private readonly logger = new Logger(SpeakingService.name);
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
        'OPENAI_API_KEY chưa cấu hình — luyện nói sẽ không tạo được phản hồi AI',
      );
    }
  }

  async listScenarios() {
    await this.ensureCatalog();
    return this.prisma.speakingScenario.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        color: true,
        learnerRole: true,
        aiRole: true,
        objective: true,
        minLevel: true,
        maxLevel: true,
        sortOrder: true,
      },
    });
  }

  async getQuota(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isPremium: true, premiumExpiresAt: true },
    });
    const isPremium = this.resolvePremium(user);
    const usage = await this.getTodayUsage(userId);

    return {
      used: usage,
      limit: FREE_SPEAKING_TURNS_PER_DAY,
      remaining: isPremium
        ? null
        : Math.max(0, FREE_SPEAKING_TURNS_PER_DAY - usage),
      isPremium,
      resetsAt: this.nextResetAt().toISOString(),
    };
  }

  async createSession(
    userId: string,
    scenarioId: string,
    level: CefrLevel,
    dialect: SpeakingDialect,
  ) {
    this.ensureOpenAi();
    await this.ensureCatalog();

    const scenario = await this.prisma.speakingScenario.findFirst({
      where: { id: scenarioId, isVisible: true },
    });
    if (!scenario) {
      throw new NotFoundException('Không tìm thấy tình huống luyện nói');
    }

    const opening = await this.generateAiReply({
      scenarioTitle: scenario.title,
      learnerRole: scenario.learnerRole,
      aiRole: scenario.aiRole,
      objective: scenario.objective,
      openingHint: scenario.openingHint,
      level,
      history: [],
      learnerTranscript: null,
      isOpening: true,
    });

    const session = await this.prisma.speakingSession.create({
      data: {
        userId,
        scenarioId: scenario.id,
        level,
        dialect,
      },
    });

    const turn = await this.prisma.speakingTurn.create({
      data: {
        sessionId: session.id,
        turnIndex: 0,
        promptText: opening.aiReply,
        aiReply: opening.aiReply,
        suggestion: opening.suggestion,
        feedback: opening.feedback,
      },
    });

    const quota = await this.getQuota(userId);

    return {
      session: this.mapSession(session, scenario),
      turn: this.mapTurn(turn),
      quota,
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.speakingSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        scenario: true,
        turns: { orderBy: { turnIndex: 'asc' } },
      },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nói');
    }

    return {
      session: this.mapSession(session, session.scenario),
      turns: session.turns.map((turn) => this.mapTurn(turn)),
      quota: await this.getQuota(userId),
    };
  }

  async submitTurn(
    userId: string,
    sessionId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
    durationMs?: number,
  ) {
    this.ensureOpenAi();

    if (!file?.buffer?.length) {
      throw new BadRequestException('Vui lòng gửi bản ghi âm');
    }
    if (file.size > MAX_SPEAKING_AUDIO_BYTES) {
      throw new BadRequestException('File ghi âm vượt quá giới hạn cho phép');
    }
    if (
      !/^audio\/(webm|wav|mpeg|mp4|ogg|x-m4a|mp3)/i.test(file.mimetype) &&
      file.mimetype !== 'application/octet-stream'
    ) {
      throw new BadRequestException('Định dạng audio không được hỗ trợ');
    }
    if (
      typeof durationMs === 'number' &&
      durationMs > MAX_SPEAKING_DURATION_MS + 1500
    ) {
      throw new BadRequestException('Mỗi lượt nói tối đa 60 giây');
    }

    const session = await this.prisma.speakingSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        scenario: true,
        turns: { orderBy: { turnIndex: 'asc' } },
      },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nói');
    }
    if (session.status !== SpeakingSessionStatus.ACTIVE) {
      throw new BadRequestException('Phiên luyện nói đã kết thúc');
    }

    await this.assertAndReserveQuota(userId);

    const latestPrompt =
      session.turns.at(-1)?.promptText ||
      session.turns.at(-1)?.aiReply ||
      session.scenario.openingHint;

    let transcription: { transcript: string; raw: Prisma.InputJsonValue };
    try {
      transcription = await this.transcribeAudio(file);
    } catch (error) {
      await this.releaseQuotaReservation(userId);
      throw error;
    }

    if (!transcription.transcript) {
      await this.releaseQuotaReservation(userId);
      throw new BadRequestException(
        'Không nhận diện được lời nói. Hãy thử ghi âm lại rõ hơn.',
      );
    }

    const history = session.turns
      .filter((turn) => turn.aiReply || turn.transcript)
      .flatMap((turn) => {
        const items: Array<{ role: 'assistant' | 'user'; content: string }> = [];
        if (turn.aiReply) {
          items.push({ role: 'assistant', content: turn.aiReply });
        }
        if (turn.transcript) {
          items.push({ role: 'user', content: turn.transcript });
        }
        return items;
      });

    let ai;
    try {
      ai = await this.generateAiReply({
        scenarioTitle: session.scenario.title,
        learnerRole: session.scenario.learnerRole,
        aiRole: session.scenario.aiRole,
        objective: session.scenario.objective,
        openingHint: session.scenario.openingHint,
        level: session.level,
        history,
        learnerTranscript: transcription.transcript,
        isOpening: false,
      });
    } catch (error) {
      await this.releaseQuotaReservation(userId);
      throw error;
    }

    const turnIndex = session.turnCount + 1;
    const [turn] = await this.prisma.$transaction([
      this.prisma.speakingTurn.create({
        data: {
          sessionId: session.id,
          turnIndex,
          promptText: latestPrompt,
          transcript: transcription.transcript,
          suggestion: ai.suggestion,
          feedback: ai.feedback,
          aiReply: ai.aiReply,
          durationMs: durationMs ?? null,
          processingRaw: transcription.raw,
        },
      }),
      this.prisma.speakingSession.update({
        where: { id: session.id },
        data: { turnCount: turnIndex },
      }),
    ]);

    return {
      turn: this.mapTurn(turn),
      quota: await this.getQuota(userId),
    };
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.prisma.speakingSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        scenario: true,
        turns: { orderBy: { turnIndex: 'asc' } },
      },
    });
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nói');
    }

    const updated =
      session.status === SpeakingSessionStatus.COMPLETED
        ? session
        : await this.prisma.speakingSession.update({
            where: { id: session.id },
            data: {
              status: SpeakingSessionStatus.COMPLETED,
              completedAt: new Date(),
            },
            include: {
              scenario: true,
              turns: { orderBy: { turnIndex: 'asc' } },
            },
          });

    const scoredTurns = updated.turns.filter(
      (turn) => turn.overall != null || turn.transcript,
    );
    const avg = (picker: (turn: (typeof scoredTurns)[number]) => number | null) => {
      const values = scoredTurns
        .map(picker)
        .filter((value): value is number => typeof value === 'number');
      if (!values.length) return null;
      return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    };

    return {
      session: this.mapSession(updated, updated.scenario),
      turns: updated.turns.map((turn) => this.mapTurn(turn)),
      summary: {
        turnsSpoken: scoredTurns.length,
        averageOverall: avg((turn) => turn.overall),
        averagePronunciation: avg((turn) => turn.pronunciation),
        averageFluency: avg((turn) => turn.fluency),
        averageGrammar: avg((turn) => turn.grammar),
        averageVocabulary: avg((turn) => turn.vocabulary),
        averageCoherence: avg((turn) => turn.coherence),
      },
      quota: await this.getQuota(userId),
    };
  }

  private async ensureCatalog() {
    for (const scenario of SPEAKING_SCENARIOS) {
      await this.prisma.speakingScenario.upsert({
        where: { slug: scenario.slug },
        create: { ...scenario },
        update: {
          title: scenario.title,
          description: scenario.description,
          icon: scenario.icon,
          color: scenario.color,
          learnerRole: scenario.learnerRole,
          aiRole: scenario.aiRole,
          objective: scenario.objective,
          minLevel: scenario.minLevel,
          maxLevel: scenario.maxLevel,
          openingHint: scenario.openingHint,
          sortOrder: scenario.sortOrder,
          isVisible: true,
        },
      });
    }
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

  private usageDate() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private nextResetAt() {
    const date = this.usageDate();
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  private async getTodayUsage(userId: string) {
    const usage = await this.prisma.speakingDailyUsage.findUnique({
      where: {
        userId_usageDate: {
          userId,
          usageDate: this.usageDate(),
        },
      },
      select: { turnCount: true },
    });
    return usage?.turnCount ?? 0;
  }

  private async assertAndReserveQuota(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { isPremium: true, premiumExpiresAt: true },
    });
    if (this.resolvePremium(user)) return;

    const usageDate = this.usageDate();
    const reserved = await this.prisma.$transaction(async (tx) => {
      await tx.speakingDailyUsage.upsert({
        where: { userId_usageDate: { userId, usageDate } },
        create: { userId, usageDate, turnCount: 0 },
        update: {},
      });

      const updated = await tx.$queryRaw<Array<{ turn_count: number }>>`
        UPDATE speaking_daily_usage
        SET turn_count = turn_count + 1, updated_at = NOW()
        WHERE user_id = ${userId}
          AND usage_date = ${usageDate}
          AND turn_count < ${FREE_SPEAKING_TURNS_PER_DAY}
        RETURNING turn_count
      `;

      return updated[0] ?? null;
    });

    if (!reserved) {
      throw new ForbiddenException({
        statusCode: 403,
        message:
          'Bạn đã hết 3 lượt luyện nói miễn phí hôm nay. Nâng cấp Premium để tiếp tục.',
        code: 'SPEAKING_QUOTA_EXCEEDED',
      });
    }
  }

  private async releaseQuotaReservation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, premiumExpiresAt: true },
    });
    if (!user || this.resolvePremium(user)) return;

    const usageDate = this.usageDate();
    await this.prisma.$executeRaw`
      UPDATE speaking_daily_usage
      SET turn_count = GREATEST(turn_count - 1, 0), updated_at = NOW()
      WHERE user_id = ${userId} AND usage_date = ${usageDate}
    `;
  }

  private async transcribeAudio(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }) {
    this.ensureOpenAi();
    const audioFile = await toFile(
      file.buffer,
      file.originalname || 'speaking.webm',
      { type: file.mimetype || 'audio/webm' },
    );
    const transcription = await this.openai!.audio.transcriptions.create({
      file: audioFile,
      model:
        this.config.get<string>('SPEAKING_TRANSCRIPTION_MODEL')?.trim() ||
        'gpt-4o-mini-transcribe',
      language: 'en',
    });

    return {
      transcript: transcription.text.trim(),
      raw: {
        provider: 'openai',
        model:
          this.config.get<string>('SPEAKING_TRANSCRIPTION_MODEL')?.trim() ||
          'gpt-4o-mini-transcribe',
      } as Prisma.InputJsonValue,
    };
  }

  private ensureOpenAi() {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY chưa được cấu hình trên server',
      );
    }
  }

  async translateToVietnamese(text: string) {
    this.ensureOpenAi();
    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content:
              'Translate the English text into natural Vietnamese. Return only the translation, no explanation or quotation marks.',
          },
          { role: 'user', content: text.trim() },
        ],
      });
      const translation = response.choices[0]?.message?.content?.trim();
      if (!translation) {
        throw new ServiceUnavailableException('AI không trả về bản dịch');
      }
      return { translation };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('OpenAI speaking translation failed', error);
      throw new ServiceUnavailableException(
        'Không thể dịch lúc này. Vui lòng thử lại sau.',
      );
    }
  }

  private async generateAiReply(input: {
    scenarioTitle: string;
    learnerRole: string;
    aiRole: string;
    objective: string;
    openingHint: string;
    level: CefrLevel;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    learnerTranscript: string | null;
    isOpening: boolean;
    scores?: {
      pronunciation: number | null;
      fluency: number | null;
      grammar: number | null;
      vocabulary: number | null;
      coherence: number | null;
      overall: number | null;
    };
  }) {
    this.ensureOpenAi();

    const system = [
      'You are an English speaking practice partner for Vietnamese learners.',
      `Stay in character as: ${input.aiRole}.`,
      `The learner is role-playing as: ${input.learnerRole}.`,
      `Scenario: ${input.scenarioTitle}.`,
      `Objective: ${input.objective}.`,
      `Learner CEFR level: ${input.level}. ${LEVEL_GUIDANCE[input.level]}`,
      'Return ONLY valid JSON with keys: aiReply, feedback, suggestion.',
      'aiReply: your next spoken line in English (1-3 short sentences), stay in role, ask one clear follow-up when natural.',
      'feedback: short Vietnamese feedback about the learner utterance and scores if provided.',
      'suggestion: one better English sentence the learner could say next time.',
      'No markdown. No extra keys.',
    ].join('\n');

    const userContent = input.isOpening
      ? `Start the role-play. Opening hint: ${input.openingHint}`
      : [
          `Learner said: ${input.learnerTranscript}`,
          input.scores
            ? `Speaking scores (0-100): ${JSON.stringify(input.scores)}`
            : '',
          'Respond in character and give concise coaching feedback.',
        ]
          .filter(Boolean)
          .join('\n');

    let response;
    try {
      response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 250,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          ...input.history.slice(-12),
          { role: 'user', content: userContent },
        ],
      });
    } catch (error) {
      this.logger.error('OpenAI speaking reply failed', error);
      const status =
        typeof error === 'object' &&
        error &&
        'status' in error &&
        typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : undefined;

      if (status === 401 || status === 403) {
        throw new ServiceUnavailableException(
          'OPENAI_API_KEY không hợp lệ hoặc đã hết hạn. Hãy cập nhật key trong .env rồi khởi động lại server.',
        );
      }

      throw new ServiceUnavailableException(
        'Không thể kết nối AI lúc này. Vui lòng thử lại sau.',
      );
    }

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new ServiceUnavailableException('AI không trả về nội dung');
    }

    let parsed: {
      aiReply?: string;
      feedback?: string;
      suggestion?: string;
    };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      throw new ServiceUnavailableException('AI trả về dữ liệu không hợp lệ');
    }

    const aiReply = parsed.aiReply?.trim();
    if (!aiReply) {
      throw new ServiceUnavailableException('AI không tạo được câu trả lời');
    }

    return {
      aiReply,
      feedback: parsed.feedback?.trim() || null,
      suggestion: parsed.suggestion?.trim() || null,
    };
  }

  private mapSession(
    session: {
      id: string;
      level: CefrLevel;
      dialect: SpeakingDialect;
      status: SpeakingSessionStatus;
      turnCount: number;
      createdAt: Date;
      completedAt: Date | null;
    },
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
    },
  ) {
    return {
      id: session.id,
      level: session.level,
      dialect: session.dialect,
      status: session.status,
      turnCount: session.turnCount,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      scenario: {
        id: scenario.id,
        slug: scenario.slug,
        title: scenario.title,
        description: scenario.description,
        icon: scenario.icon,
        color: scenario.color,
        learnerRole: scenario.learnerRole,
        aiRole: scenario.aiRole,
        objective: scenario.objective,
      },
    };
  }

  private mapTurn(turn: {
    id: string;
    turnIndex: number;
    promptText: string;
    transcript: string | null;
    suggestion: string | null;
    feedback: string | null;
    aiReply: string | null;
    pronunciation: number | null;
    fluency: number | null;
    grammar: number | null;
    vocabulary: number | null;
    coherence: number | null;
    overall: number | null;
    relevance: string | null;
    cefrOverall: string | null;
    durationMs: number | null;
    createdAt: Date;
  }) {
    return {
      id: turn.id,
      turnIndex: turn.turnIndex,
      promptText: turn.promptText,
      transcript: turn.transcript,
      suggestion: turn.suggestion,
      feedback: turn.feedback,
      aiReply: turn.aiReply,
      scores: {
        pronunciation: turn.pronunciation,
        fluency: turn.fluency,
        grammar: turn.grammar,
        vocabulary: turn.vocabulary,
        coherence: turn.coherence,
        overall: turn.overall,
        relevance: turn.relevance,
        cefrOverall: turn.cefrOverall,
      },
      durationMs: turn.durationMs,
      createdAt: turn.createdAt,
    };
  }
}
