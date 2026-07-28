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

describe('VideoTranslateService RapidAPI helpers', () => {
  function createService(config: Record<string, string | undefined> = {}) {
    return new VideoTranslateService(
      {} as never,
      {
        get: jest.fn((key: string) => config[key]),
      } as never,
    );
  }

  it('picks the best m4a audio stream', () => {
    const service = createService() as unknown as {
      pickBestAudioMedia: (
        medias: Array<Record<string, unknown>>,
      ) => Record<string, unknown> | null;
    };

    const best = service.pickBestAudioMedia([
      {
        type: 'video',
        ext: 'mp4',
        bitrate: 999999,
        download_url: 'https://example.com/video',
      },
      {
        type: 'audio',
        ext: 'opus',
        bitrate: 140000,
        audioQuality: 'AUDIO_QUALITY_MEDIUM',
        download_url: 'https://example.com/opus',
      },
      {
        type: 'audio',
        ext: 'm4a',
        bitrate: 130000,
        audioQuality: 'AUDIO_QUALITY_MEDIUM',
        download_url: 'https://example.com/m4a',
      },
      {
        type: 'audio',
        ext: 'm4a',
        bitrate: 50000,
        audioQuality: 'AUDIO_QUALITY_LOW',
        download_url: 'https://example.com/m4a-low',
      },
    ]);

    expect(best?.download_url).toBe('https://example.com/m4a');
  });

  it('reads duration from googlevideo dur query param', () => {
    const service = createService() as unknown as {
      extractDurationFromUrl: (url: string) => number | null;
      resolveDurationSec: (payload: {
        medias?: Array<{ duration?: number; url?: string }>;
      }) => number;
    };

    expect(
      service.extractDurationFromUrl(
        'https://redirector.googlevideo.com/videoplayback?dur=239.026&expire=1',
      ),
    ).toBeCloseTo(239.026);

    expect(
      service.resolveDurationSec({
        medias: [
          { duration: 3, url: 'https://x?dur=239.026' },
          { duration: 3, url: 'https://y?dur=238.9' },
        ],
      }),
    ).toBe(239);
  });
});
