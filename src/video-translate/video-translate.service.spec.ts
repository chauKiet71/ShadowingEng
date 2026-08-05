import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { VideoTranslateService } from './video-translate.service';

type TimedSegment = {
  start: number;
  end: number;
  en: string;
  words?: Array<{ text: string; start: number; end: number }>;
};

type RawTimedWord = { start: number; end: number; en: string };

describe('VideoTranslateService transcript segmentation', () => {
  let service: VideoTranslateService;

  beforeEach(() => {
    service = new VideoTranslateService(
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );
  });

  function finalize(
    segments: TimedSegment[],
    durationSec = 20,
    words: RawTimedWord[] = [],
  ) {
    return (
      service as unknown as {
        finalizeSegments: (
          input: TimedSegment[],
          duration: number,
          wordTimings?: RawTimedWord[],
        ) => TimedSegment[];
      }
    ).finalizeSegments(segments, durationSec, words);
  }

  function buildWhisperTimedSegments(input: {
    text?: string;
    words?: Array<{ start?: number; end?: number; word?: string }>;
    segments?: Array<{ start?: number; end?: number; text?: string }>;
  }) {
    return (
      service as unknown as {
        buildWhisperTimedSegments: (value: typeof input) => TimedSegment[];
      }
    ).buildWhisperTimedSegments(input);
  }

  function buildCaptionWordTimings(segments: TimedSegment[], durationSec = 60) {
    return (
      service as unknown as {
        buildCaptionWordTimings: (
          input: TimedSegment[],
          duration: number,
        ) => RawTimedWord[];
      }
    ).buildCaptionWordTimings(segments, durationSec);
  }

  it('cuts at an exact 0.5 second pause', () => {
    const result = finalize([
      { start: 0, end: 1, en: 'The first thought' },
      { start: 1.5, end: 2.4, en: 'continues over here.' },
    ]);

    expect(result.map((segment) => segment.en)).toEqual([
      'The first thought',
      'continues over here.',
    ]);
    expect(result[0].end).toBe(1);
  });

  it('keeps unfinished fragments together below the 0.5 second threshold', () => {
    const result = finalize([
      { start: 0, end: 1, en: 'Let me' },
      { start: 1.49, end: 2.2, en: 'check this.' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].en).toBe('Let me check this.');
  });

  it('keeps a short completed sentence separate', () => {
    const result = finalize([
      { start: 0, end: 0.4, en: 'Yes.' },
      { start: 0.9, end: 1.8, en: 'I understand now.' },
    ]);

    expect(result.map((segment) => segment.en)).toEqual([
      'Yes.',
      'I understand now.',
    ]);
  });

  it('uses a measured pause as a boundary even without punctuation', () => {
    const result = finalize([
      { start: 0, end: 1.2, en: 'First spoken phrase' },
      { start: 1.7, end: 2.8, en: 'Second spoken phrase' },
    ]);

    expect(result).toHaveLength(2);
  });

  it('splits multiple complete sentences from the same caption cue', () => {
    const result = finalize([{ start: 0, end: 2, en: 'Yes. I agree.' }]);

    expect(result.map((segment) => segment.en)).toEqual(['Yes.', 'I agree.']);
  });

  it('keeps a complete long sentence instead of cutting at an arbitrary word limit', () => {
    const result = finalize([
      { start: 0, end: 2, en: 'This is an old historical road,' },
      {
        start: 2.1,
        end: 4.1,
        en: 'which is actually now one of the most modern',
      },
      {
        start: 4.15,
        end: 6.4,
        en: 'pedestrian streets in all of China and Guangzhou.',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].en).toBe(
      'This is an old historical road, which is actually now one of the most modern pedestrian streets in all of China and Guangzhou.',
    );
  });

  it('uses punctuated Whisper segments instead of bare word tokens', () => {
    const result = buildWhisperTimedSegments({
      words: [
        { start: 0, end: 0.2, word: 'Now' },
        { start: 0.2, end: 0.4, word: 'here' },
        { start: 0.4, end: 0.6, word: 'we' },
        { start: 0.6, end: 0.8, word: 'are' },
      ],
      segments: [{ start: 0, end: 0.8, text: ' Now here we are.' }],
    });

    expect(result).toEqual([{ start: 0, end: 0.8, en: 'Now here we are.' }]);
  });

  it('still splits a Whisper segment at an internal 0.5 second pause', () => {
    const result = buildWhisperTimedSegments({
      words: [
        { start: 0, end: 0.4, word: 'First' },
        { start: 0.9, end: 1.3, word: 'Second' },
      ],
      segments: [{ start: 0, end: 1.3, text: 'First Second.' }],
    });

    expect(result).toEqual([
      { start: 0, end: 0.4, en: 'First' },
      { start: 0.9, end: 1.3, en: 'Second.' },
    ]);
  });

  it('maps Whisper word timestamps onto punctuated sentence words', () => {
    const result = finalize(
      [{ start: 0, end: 2.4, en: 'Try to arrive after 3 p.m.' }],
      3,
      [
        { start: 0, end: 0.3, en: 'Try' },
        { start: 0.3, end: 0.5, en: 'to' },
        { start: 0.5, end: 1, en: 'arrive' },
        { start: 1, end: 1.4, en: 'after' },
        { start: 1.4, end: 1.7, en: '3' },
        { start: 1.7, end: 1.8, en: 'p' },
        { start: 1.8, end: 2, en: 'm' },
      ],
    );

    expect(result[0].words).toEqual([
      { text: 'Try', start: 0, end: 0.3 },
      { text: 'to', start: 0.3, end: 0.5 },
      { text: 'arrive', start: 0.5, end: 1 },
      { text: 'after', start: 1, end: 1.4 },
      { text: '3', start: 1.4, end: 1.7 },
      { text: 'p.m.', start: 1.7, end: 2 },
    ]);
  });

  it('collapses a rolling caption extension without duplicating words', () => {
    const result = finalize([
      { start: 0, end: 1, en: 'Let me' },
      { start: 0.7, end: 1.6, en: 'Let me check.' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].en).toBe('Let me check.');
  });

  it('deduplicates rolling caption words while preserving cue transitions', () => {
    const words = buildCaptionWordTimings([
      { start: 0, end: 1, en: 'Let me' },
      { start: 0.7, end: 1.6, en: 'Let me check.' },
    ]);

    expect(words.map((word) => word.en)).toEqual(['Let', 'me', 'check.']);
    expect(words[2].start).toBeGreaterThanOrEqual(1.1);
  });

  it('keeps word focus aligned to the original caption cue boundaries', () => {
    const captions = [
      {
        start: 44.239,
        end: 47.28,
        en: "one, I wouldn't be letting you know",
      },
      {
        start: 45.68,
        end: 48.64,
        en: 'about it. We just think that was anomaly',
      },
      {
        start: 47.28,
        end: 50.16,
        en: 'and try and work it out. But, this has',
      },
      {
        start: 48.64,
        end: 51.44,
        en: 'happened in a number of accounts enough',
      },
    ];
    const words = buildCaptionWordTimings(captions);
    const result = finalize(captions, 60, words);
    const sentence = result.find((segment) =>
      segment.en.includes('We just think that was anomaly'),
    );
    const work = sentence?.words?.find((word) => word.text === 'work');

    expect(sentence?.start).toBeLessThan(46.2);
    expect(work?.start).toBeGreaterThan(47.65);
    expect(work?.start).toBeLessThan(47.8);
  });

  it('collapses a completed sentence repeated by an overlapping rolling cue', () => {
    const result = finalize([
      { start: 0, end: 1, en: 'Hello everyone.' },
      {
        start: 0.8,
        end: 2.4,
        en: 'Hello everyone. Welcome back.',
      },
    ]);

    expect(result.map((segment) => segment.en)).toEqual([
      'Hello everyone.',
      'Welcome back.',
    ]);
  });

  it('does not treat a one-letter word as a substring match', () => {
    const result = finalize([
      { start: 0, end: 0.4, en: 'I.' },
      { start: 0.45, end: 1.4, en: 'This is fine.' },
    ]);

    expect(result.map((segment) => segment.en)).toEqual([
      'I.',
      'This is fine.',
    ]);
  });
});

describe('VideoTranslateService duration metadata', () => {
  it('parses the exact duration from a YouTube watch payload', () => {
    const service = new VideoTranslateService(
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    ) as unknown as {
      parseYoutubeWatchDuration: (content: string) => number | null;
    };

    expect(
      service.parseYoutubeWatchDuration(
        '<script>{"videoDetails":{"lengthSeconds":"21"}}</script>',
      ),
    ).toBe(21);
    expect(service.parseYoutubeWatchDuration('<html></html>')).toBeNull();
  });

  it('repairs a legacy quota-duration value using YouTube metadata', async () => {
    const update = jest.fn().mockResolvedValue({});
    const service = new VideoTranslateService(
      { videoTranslateJob: { update } } as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    ) as unknown as {
      repairLegacyYoutubeDuration: (job: {
        id: string;
        youtubeVideoId: string;
        youtubeUrl: string;
        durationSec: number;
        status: string;
        segmentsJson: Array<{
          start: number;
          end: number;
          en: string;
          vi: string;
        }>;
      }) => Promise<{ durationSec: number }>;
    };
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('{"lengthSeconds":"21"}'),
    } as unknown as Response);

    try {
      const result = await service.repairLegacyYoutubeDuration({
        id: 'job-1',
        youtubeVideoId: 'KSp8WQmj6DM',
        youtubeUrl: 'https://www.youtube.com/watch?v=KSp8WQmj6DM',
        durationSec: 600,
        status: 'READY',
        segmentsJson: [{ start: 0, end: 21, en: 'Example.', vi: 'Ví dụ.' }],
      });

      expect(result.durationSec).toBe(21);
      expect(update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { durationSec: 21 },
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe('VideoTranslateService processing concurrency', () => {
  let service: VideoTranslateService;

  beforeEach(() => {
    service = new VideoTranslateService(
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );
  });

  it('limits parallel work and preserves result order', async () => {
    const runWithConcurrency = (
      service as unknown as {
        runWithConcurrency: <T, R>(
          items: T[],
          concurrency: number,
          worker: (item: T, index: number) => Promise<R>,
        ) => Promise<R[]>;
      }
    ).runWithConcurrency.bind(service);
    let active = 0;
    let maxActive = 0;

    const result = await runWithConcurrency(
      [30, 5, 20, 10],
      2,
      async (delay, index) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, delay));
        active -= 1;
        return `${index}:${delay}`;
      },
    );

    expect(maxActive).toBe(2);
    expect(result).toEqual(['0:30', '1:5', '2:20', '3:10']);
  });

  it('translates multiple batches concurrently without changing sentence order', async () => {
    let active = 0;
    let maxActive = 0;
    const create = jest.fn(
      async (request: { messages: Array<{ content: string }> }) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        const payload = JSON.parse(request.messages[1].content) as {
          items: Array<{ i: number; en: string }>;
        };
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: payload.items.map((item) => ({
                    i: item.i,
                    vi: `VI ${item.en}`,
                  })),
                }),
              },
            },
          ],
        };
      },
    );
    (
      service as unknown as {
        openai: {
          chat: { completions: { create: typeof create } };
        };
      }
    ).openai = { chat: { completions: { create } } };
    const translateSegments = (
      service as unknown as {
        translateSegments: (
          segments: TimedSegment[],
        ) => Promise<Array<TimedSegment & { vi: string }>>;
      }
    ).translateSegments.bind(service);
    const segments = Array.from({ length: 50 }, (_, index) => ({
      start: index,
      end: index + 0.8,
      en: `Sentence ${index}`,
    }));

    const result = await translateSegments(segments);

    expect(create).toHaveBeenCalledTimes(3);
    expect(maxActive).toBe(3);
    expect(result.map((segment) => segment.vi)).toEqual(
      segments.map((segment) => `VI ${segment.en}`),
    );
  });

  it('retries only missing batch translations and keeps valid results', async () => {
    const create = jest.fn(
      (request: { messages: Array<{ content: string }> }) => {
        const content = request.messages[1].content;
        if (content.startsWith('{')) {
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    items: [{ i: 0, vi: 'Bản dịch hợp lệ' }],
                  }),
                },
              },
            ],
          };
        }
        return {
          choices: [{ message: { content: `Fallback ${content}` } }],
        };
      },
    );
    (
      service as unknown as {
        openai: {
          chat: { completions: { create: typeof create } };
        };
      }
    ).openai = { chat: { completions: { create } } };
    const translateBatch = (
      service as unknown as {
        translateBatch: (
          segments: TimedSegment[],
        ) => Promise<Array<TimedSegment & { vi: string }>>;
      }
    ).translateBatch.bind(service);

    const result = await translateBatch([
      { start: 0, end: 1, en: 'First' },
      { start: 1, end: 2, en: 'Second' },
      { start: 2, end: 3, en: 'Third' },
    ]);

    expect(create).toHaveBeenCalledTimes(3);
    expect(result.map((segment) => segment.vi)).toEqual([
      'Bản dịch hợp lệ',
      'Fallback Second',
      'Fallback Third',
    ]);
  });
});

