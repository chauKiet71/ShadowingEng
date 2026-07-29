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
const CATEGORY_STORAGE_KEY = 'shadowing_favorite_categories';

interface FavoritesContextValue {
  favoriteIds: string[];
  favoriteCategoryIds: string[];
  isFavorite: (lessonId: string) => boolean;
  toggleFavorite: (lessonId: string) => boolean;
  isCategoryFavorite: (categoryId: string) => boolean;
  toggleCategoryFavorite: (categoryId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function loadFavorites(key = STORAGE_KEY): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [favoriteCategories, setFavoriteCategories] = useState<Set<string>>(
    () => loadFavorites(CATEGORY_STORAGE_KEY),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(
      CATEGORY_STORAGE_KEY,
      JSON.stringify([...favoriteCategories]),
    );
  }, [favoriteCategories]);

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

  const isCategoryFavorite = useCallback(
    (categoryId: string) => favoriteCategories.has(categoryId),
    [favoriteCategories],
  );

  const toggleCategoryFavorite = useCallback((categoryId: string) => {
    let added = false;
    setFavoriteCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
        added = true;
      }
      return next;
    });
    return added;
  }, []);

  const value = useMemo(
    () => ({
      favoriteIds: [...favorites],
      favoriteCategoryIds: [...favoriteCategories],
      isFavorite,
      toggleFavorite,
      isCategoryFavorite,
      toggleCategoryFavorite,
    }),
    [
      favorites,
      favoriteCategories,
      isFavorite,
      toggleFavorite,
      isCategoryFavorite,
      toggleCategoryFavorite,
    ],
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
