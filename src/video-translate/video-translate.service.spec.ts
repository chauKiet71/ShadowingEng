import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { VideoTranslateService } from './video-translate.service';

type TimedSegment = {
  start: number;
  end: number;
  en: string;
};

describe('VideoTranslateService transcript segmentation', () => {
  let service: VideoTranslateService;

  beforeEach(() => {
    service = new VideoTranslateService(
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    );
  });

  function finalize(segments: TimedSegment[], durationSec = 20) {
    return (
      service as unknown as {
        finalizeSegments: (
          input: TimedSegment[],
          duration: number,
        ) => TimedSegment[];
      }
    ).finalizeSegments(segments, durationSec);
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