describe('VideoTranslateService YouTube jobs', () => {
  it('reuses a ready YouTube transcript without requiring an OpenAI key', async () => {
    const createdAt = new Date('2026-08-02T00:00:00.000Z');
    const cached = {
      id: 'cached-job',
      userId: 'another-user',
      youtubeVideoId: 'dQw4w9WgXcQ',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      originalFilename: null,
      mediaUrl: null,
      title: 'Cached video',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      durationSec: 212,
      status: 'READY',
      source: 'captions',
      errorMessage: null,
      segmentsJson: [{ start: 0, end: 1.5, en: 'Hello.', vi: 'Xin chào.' }],
      dubbedAudioUrl: null,
      pipelineVersion: 12,
      fromCache: false,
      createdAt,
      updatedAt: createdAt,
      completedAt: createdAt,
    };
    const cloned = {
      ...cached,
      id: 'cloned-job',
      userId: 'user-1',
      fromCache: true,
    };
    const prisma = {
      videoTranslateJob: {
        findFirst: jest.fn().mockResolvedValue(cached),
        create: jest.fn().mockResolvedValue(cloned),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          isPremium: false,
          premiumExpiresAt: null,
        }),
      },
      videoTranslateDailyUsage: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new VideoTranslateService(
      prisma as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );

    const result = await service.createJob(
      'user-1',
      'https://youtu.be/dQw4w9WgXcQ',
    );

    expect(result.fromCache).toBe(true);
    expect(result.job).toMatchObject({
      id: 'cloned-job',
      youtubeVideoId: 'dQw4w9WgXcQ',
      fromCache: true,
      segments: [{ start: 0, end: 1.5, en: 'Hello.', vi: 'Xin chào.' }],
    });
  });
});

