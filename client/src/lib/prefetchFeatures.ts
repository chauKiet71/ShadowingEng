import { api } from './api';
import {
  cachedFetch,
  invalidateCache,
  invalidateCacheByPrefix,
} from './prefetchCache';

export const PrefetchKeys = {
  lessonStats: 'lesson-stats',
  vocabularyOverview: 'vocabulary-overview',
  vocabularySet: (id: string) => `vocabulary-set:${id}`,
  speakingScenarios: 'speaking-scenarios',
  speakingQuota: 'speaking-quota',
  packages: 'packages-active',
} as const;

const DEFAULT_TTL = 5 * 60 * 1000;

export function fetchLessonStats(force = false) {
  return cachedFetch(
    PrefetchKeys.lessonStats,
    () => api.getMyLessonStats(),
    { ttlMs: DEFAULT_TTL, force },
  );
}

export function fetchVocabularyOverview(force = false) {
  return cachedFetch(
    PrefetchKeys.vocabularyOverview,
    () => api.getVocabularyOverview(),
    { ttlMs: DEFAULT_TTL, force },
  );
}

export function fetchVocabularySet(id: string, force = false) {
  return cachedFetch(
    PrefetchKeys.vocabularySet(id),
    () => api.getVocabularySet(id),
    // Giữ cache lâu để quay lại chủ đề không phải fetch lại.
    { ttlMs: 24 * 60 * 60 * 1000, force },
  );
}

export function fetchActivePackages(force = false) {
  return cachedFetch(
    PrefetchKeys.packages,
    () => api.getPackages({ status: 'ACTIVE', visible: true }),
    { ttlMs: DEFAULT_TTL, force },
  );
}

export function fetchSpeakingScenarios(force = false) {
  return cachedFetch(
    PrefetchKeys.speakingScenarios,
    () => api.getSpeakingScenarios(),
    { ttlMs: DEFAULT_TTL, force },
  );
}

export function fetchSpeakingQuota(force = false) {
  return cachedFetch(
    PrefetchKeys.speakingQuota,
    () => api.getSpeakingQuota(),
    { ttlMs: DEFAULT_TTL, force },
  );
}

/** Prefetch feature APIs only after HomePage is ready. Guest: packages only. */
export function prefetchHomeFeatures(isAuthenticated: boolean) {
  const tasks: Promise<unknown>[] = [fetchActivePackages()];

  if (isAuthenticated) {
    tasks.push(
      fetchLessonStats(),
      fetchVocabularyOverview(),
      fetchSpeakingScenarios(),
      fetchSpeakingQuota(),
    );
  }

  return Promise.allSettled(tasks);
}

export function clearAuthenticatedPrefetch() {
  invalidateCache([
    PrefetchKeys.lessonStats,
    PrefetchKeys.vocabularyOverview,
    PrefetchKeys.speakingScenarios,
    PrefetchKeys.speakingQuota,
  ]);
  invalidateCacheByPrefix('vocabulary-set:');
}
