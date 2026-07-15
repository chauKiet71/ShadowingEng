import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Search,
  Crown,
  Star,
  Heart,
  Sparkles,
  X,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import LessonGrid from '../components/LessonGrid';
import { categories, getCategoryById } from '../data/categories';
import {
  getFeaturedLessons,
  getLessonsByCategory,
  getLessonsByIds,
  lessons,
} from '../data/lessons';
import { useFavorites } from '../contexts/FavoritesContext';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';

const filters = [
  { id: 'all', label: 'Tất cả', icon: null },
  { id: 'featured', label: 'Nổi bật', icon: Star },
  { id: 'fav', label: 'Yêu thích', icon: Heart },
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
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { favoriteIds } = useFavorites();
  const { todayListeningSeconds, dailyGoalSeconds } = useHistory();
  const { user } = useAuth();

  const dailyProgress = Math.min(
    100,
    Math.round((todayListeningSeconds / dailyGoalSeconds) * 100),
  );
  const todayMinutes = Math.floor(todayListeningSeconds / 60);
  const goalMinutes = Math.floor(dailyGoalSeconds / 60);
  const streakDays = user?.streakDays ?? 0;

  const featuredLessons = getFeaturedLessons();
  const favoriteLessons = useMemo(
    () => getLessonsByIds(favoriteIds),
    [favoriteIds],
  );

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
    if (filter === 'fav' || filter === 'featured') {
      setActiveFilter(filter);
      return;
    }
    setActiveFilter('all');
  }, [searchParams, categoryId]);

  if (activeCategory) {
    const handleBack = () => {
      if (window.history.state?.idx > 0) {
        navigate(-1);
        return;
      }
      navigate('/kham-pha');
    };

    return (
      <MobileLayout>
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={handleBack}
              className="-ml-1 p-1 text-gray-700 dark:text-gray-200"
              aria-label="Quay lại trang trước"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {activeCategory.name}
            </h1>
          </div>
          <div className="ml-8 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeCategory.description}
            </p>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {categoryLessons.length} bài
            </span>
          </div>
        </div>

        <div className="px-4 mb-4">
          <LessonGrid lessons={categoryLessons} />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Khám phá</h1>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Khám phá các chủ đề nghe thú vị và nâng cao kỹ năng mỗi ngày
        </p>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tất cả bài học..."
              aria-label="Tìm kiếm bài học"
              className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Crown size={18} className="text-yellow-600" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
          {filters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveFilter(id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === id
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
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

      {!hasSearch && activeFilter === 'featured' && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Bài nghe nổi bật</h2>
            <span className="text-xs text-gray-400">{featuredLessons.length} bài</span>
          </div>
          <LessonGrid lessons={featuredLessons} />
        </div>
      )}

      {!hasSearch && activeFilter === 'fav' && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Bài nghe yêu thích</h2>
            <span className="text-xs text-gray-400">{favoriteLessons.length} bài</span>
          </div>
          <LessonGrid
            lessons={favoriteLessons}
            emptyMessage="Chưa có bài yêu thích. Bấm biểu tượng bookmark ở trang bài học để lưu."
          />
        </div>
      )}

      {!hasSearch && activeFilter === 'all' && (
      <>
      {/* Popular Topics */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Chủ đề phổ biến</h2>
          <button className="text-sm text-primary font-medium">Xem tất cả &gt;</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/kham-pha?category=${cat.id}`}
              className="bg-white rounded-2xl card-shadow overflow-hidden min-w-0"
            >
              <div className="flex h-[7.5rem]">
                <img
                  src={cat.imageUrl}
                  alt=""
                  className="w-[4.5rem] h-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0 p-2 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div
                      className={`w-6 h-6 flex-shrink-0 ${cat.iconColor} rounded-full flex items-center justify-center text-xs shadow`}
                    >
                      {cat.icon}
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2">
                    {cat.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                    {cat.description}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-auto truncate">
                    🎧 {cat.lessonCount} bài nghe
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Streak Banner */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 text-white relative overflow-hidden">
          <h3 className="font-bold text-sm">Nghe mỗi ngày – Tiến bộ mỗi ngày</h3>
          <p className="text-xs text-purple-100 mt-1">Duy trì thói quen nghe 15 phút mỗi ngày!</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-semibold">Chuỗi ngày hiện tại: {streakDays}</span>
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
          <div className="absolute right-2 bottom-2 text-5xl opacity-30">🎧</div>
        </div>
      </div>
      </>
      )}
    </MobileLayout>
  );
}
