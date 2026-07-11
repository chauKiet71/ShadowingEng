import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'shadowing_lesson_history';
const DAILY_STORAGE_KEY = 'shadowing_daily_listening';
export const DAILY_GOAL_MINUTES = 15;
export const DAILY_GOAL_SECONDS = DAILY_GOAL_MINUTES * 60;

const lastReportedByLesson = new Map<string, number>();

interface DailyListening {
  date: string;
  seconds: number;
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function loadDailyListening(): DailyListening {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return { date: getTodayKey(), seconds: 0 };
    const parsed = JSON.parse(raw) as DailyListening;
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), seconds: 0 };
    }
    return parsed;
  } catch {
    return { date: getTodayKey(), seconds: 0 };
  }
}

function saveDailyListening(data: DailyListening) {
  localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(data));
}

function addDailyListeningSeconds(seconds: number) {
  if (seconds <= 0) return;
  const current = loadDailyListening();
  saveDailyListening({
    date: getTodayKey(),
    seconds: current.seconds + seconds,
  });
}

export type HistoryStatus = 'LEARNING' | 'COMPLETED';

export interface HistoryEntry {
  lessonId: string;
  status: HistoryStatus;
  progress: number;
  listenedSeconds: number;
  lastListenedAt: string;
}

interface HistoryContextValue {
  entries: HistoryEntry[];
  currentLearningEntry: HistoryEntry | undefined;
  todayListeningSeconds: number;
  dailyGoalSeconds: number;
  getEntry: (lessonId: string) => HistoryEntry | undefined;
  updateListeningProgress: (
    lessonId: string,
    currentTime: number,
    duration: number,
  ) => void;
  markLessonCompleted: (lessonId: string, duration: number) => void;
  removeEntry: (lessonId: string) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sortEntries(entries: HistoryEntry[]) {
  return [...entries].sort(
    (a, b) =>
      new Date(b.lastListenedAt).getTime() - new Date(a.lastListenedAt).getTime(),
  );
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => sortEntries(loadHistory()));
  const [todayListeningSeconds, setTodayListeningSeconds] = useState(
    () => loadDailyListening().seconds,
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const refreshDailyListening = useCallback(() => {
    setTodayListeningSeconds(loadDailyListening().seconds);
  }, []);

  const trackListeningDelta = useCallback((lessonId: string, currentTime: number) => {
    const entry = entries.find((e) => e.lessonId === lessonId);
    const reported = lastReportedByLesson.get(lessonId);
    const prev = reported ?? entry?.listenedSeconds ?? 0;
    const delta = Math.max(0, currentTime - prev);
    if (delta > 0) {
      addDailyListeningSeconds(delta);
      lastReportedByLesson.set(lessonId, currentTime);
      refreshDailyListening();
    }
  }, [entries, refreshDailyListening]);

  const upsertEntry = useCallback(
    (lessonId: string, patch: Partial<HistoryEntry> & Pick<HistoryEntry, 'lessonId'>) => {
      setEntries((prev) => {
        const index = prev.findIndex((e) => e.lessonId === lessonId);
        const now = new Date().toISOString();
        if (index !== -1 && prev[index].status === 'COMPLETED' && patch.status !== 'COMPLETED') {
          return prev;
        }
        if (index === -1) {
          return sortEntries([
            {
              lessonId,
              status: 'LEARNING',
              progress: 0,
              listenedSeconds: 0,
              lastListenedAt: now,
              ...patch,
            },
            ...prev,
          ]);
        }
        const next = [...prev];
        next[index] = { ...next[index], ...patch, lastListenedAt: now };
        return sortEntries(next);
      });
    },
    [],
  );

  const getEntry = useCallback(
    (lessonId: string) => entries.find((e) => e.lessonId === lessonId),
    [entries],
  );

  const updateListeningProgress = useCallback(
    (lessonId: string, currentTime: number, duration: number) => {
      if (duration <= 0) return;
      trackListeningDelta(lessonId, currentTime);
      const progress = Math.min(100, Math.round((currentTime / duration) * 100));
      upsertEntry(lessonId, {
        lessonId,
        status: 'LEARNING',
        progress,
        listenedSeconds: Math.floor(currentTime),
      });
    },
    [upsertEntry, trackListeningDelta],
  );

  const markLessonCompleted = useCallback(
    (lessonId: string, duration: number) => {
      trackListeningDelta(lessonId, duration);
      upsertEntry(lessonId, {
        lessonId,
        status: 'COMPLETED',
        progress: 100,
        listenedSeconds: Math.floor(duration),
      });
    },
    [upsertEntry, trackListeningDelta],
  );

  const removeEntry = useCallback((lessonId: string) => {
    setEntries((prev) => prev.filter((e) => e.lessonId !== lessonId));
  }, []);

  const clearHistory = useCallback(() => {
    setEntries([]);
  }, []);

  const currentLearningEntry = useMemo(
    () => entries.find((e) => e.status === 'LEARNING'),
    [entries],
  );

  const value = useMemo(
    () => ({
      entries,
      currentLearningEntry,
      todayListeningSeconds,
      dailyGoalSeconds: DAILY_GOAL_SECONDS,
      getEntry,
      updateListeningProgress,
      markLessonCompleted,
      removeEntry,
      clearHistory,
    }),
    [
      entries,
      currentLearningEntry,
      todayListeningSeconds,
      getEntry,
      updateListeningProgress,
      markLessonCompleted,
      removeEntry,
      clearHistory,
    ],
  );

  return (
    <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error('useHistory must be used within HistoryProvider');
  }
  return ctx;
}

export function formatLastListened(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const time = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (diffDays === 0) return `Hôm nay, ${time}`;
  if (diffDays === 1) return `Hôm qua, ${time}`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export function formatLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    BEGINNER: 'Cơ bản',
    INTERMEDIATE: 'Trung cấp',
    ADVANCED: 'Nâng cao',
    Beginner: 'Cơ bản',
    Intermediate: 'Trung cấp',
    Advanced: 'Nâng cao',
  };
  return labels[level] ?? level;
}

function formatDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function computeStreakDays(
  entries: HistoryEntry[],
  todayListeningSeconds: number,
): number {
  const activeDays = new Set<string>();

  for (const entry of entries) {
    if (entry.listenedSeconds > 0 || entry.progress > 0) {
      activeDays.add(formatDayKey(new Date(entry.lastListenedAt)));
    }
  }

  if (todayListeningSeconds > 0) {
    activeDays.add(getTodayKey());
  }

  if (activeDays.size === 0) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!activeDays.has(formatDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (activeDays.has(formatDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function countActiveDays(
  entries: HistoryEntry[],
  todayListeningSeconds: number,
): number {
  const activeDays = new Set<string>();

  for (const entry of entries) {
    if (entry.listenedSeconds > 0 || entry.progress > 0) {
      activeDays.add(formatDayKey(new Date(entry.lastListenedAt)));
    }
  }

  if (todayListeningSeconds > 0) {
    activeDays.add(getTodayKey());
  }

  return activeDays.size;
}

export function useListeningStats() {
  const { entries, todayListeningSeconds } = useHistory();

  return useMemo(() => {
    const completedLessons = entries.filter(
      (entry) => entry.status === 'COMPLETED',
    ).length;
    const totalSeconds = entries.reduce(
      (sum, entry) => sum + entry.listenedSeconds,
      0,
    );
    const hoursListened = Math.round((totalSeconds / 3600) * 10) / 10;
    const streakDays = computeStreakDays(entries, todayListeningSeconds);
    const activeDays = countActiveDays(entries, todayListeningSeconds);
    const avgHoursPerDay =
      activeDays > 0
        ? Math.round((totalSeconds / 3600 / activeDays) * 10) / 10
        : 0;

    return {
      completedLessons,
      hoursListened,
      streakDays,
      avgHoursPerDay,
    };
  }, [entries, todayListeningSeconds]);
}
