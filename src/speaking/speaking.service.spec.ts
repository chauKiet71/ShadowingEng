import { ForbiddenException } from '@nestjs/common';
import { CefrLevel, SpeakingDialect } from '@prisma/client';
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
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          speakingDailyUsage: {
            upsert: jest.fn().mockResolvedValue({ turnCount: 0 }),
          },
          $queryRaw: jest
            .fn()
            .mockResolvedValue(
              overrides?.queryRawResult !== undefined
                ? overrides.queryRawResult
                : [{ turn_count: 1 }],
            ),
        };
        return fn(tx);
      }),
      $executeRaw: jest.fn(),
      speakingScenario: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      speakingSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      speakingTurn: {
        create: jest.fn(),
      },
    };

    const config = {
      get: jest.fn((key: string) =>
        key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
      ),
    };

    const service = new SpeakingService(
      prisma as never,
      config as never,
    );

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
});
