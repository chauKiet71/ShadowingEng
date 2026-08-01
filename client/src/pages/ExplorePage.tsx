import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, ChevronLeft, Search, Sparkles, X } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import LessonGrid from '../components/LessonGrid';
import PopularTopics from '../components/PopularTopics';
import { getCategoryById } from '../data/categories';
import { getLessonsByCategory, lessons } from '../data/lessons';
import { useFavorites } from '../contexts/FavoritesContext';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';

const filters = [
  { id: 'all', label: 'Tất cả', icon: null },
  { id: 'fav', label: 'Đã lưu', icon: null },
];

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const allTopicsRef = useRef<HTMLDivElement>(null);
  const favoriteTopicsRef = useRef<HTMLDivElement>(null);
  const [topicsPanelHeight, setTopicsPanelHeight] = useState<number>();
  const { favoriteCategoryIds, isCategoryFavorite, toggleCategoryFavorite } =
    useFavorites();
  const { todayListeningSeconds, dailyGoalSeconds } = useHistory();
  const { user } = useAuth();

  const dailyProgress = Math.min(
    100,
    Math.round((todayListeningSeconds / dailyGoalSeconds) * 100),
  );
  const todayMinutes = Math.floor(todayListeningSeconds / 60);
  const goalMinutes = Math.floor(dailyGoalSeconds / 60);
  const streakDays = user?.streakDays ?? 0;

  const categoryId = searchParams.get('category');
  const activeCategory = categoryId ? getCategoryById(categoryId) : undefined;
  const categoryLessons = useMemo(
    () => (categoryId ? getLessonsByCategory(categoryId) : []),
    [categoryId],
  );
  const normalizedQuery = normalizeSearchText(searchQuery);
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];

    return lessons.filter((lesson) => {
      const searchableText = normalizeSearchText(
        [
          lesson.id,
          lesson.title,
          lesson.description,
          lesson.topic,
          ...lesson.sentences.flatMap((sentence) => [
            sentence.english,
            sentence.vietnamese,
          ]),
        ].join(' '),
      );
      return searchableText.includes(normalizedQuery);
    });
  }, [normalizedQuery]);
  const hasSearch = normalizedQuery.length > 0;

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (categoryId) {
      setActiveFilter('all');
      return;
    }
    if (filter === 'fav') {
      setActiveFilter('fav');
      return;
    }
    setActiveFilter('all');
  }, [searchParams, categoryId]);

  const changeFilter = (next: string) => {
    if (next === activeFilter) return;
    setActiveFilter(next);
    setSearchQuery('');

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('category');
    if (next === 'fav') {
      nextParams.set('filter', 'fav');
    } else {
      nextParams.delete('filter');
    }
    setSearchParams(nextParams, { replace: true });
  };

  useLayoutEffect(() => {
    const panel =
      activeFilter === 'fav' ? favoriteTopicsRef.current : allTopicsRef.current;
    if (!panel) return;

    const updateHeight = () => setTopicsPanelHeight(panel.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [activeFilter, categoryId, favoriteCategoryIds.length]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  if (activeCategory) {
    const categorySaved = isCategoryFavorite(activeCategory.id);
    const handleBack = () => {
      if (window.history.state?.idx > 0) {
        navigate(-1);
        return;
      }
      navigate('/kham-pha');
    };

    return (
      <MobileLayout>
        <div className="min-h-screen bg-gradient-to-b from-[#F3EEFF] via-[#F7F5FC] to-gray-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950 -mx-0">
          <div className="sticky top-0 z-30 px-4 pt-5 pb-3 bg-[#F3EEFF]/95 dark:bg-neutral-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={handleBack}
                className="-ml-1 p-1 text-slate-700 dark:text-gray-200"
                aria-label="Quay lại trang trước"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                  {activeCategory.name}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => toggleCategoryFavorite(activeCategory.id)}
                className={`shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors ${
                  categorySaved
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-neutral-900 text-primary border border-primary/20'
                }`}
                aria-pressed={categorySaved}
                aria-label={
                  categorySaved
                    ? 'Bỏ chủ đề khỏi yêu thích'
                    : 'Lưu chủ đề yêu thích'
                }
                title={categorySaved ? 'Đã lưu' : 'Lưu'}
              >
                <Bookmark
                  size={17}
                  className={categorySaved ? 'fill-current' : ''}
                />
              </button>
            </div>
          </div>

          <div className="px-4 mb-4 pt-1">
            <LessonGrid
              lessons={categoryLessons}
              variant="soft"
              returnTo={`/kham-pha?category=${activeCategory.id}`}
            />
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={20} className="text-primary shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Khám phá
            </h1>
          </div>
        </div>
        {searchOpen && (
          <div className="relative mt-3 mb-4">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tất cả bài học..."
              aria-label="Tìm kiếm bài học"
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Streak Banner */}
        <div className="mt-3 mb-3">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 text-white relative overflow-hidden">
            <h3 className="font-bold text-sm">
              Nghe mỗi ngày – Tiến bộ mỗi ngày
            </h3>
            <p className="text-xs text-purple-100 mt-1">
              Duy trì thói quen nghe 15 phút mỗi ngày!
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-semibold">
                Chuỗi ngày hiện tại: {streakDays}
              </span>
            </div>
            <div className="mt-3 relative z-10">
              <div className="flex items-center justify-between text-xs text-purple-100 mb-1.5">
                <span>Tiến độ hôm nay</span>
                <span className="font-semibold text-white">
                  {todayMinutes} / {goalMinutes} phút
                </span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
              {dailyProgress >= 100 && (
                <p className="text-[10px] text-purple-100 mt-1.5">
                  Đã hoàn thành mục tiêu 15 phút hôm nay!
                </p>
              )}
            </div>
            <div className="absolute right-2 bottom-2 text-5xl opacity-30">
              🎧
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="relative grid grid-cols-2 p-1 mb-1 rounded-full border border-gray-200 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/80 overflow-hidden">
          <span
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-[0_6px_16px_rgba(99,102,241,0.28)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeFilter === 'fav' ? 'translate-x-full' : 'translate-x-0'
            }`}
            aria-hidden
          />
          {filters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeFilter(id)}
              className={`relative z-10 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
                activeFilter === id
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
              aria-pressed={activeFilter === id}
            >
              {Icon && <Icon size={14} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasSearch && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-gray-900">Kết quả tìm kiếm</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Từ khóa: “{searchQuery.trim()}”
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {searchResults.length} bài
            </span>
          </div>
          <LessonGrid
            lessons={searchResults}
            emptyMessage="Không tìm thấy bài học phù hợp."
          />
        </div>
      )}

      {!hasSearch && (
        <div
          className="overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={
            topicsPanelHeight === undefined
              ? undefined
              : { height: `${topicsPanelHeight}px` }
          }
        >
          <div
            className={`flex w-[200%] will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeFilter === 'fav' ? '-translate-x-1/2' : 'translate-x-0'
            }`}
          >
            <div ref={allTopicsRef} className="w-1/2 shrink-0">
              <PopularTopics />
            </div>
            <div ref={favoriteTopicsRef} className="w-1/2 shrink-0">
              <PopularTopics
                categoryIds={favoriteCategoryIds}
                title="Chủ đề đã lưu"
                emptyMessage="Chưa có chủ đề yêu thích. Mở một chủ đề và bấm “Lưu” để thêm."
              />
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
