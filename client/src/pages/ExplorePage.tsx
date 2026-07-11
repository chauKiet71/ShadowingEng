import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Crown, Star, Heart, Flame, GraduationCap, Sparkles } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import LessonGrid from '../components/LessonGrid';
import { categories, getCategoryById } from '../data/categories';
import { getFeaturedLessons, getLessonsByCategory, getLessonsByIds } from '../data/lessons';
import { useFavorites } from '../contexts/FavoritesContext';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';

const filters = [
  { id: 'all', label: 'Tất cả', icon: null },
  { id: 'featured', label: 'Nổi bật', icon: Star },
  { id: 'fav', label: 'Yêu thích', icon: Heart },
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'ielts', label: 'IELTS', icon: GraduationCap },
];

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState('all');
  const [categoryFavorites, setCategoryFavorites] = useState<Set<string>>(new Set(['2']));
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

  const toggleCategoryFavorite = (id: string) => {
    setCategoryFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
              placeholder="Tìm chủ đề..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
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
              onClick={() => setActiveFilter(id)}
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

      {activeFilter === 'featured' && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Bài nghe nổi bật</h2>
            <span className="text-xs text-gray-400">{featuredLessons.length} bài</span>
          </div>
          <LessonGrid lessons={featuredLessons} />
        </div>
      )}

      {activeFilter === 'fav' && (
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

      {activeFilter === 'all' && activeCategory && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-gray-900">{activeCategory.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{activeCategory.description}</p>
            </div>
            <span className="text-xs text-gray-400">{categoryLessons.length} bài</span>
          </div>
          <LessonGrid lessons={categoryLessons} />
        </div>
      )}

      {activeFilter === 'all' && !activeCategory && (
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleCategoryFavorite(cat.id);
                      }}
                      className="flex-shrink-0 p-0.5"
                    >
                      <Heart
                        size={14}
                        className={
                          categoryFavorites.has(cat.id)
                            ? 'text-red-500 fill-red-500'
                            : 'text-gray-300'
                        }
                      />
                    </button>
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
