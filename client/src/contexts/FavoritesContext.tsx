import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'shadowing_favorite_lessons';

interface FavoritesContextValue {
  favoriteIds: string[];
  isFavorite: (lessonId: string) => boolean;
  toggleFavorite: (lessonId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  const isFavorite = useCallback(
    (lessonId: string) => favorites.has(lessonId),
    [favorites],
  );

  const toggleFavorite = useCallback((lessonId: string) => {
    let added = false;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
        added = false;
      } else {
        next.add(lessonId);
        added = true;
      }
      return next;
    });
    return added;
  }, []);

  const value = useMemo(
    () => ({
      favoriteIds: [...favorites],
      isFavorite,
      toggleFavorite,
    }),
    [favorites, isFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
