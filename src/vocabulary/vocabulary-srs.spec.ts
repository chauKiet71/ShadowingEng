import {
  DEFAULT_EASE_FACTOR,
  LEARN_CORRECT_DELAY_MS,
  LEARN_WRONG_DELAY_MS,
  LAPSE_DELAY_MS,
  MIN_EASE_FACTOR,
  scheduleLearn,
  scheduleReview,
  type SrsState,
} from './vocabulary-srs';

function state(overrides: Partial<SrsState> = {}): SrsState {
  return {
    reviewCount: 0,
    correctCount: 0,
    streak: 0,
    lapses: 0,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    status: 'LEARNING',
    ...overrides,
  };
}

describe('vocabulary SRS', () => {
  const now = new Date('2026-08-20T12:00:00.000Z');

  it('schedules first learn review later the same day', () => {
    const correct = scheduleLearn(now, true);
    const wrong = scheduleLearn(now, false);

    expect(correct.status).toBe('LEARNING');
    expect(correct.intervalDays).toBe(0);
    expect(correct.nextReviewAt.getTime()).toBe(
      now.getTime() + LEARN_CORRECT_DELAY_MS,
    );
    expect(wrong.nextReviewAt.getTime()).toBe(
      now.getTime() + LEARN_WRONG_DELAY_MS,
    );
  });

  it('uses a 1-3-then-ease ladder on consecutive correct reviews', () => {
    const first = scheduleReview(state(), true, now);
    expect(first.streak).toBe(1);
    expect(first.intervalDays).toBe(1);

    const second = scheduleReview(first, true, now);
    expect(second.streak).toBe(2);
    expect(second.intervalDays).toBe(3);

    const third = scheduleReview(second, true, now);
    expect(third.intervalDays).toBe(8);

    const fourth = scheduleReview(third, true, now);
    expect(fourth.streak).toBe(4);
    expect(fourth.intervalDays).toBe(20);
    expect(fourth.status).toBe('MASTERED');
  });

  it('resets streak and demotes mastered words after a lapse', () => {
    const result = scheduleReview(
      state({
        reviewCount: 6,
        correctCount: 6,
        streak: 4,
        intervalDays: 20,
        status: 'MASTERED',
      }),
      false,
      now,
    );

    expect(result.streak).toBe(0);
    expect(result.status).toBe('LEARNING');
    expect(result.intervalDays).toBe(0);
    expect(result.lapses).toBe(1);
    expect(result.easeFactor).toBeCloseTo(2.3);
    expect(result.nextReviewAt.getTime()).toBe(now.getTime() + LAPSE_DELAY_MS);
  });

  it('keeps mastered status when a long-interval word is answered correctly', () => {
    const result = scheduleReview(
      state({
        reviewCount: 8,
        correctCount: 8,
        streak: 0,
        intervalDays: 30,
        status: 'MASTERED',
      }),
      true,
      now,
    );

    expect(result.status).toBe('MASTERED');
    expect(result.intervalDays).toBe(60);
  });

  it('does not drop ease below the minimum', () => {
    const result = scheduleReview(
      state({ easeFactor: MIN_EASE_FACTOR }),
      false,
      now,
    );
    expect(result.easeFactor).toBe(MIN_EASE_FACTOR);
  });
});
