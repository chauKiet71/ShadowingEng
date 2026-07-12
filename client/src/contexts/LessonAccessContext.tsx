import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface LessonAccessContextValue {
  loading: boolean;
  accessMap: Record<string, boolean>;
  isLessonLocked: (lessonId: string) => boolean;
  canAccessLesson: (lessonId: string) => boolean;
  refreshAccess: () => Promise<void>;
}

const LessonAccessContext = createContext<LessonAccessContextValue | null>(null);

export function LessonAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refreshAccess = useCallback(async () => {
    try {
      const map = await api.getLessonAccessMap();
      setAccessMap(map);
    } catch {
      setAccessMap({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  const isLessonLocked = useCallback(
    (lessonId: string) => accessMap[lessonId] === true,
    [accessMap],
  );

  const canAccessLesson = useCallback(
    (lessonId: string) => {
      if (!isLessonLocked(lessonId)) return true;
      return !!user?.isPremium;
    },
    [isLessonLocked, user?.isPremium],
  );

  const value = useMemo(
    () => ({
      loading,
      accessMap,
      isLessonLocked,
      canAccessLesson,
      refreshAccess,
    }),
    [loading, accessMap, isLessonLocked, canAccessLesson, refreshAccess],
  );

  return (
    <LessonAccessContext.Provider value={value}>
      {children}
    </LessonAccessContext.Provider>
  );
}

export function useLessonAccess() {
  const ctx = useContext(LessonAccessContext);
  if (!ctx) {
    throw new Error('useLessonAccess must be used within LessonAccessProvider');
  }
  return ctx;
}

/** Bài không có trong DB = mở; bài isLocked=true chỉ Pro truy cập được. */
export function useCanAccessLesson(lessonId: string) {
  const { canAccessLesson, isLessonLocked, loading } = useLessonAccess();
  return {
    loading,
    locked: isLessonLocked(lessonId),
    canAccess: canAccessLesson(lessonId),
  };
}
