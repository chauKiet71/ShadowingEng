import { ForbiddenException } from '@nestjs/common';
import {
  CefrLevel,
  SpeakingDialect,
  SpeakingSessionStatus,
} from '@prisma/client';
import {
  FREE_SPEAKING_TURNS_PER_DAY,
  SpeakingService,
} from './speaking.service';

describe('SpeakingService quota', () => {
  const userId = '11111111-1111-1111-1111-111111111111';

  function createService(overrides?: {
    isPremium?: boolean;
    queryRawResult?: Array<{ turn_count: number }>;
  }) {
    const speakingSession = {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    };
    const speakingTurn = {
      create: jest.fn(),
      update: jest.fn(),
    };
    const prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          isPremium: overrides?.isPremium ?? false,
          premiumExpiresAt: null,
        }),
        findUnique: jest.fn().mockResolvedValue({
          isPremium: overrides?.isPremium ?? false,
          premiumExpiresAt: null,
        }),
      },
      speakingDailyUsage: {
        findUnique: jest.fn().mockResolvedValue({
          turnCount: overrides?.queryRawResult?.[0]?.turn_count ?? 0,
        }),
        upsert: jest.fn().mockResolvedValue({ turnCount: 0 }),
      },
      $transaction: jest.fn(async (operation: unknown) => {
        if (Array.isArray(operation)) return Promise.all(operation);

        const tx = {
          speakingDailyUsage: {
            upsert: jest.fn().mockResolvedValue({ turnCount: 0 }),
          },
          speakingSession,
          speakingTurn,
          $queryRaw: jest
            .fn()
            .mockResolvedValue(
              overrides?.queryRawResult !== undefined
                ? overrides.queryRawResult
                : [{ turn_count: 1 }],
            ),
        };
        return (operation as (tx: typeof tx) => Promise<unknown>)(tx);
      }),
      $executeRaw: jest.fn(),
      speakingScenario: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      speakingSession,
      speakingTurn,
    };

    const config = {
      get: jest.fn((key: string) =>
        key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
      ),
    };

    const service = new SpeakingService(prisma as never, config as never);

    return { service, prisma };
  }

  it(`allows reserving quota under ${FREE_SPEAKING_TURNS_PER_DAY}`, async () => {
    const { service } = createService({
      queryRawResult: [{ turn_count: 1 }],
    });

    await expect(
      (
        service as unknown as {
          assertAndReserveQuota: (id: string) => Promise<void>;
        }
      ).assertAndReserveQuota(userId),
    ).resolves.toBeUndefined();
  });

  it('blocks free users when daily quota is exhausted', async () => {
    const { service } = createService({
      queryRawResult: [],
    });

    await expect(
      (
        service as unknown as {
          assertAndReserveQuota: (id: string) => Promise<void>;
        }
      ).assertAndReserveQuota(userId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('skips quota for premium users', async () => {
    const { service, prisma } = createService({ isPremium: true });

    await (
      service as unknown as {
        assertAndReserveQuota: (id: string) => Promise<void>;
      }
    ).assertAndReserveQuota(userId);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps dialect values for session creation DTO compatibility', () => {
    expect(SpeakingDialect.EN_US).toBe('EN_US');
    expect(CefrLevel.A1).toBe('A1');
  });

  it('calculates and normalizes the persisted average score for a learner turn', () => {
    const { service } = createService();

    const scores = (
      service as unknown as {
        buildTurnScores: (
          assessment: {
            grammar: number;
            vocabulary: number;
            coherence: number;
            relevance: number;
            cefrOverall: CefrLevel;
          },
          transcript: string,
          durationMs: number,
          level: CefrLevel,
        ) => {
          pronunciation: number | null;
          fluency: number | null;
          overall: number;
          relevance: string;
        };
      }
    ).buildTurnScores(
      {
        grammar: 80,
        vocabulary: 90,
        coherence: 70,
        relevance: 100,
        cefrOverall: CefrLevel.A2,
      },
      'I would like a table for two please',
      4_000,
      CefrLevel.A2,
    );

    expect(scores).toEqual(
      expect.objectContaining({
        pronunciation: null,
        fluency: 88,
        overall: 86,
        relevance: '100/100',
      }),
    );
  });

  it('uses iFLYTEK pronunciation and fluency in the persisted average score', () => {
    const { service } = createService();

    const scores = (
      service as unknown as {
        buildTurnScores: (
          assessment: {
            grammar: number;
            vocabulary: number;
            coherence: number;
            relevance: number;
            cefrOverall: CefrLevel;
          },
          transcript: string,
          durationMs: number,
          level: CefrLevel,
          pronunciationAssessment: {
            pronunciation: number;
            fluency: number;
            standard: number;
            tone: null;
            emotion: null;
          },
        ) => {
          pronunciation: number | null;
          fluency: number | null;
          overall: number;
        };
      }
    ).buildTurnScores(
      {
        grammar: 80,
        vocabulary: 90,
        coherence: 70,
        relevance: 100,
        cefrOverall: CefrLevel.A2,
      },
      'I would like a table for two please',
      4_000,
      CefrLevel.A2,
      {
        pronunciation: 92,
        fluency: 76,
        standard: 84,
        tone: null,
        emotion: null,
      },
    );

    expect(scores).toEqual(
      expect.objectContaining({
        pronunciation: 92,
        fluency: 76,
        overall: 85,
      }),
    );
  });

  it('scores and persists a learner turn independently from reply generation', async () => {
    const { service, prisma } = createService();
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              grammar: 80,
              vocabulary: 90,
              coherence: 70,
              relevance: 100,
              cefrOverall: CefrLevel.A2,
            }),
          },
        },
      ],
    });
    (
      service as unknown as {
        openai: { chat: { completions: { create: typeof create } } };
      }
    ).openai = { chat: { completions: { create } } };

    await (
      service as unknown as {
        scoreAndPersistTurn: (input: {
          turnId: string;
          scenarioTitle: string;
          objective: string;
          latestPrompt: string;
          transcript: string;
          durationMs: number;
          level: CefrLevel;
          processingRaw: object;
        }) => Promise<void>;
      }
    ).scoreAndPersistTurn({
      turnId: 'turn-1',
      scenarioTitle: 'Nhà hàng',
      objective: 'Gọi món',
      latestPrompt: 'What would you like to order?',
      transcript: 'I would like a table for two please',
      durationMs: 4_000,
      level: CefrLevel.A2,
      processingRaw: { transcription: { provider: 'openai' } },
    });

    const [updateInput] = prisma.speakingTurn.update.mock
      .calls[0] as unknown as [
      {
        where: { id: string };
        data: {
          grammar: number;
          vocabulary: number;
          coherence: number;
          fluency: number;
          overall: number;
          relevance: string;
          cefrOverall: CefrLevel;
          processingRaw: { assessment: { grammar: number } };
        };
      },
    ];

    expect(updateInput.where).toEqual({ id: 'turn-1' });
    expect(updateInput.data.grammar).toBe(80);
    expect(updateInput.data.vocabulary).toBe(90);
    expect(updateInput.data.coherence).toBe(70);
    expect(updateInput.data.fluency).toBe(88);
    expect(updateInput.data.overall).toBe(86);
    expect(updateInput.data.relevance).toBe('100/100');
    expect(updateInput.data.cefrOverall).toBe(CefrLevel.A2);
    expect(updateInput.data.processingRaw.assessment.grammar).toBe(80);
  });

  it('persists a speaking session and its opening turn for the resolved user', async () => {
    const { service, prisma } = createService();
    const scenario = {
      id: 'scenario-1',
      slug: 'nha-hang',
      title: 'Nhà hàng',
      description: 'Gọi món và thanh toán',
      icon: 'utensils',
      color: 'blue',
      learnerRole: 'Khách hàng',
      aiRole: 'Nhân viên nhà hàng',
      objective: 'Gọi món',
      minLevel: CefrLevel.A1,
      maxLevel: CefrLevel.C1,
      openingHint: 'Chào khách hàng.',
      sortOrder: 2,
      isVisible: true,
    };
    const createdAt = new Date();
    const createdSession = {
      id: 'session-1',
      level: CefrLevel.A2,
      dialect: SpeakingDialect.EN_US,
      status: 'ACTIVE',
      turnCount: 0,
      createdAt,
      completedAt: null,
    };
    const createdTurn = {
      id: 'turn-1',
      turnIndex: 0,
      promptText: 'Welcome. Are you ready to order?',
      transcript: null,
      suggestion: 'Yes, I would like to order.',
      feedback: null,
      aiReply: 'Welcome. Are you ready to order?',
      pronunciation: null,
      fluency: null,
      grammar: null,
      vocabulary: null,
      coherence: null,
      overall: null,
      relevance: null,
      cefrOverall: null,
      durationMs: null,
      createdAt,
    };

    prisma.speakingScenario.findFirst.mockResolvedValue(scenario);
    prisma.speakingSession.create.mockResolvedValue(createdSession);
    prisma.speakingTurn.create.mockResolvedValue(createdTurn);

    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              aiReply: createdTurn.aiReply,
              feedback: null,
              suggestion: createdTurn.suggestion,
            }),
          },
        },
      ],
    });
    (
      service as unknown as {
        openai: { chat: { completions: { create: typeof create } } };
      }
    ).openai = { chat: { completions: { create } } };

    const result = await service.createSession(
      userId,
      scenario.id,
      CefrLevel.A2,
      SpeakingDialect.EN_US,
    );

    expect(prisma.speakingSession.create).toHaveBeenCalledWith({
      data: {
        userId,
        scenarioId: scenario.id,
        level: CefrLevel.A2,
        dialect: SpeakingDialect.EN_US,
      },
    });
    const [createTurnInput] = prisma.speakingTurn.create.mock
      .calls[0] as unknown as [
      { data: { sessionId: string; turnIndex: number; aiReply: string } },
    ];
    expect(createTurnInput.data.sessionId).toBe(createdSession.id);
    expect(createTurnInput.data.turnIndex).toBe(0);
    expect(createTurnInput.data.aiReply).toBe(createdTurn.aiReply);
    expect(result.session.id).toBe(createdSession.id);
    expect(result.session.scenario.id).toBe(scenario.id);
  });

  it('summarizes speaking history from learner turns', async () => {
    const { service, prisma } = createService();
    const today = new Date();

    prisma.speakingSession.findMany.mockResolvedValue([
      {
        id: 'session-1',
        level: CefrLevel.A2,
        dialect: SpeakingDialect.EN_US,
        status: 'COMPLETED',
        createdAt: today,
        completedAt: today,
        scenario: {
          id: 'scenario-1',
          slug: 'nha-hang',
          title: 'Nhà hàng',
          description: 'Gọi món và thanh toán',
          icon: 'restaurant',
          color: '#8b5cf6',
          learnerRole: 'Khách hàng',
          aiRole: 'Nhân viên nhà hàng',
          objective: 'Gọi món',
          minLevel: CefrLevel.A1,
          maxLevel: CefrLevel.C1,
          sortOrder: 2,
        },
        turns: [
          { transcript: null, durationMs: null, overall: null },
          { transcript: 'A table for two.', durationMs: 12_000, overall: 84 },
          { transcript: 'The bill, please.', durationMs: 8_000, overall: 90 },
        ],
      },
    ]);

    const result = await service.getHistory(userId);

    expect(prisma.speakingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, turnCount: { gt: 0 } },
      }),
    );
    expect(prisma.speakingScenario.upsert).toHaveBeenCalled();
    expect(result.stats).toEqual({
      totalSessions: 1,
      averageScore: 87,
      streakDays: 1,
      practicedTopics: 1,
    });
    expect(result.items[0]?.id).toBe('session-1');
    expect(result.items[0]?.durationMs).toBe(20_000);
    expect(result.items[0]?.turnsSpoken).toBe(2);
    expect(result.items[0]?.averageOverall).toBe(87);
    expect(result.items[0]?.scenario.slug).toBe('nha-hang');
    expect(result.items[0]?.scenario.minLevel).toBe(CefrLevel.A1);
    expect(result.items[0]?.scenario.maxLevel).toBe(CefrLevel.C1);
  });

  it('completes a session and returns the average used by the back button', async () => {
    const { service, prisma } = createService();
    const createdAt = new Date();
    const scenario = {
      id: 'scenario-1',
      slug: 'nha-hang',
      title: 'Nhà hàng',
      description: 'Gọi món',
      icon: 'utensils',
      color: 'blue',
      learnerRole: 'Khách hàng',
      aiRole: 'Nhân viên',
      objective: 'Gọi món',
    };
    const turns = [
      {
        id: 'opening',
        turnIndex: 0,
        promptText: 'Are you ready?',
        transcript: null,
        suggestion: null,
        feedback: null,
        aiReply: 'Are you ready?',
        pronunciation: null,
        fluency: null,
        grammar: null,
        vocabulary: null,
        coherence: null,
        overall: null,
        relevance: null,
        cefrOverall: null,
        durationMs: null,
        createdAt,
      },
      {
        id: 'turn-1',
        turnIndex: 1,
        promptText: 'Are you ready?',
        transcript: 'Yes, I am ready.',
        suggestion: 'I would like to order.',
        feedback: 'Tốt.',
        aiReply: 'What would you like?',
        pronunciation: null,
        fluency: 82,
        grammar: 84,
        vocabulary: 80,
        coherence: 86,
        overall: 84,
        relevance: '88/100',
        cefrOverall: CefrLevel.A2,
        durationMs: 3_000,
        createdAt,
      },
      {
        id: 'turn-2',
        turnIndex: 2,
        promptText: 'What would you like?',
        transcript: 'I would like the chicken.',
        suggestion: 'Could I have the chicken?',
        feedback: 'Rất tốt.',
        aiReply: 'Anything else?',
        pronunciation: null,
        fluency: 88,
        grammar: 90,
        vocabulary: 86,
        coherence: 91,
        overall: 90,
        relevance: '92/100',
        cefrOverall: CefrLevel.A2,
        durationMs: 4_000,
        createdAt,
      },
    ];
    const activeSession = {
      id: 'session-1',
      userId,
      scenarioId: scenario.id,
      level: CefrLevel.A2,
      dialect: SpeakingDialect.EN_US,
      status: SpeakingSessionStatus.ACTIVE,
      turnCount: 2,
      completedAt: null,
      createdAt,
      updatedAt: createdAt,
      scenario,
      turns,
    };
    const completedSession = {
      ...activeSession,
      status: SpeakingSessionStatus.COMPLETED,
      completedAt: new Date(),
    };

    prisma.speakingSession.findFirst.mockResolvedValue(activeSession);
    prisma.speakingSession.update.mockResolvedValue(completedSession);

    const result = await service.completeSession(userId, activeSession.id);

    const [updateSessionInput] = prisma.speakingSession.update.mock
      .calls[0] as unknown as [
      {
        where: { id: string };
        data: { status: SpeakingSessionStatus; completedAt: Date };
      },
    ];
    expect(updateSessionInput.where).toEqual({ id: activeSession.id });
    expect(updateSessionInput.data.status).toBe(
      SpeakingSessionStatus.COMPLETED,
    );
    expect(updateSessionInput.data.completedAt).toBeInstanceOf(Date);
    expect(result.summary).toEqual(
      expect.objectContaining({
        turnsSpoken: 2,
        averageOverall: 87,
        averageFluency: 85,
        averageGrammar: 87,
      }),
    );
  });

  it('generates a next-turn speaking suggestion together with the AI reply', async () => {
    const { service } = createService();
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              aiReply: 'Where would you like to go?',
              feedback: null,
              suggestion: 'My name is [Your Name].',
            }),
          },
        },
      ],
    });
    (
      service as unknown as {
        openai: { chat: { completions: { create: typeof create } } };
      }
    ).openai = { chat: { completions: { create } } };

    const result = await (
      service as unknown as {
        generateAiReply: (input: {
          scenarioTitle: string;
          learnerRole: string;
          aiRole: string;
          objective: string;
          openingHint: string;
          level: CefrLevel;
          history: Array<{ role: 'user' | 'assistant'; content: string }>;
          learnerTranscript: string | null;
          isOpening: boolean;
        }) => Promise<{ suggestion: string }>;
      }
    ).generateAiReply({
      scenarioTitle: 'Hỏi đường',
      learnerRole: 'Du khách',
      aiRole: 'Người bản xứ',
      objective: 'Tìm đường đến trung tâm thành phố',
      openingHint: 'Hỏi người học cần đi đâu.',
      level: CefrLevel.A2,
      history: [],
      learnerTranscript: null,
      isOpening: true,
    });

    expect(result.suggestion).toBe('My name is Nam.');
    const [request] = create.mock.calls[0] as unknown as [
      {
        response_format: { type: string };
        messages: Array<{ content: string }>;
      },
    ];
    expect(request.response_format).toEqual({ type: 'json_object' });
    expect(request.messages[0]?.content).toContain('the learner can say NEXT');
  });
});
