export type SrsStatus = 'LEARNING' | 'MASTERED';

export type SrsState = {
  reviewCount: number;
  correctCount: number;
  streak: number;
  lapses: number;
  intervalDays: number;
  easeFactor: number;
  status: SrsStatus;
};

export type SrsSchedule = SrsState & {
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
};

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const MAX_INTERVAL_DAYS = 60;
export const LEARN_CORRECT_DELAY_MS = 30 * 60 * 1000;
export const LEARN_WRONG_DELAY_MS = 10 * 60 * 1000;
export const LAPSE_DELAY_MS = 10 * 60 * 1000;
export const LEARN_SESSION_LIMIT = 5;
export const REVIEW_SESSION_LIMIT = 20;
export const OVERVIEW_DUE_PREVIEW = 8;

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}

export function clampSessionLimit(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(50, Math.max(1, Math.floor(value as number)));
}

export function scheduleLearn(now: Date, correct: boolean): SrsSchedule {
  return {
    reviewCount: 0,
    correctCount: 0,
    streak: 0,
    lapses: 0,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    status: 'LEARNING',
    lastReviewedAt: null,
    nextReviewAt: addMs(
      now,
      correct ? LEARN_CORRECT_DELAY_MS : LEARN_WRONG_DELAY_MS,
    ),
  };
}

export function scheduleReview(
  progress: SrsState,
  correct: boolean,
  now: Date,
): SrsSchedule {
  const reviewCount = progress.reviewCount + 1;

  if (!correct) {
    return {
      reviewCount,
      correctCount: progress.correctCount,
      streak: 0,
      lapses: progress.lapses + 1,
      intervalDays: 0,
      easeFactor: Math.max(MIN_EASE_FACTOR, progress.easeFactor - 0.2),
      status: 'LEARNING',
      lastReviewedAt: now,
      nextReviewAt: addMs(now, LAPSE_DELAY_MS),
    };
  }

  const streak = progress.streak + 1;
  const intervalDays = nextIntervalDays(progress, streak);
  const status =
    (streak >= 4 && intervalDays >= 14) ||
    (progress.status === 'MASTERED' && intervalDays >= 14)
      ? 'MASTERED'
      : 'LEARNING';

  return {
    reviewCount,
    correctCount: progress.correctCount + 1,
    streak,
    lapses: progress.lapses,
    intervalDays,
    easeFactor: progress.easeFactor,
    status,
    lastReviewedAt: now,
    nextReviewAt: addDays(now, intervalDays),
  };
}

function nextIntervalDays(progress: SrsState, streak: number) {
  if (progress.streak === 0 && progress.reviewCount > 0) {
    return advanceInterval(progress.intervalDays, progress.easeFactor);
  }
  if (streak <= 1) return 1;
  if (streak === 2) return 3;
  return advanceInterval(progress.intervalDays, progress.easeFactor);
}

function advanceInterval(previousDays: number, easeFactor: number) {
  if (previousDays <= 0) return 1;
  if (previousDays === 1) return 3;
  return Math.min(
    MAX_INTERVAL_DAYS,
    Math.max(4, Math.round(previousDays * easeFactor)),
  );
}