describe('VideoTranslateService yt-dlp integration', () => {
  function createService(config: Record<string, string | undefined> = {}) {
    return new VideoTranslateService(
      {} as never,
      {
        get: jest.fn((key: string) => config[key]),
      } as never,
    );
  }

  it('shows the yt-dlp stderr error instead of the generated command', () => {
    const service = createService() as unknown as {
      commandErrorDetail: (error: unknown) => string;
    };
    const error = Object.assign(new Error('Command failed: yt-dlp ...'), {
      stderr: [
        'WARNING: retrying',
        'ERROR: [youtube] Video unavailable from this IP',
      ].join('\n'),
    });

    expect(service.commandErrorDetail(error)).toBe(
      'ERROR: [youtube] Video unavailable from this IP',
    );
  });

  it('builds optional Railway connection arguments', () => {
    const cookiesFile = join(process.cwd(), 'storage', 'test-yt-cookies.txt');
    mkdirSync(join(process.cwd(), 'storage'), { recursive: true });
    writeFileSync(cookiesFile, '# Netscape HTTP Cookie File\n');

    const service = createService({
      YT_DLP_PROXY: 'http://proxy.example:8080',
      YT_DLP_COOKIES_PATH: cookiesFile,
      YT_DLP_FORCE_IPV4: 'true',
      YT_DLP_EXTRACTOR_ARGS: 'youtube:player_client=android',
    }) as unknown as {
      ytDlpConnectionArgs: () => string[];
    };

    expect(service.ytDlpConnectionArgs()).toEqual([
      '--proxy',
      'http://proxy.example:8080',
      '--cookies',
      cookiesFile,
      '--force-ipv4',
      '--extractor-args',
      'youtube:player_client=android',
    ]);
  });

  it.each([
    ['"http://proxy.example:8080"', 'http://proxy.example:8080'],
    ['proxy.example:8080', 'http://proxy.example:8080'],
    [
      'http://account:secret:proxy.example:8080',
      'http://account:secret@proxy.example:8080',
    ],
    ['proxy.example:8080:user:p@ss', 'http://user:p%40ss@proxy.example:8080'],
    ['YT_DLP_PROXY=socks5://proxy.example:1080', 'socks5://proxy.example:1080'],
    ['not a proxy value', null],
  ])('normalizes Railway proxy value %s', (input, expected) => {
    const service = createService() as unknown as {
      normalizeYtDlpProxy: (value: string) => string | null;
    };

    expect(service.normalizeYtDlpProxy(input)).toBe(expected);
  });

  it('omits an invalid proxy so yt-dlp can use the direct connection', () => {
    const service = createService({
      YT_DLP_PROXY: 'not a proxy value',
    }) as unknown as {
      ytDlpConnectionArgs: () => string[];
    };

    expect(service.ytDlpConnectionArgs()).not.toContain('--proxy');
  });

  it('writes cookies from YT_DLP_COOKIES_BASE64', () => {
    const netscape = [
      '# Netscape HTTP Cookie File',
      '.youtube.com\tTRUE\t/\tTRUE\t0\tLOGIN_INFO\tdummy',
    ].join('\n');
    const service = createService({
      YT_DLP_COOKIES_BASE64: Buffer.from(netscape, 'utf8').toString('base64'),
    }) as unknown as {
      resolveYtDlpCookiesPath: () => string | null;
    };

    const path = service.resolveYtDlpCookiesPath();
    expect(path).toBeTruthy();
    expect(path!.replace(/\\/g, '/')).toMatch(/storage\/youtube-cookies\.txt$/);
  });

  it('maps YouTube bot-check errors to a setup hint', () => {
    const service = createService() as unknown as {
      ytDlpUserFacingError: (detail: string) => string;
    };

    expect(
      service.ytDlpUserFacingError(
        "ERROR: [youtube] abc: Sign in to confirm you're not a bot",
      ),
    ).toMatch(/YT_DLP_COOKIES/);
  });

  it('maps proxy parse errors to a Railway configuration hint', () => {
    const service = createService() as unknown as {
      ytDlpUserFacingError: (detail: string) => string;
    };

    expect(
      service.ytDlpUserFacingError('ERROR: Failed to parse: [redacted proxy]'),
    ).toMatch(/http:\/\/user:password@host:port/);
  });

  it('redacts proxy credentials from command failures', () => {
    const proxy = 'http://user:secret@proxy.example:8080';
    const service = createService({
      YT_DLP_PROXY: proxy,
    }) as unknown as {
      commandErrorDetail: (error: unknown) => string;
    };

    expect(
      service.commandErrorDetail(new Error(`Command failed with ${proxy}`)),
    ).toBe('Command failed with [redacted proxy]');
  });
});
