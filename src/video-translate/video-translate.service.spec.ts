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
