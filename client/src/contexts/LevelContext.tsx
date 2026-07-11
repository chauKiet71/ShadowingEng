import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getUserLevelLabel,
  type UserLevelId,
  userLevelOptions,
} from '../data/userLevels';

const STORAGE_KEY = 'shadowing_user_level';

interface LevelContextValue {
  level: UserLevelId;
  levelLabel: string;
  setLevel: (level: UserLevelId) => void;
  options: typeof userLevelOptions;
}

const LevelContext = createContext<LevelContextValue | null>(null);

function loadLevel(): UserLevelId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && userLevelOptions.some((o) => o.id === raw)) {
      return raw as UserLevelId;
    }
  } catch {
    // ignore
  }
  return 'beginner';
}

export function LevelProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<UserLevelId>(loadLevel);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, level);
  }, [level]);

  const setLevel = useCallback((next: UserLevelId) => {
    setLevelState(next);
  }, []);

  const value = useMemo(
    () => ({
      level,
      levelLabel: getUserLevelLabel(level),
      setLevel,
      options: userLevelOptions,
    }),
    [level, setLevel],
  );

  return <LevelContext.Provider value={value}>{children}</LevelContext.Provider>;
}

export function useLevel() {
  const ctx = useContext(LevelContext);
  if (!ctx) {
    throw new Error('useLevel must be used within LevelProvider');
  }
  return ctx;
}
