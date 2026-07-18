import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, BookOpen, Mic, Clapperboard, Play, User } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import Logo from '../components/Logo';
import HorizontalScroll from '../components/HorizontalScroll';
import UserAvatar from '../components/UserAvatar';
import LessonLink from '../components/LessonLink';
import { useAuth } from '../contexts/AuthContext';
import { useListeningStats } from '../contexts/HistoryContext';
import { type LessonHistoryStats } from '../lib/api';
import {
  fetchLessonStats,
  PrefetchKeys,
  prefetchHomeFeatures,
} from '../lib/prefetchFeatures';
import { peekCache } from '../lib/prefetchCache';
import { featuredLessons, formatDuration } from '../data/mockData';
import { lessons, formatLevelLabel } from '../data/lessons';
import { categories } from '../data/categories';

const levelColors: Record<string, string> = {
  BEGINNER: 'bg-green-500',
  INTERMEDIATE: 'bg-blue-500',
  ADVANCED: 'bg-purple-500',
};

const quickLinks = [
  { icon: Headphones, label: 'Bài nghe', sub: 'Theo chủ đề', color: 'bg-blue-500', to: '/kham-pha' },
  { icon: BookOpen, label: 'Từ vựng', sub: 'Học & ôn tập', color: 'bg-orange-500', to: '/tu-vung' },
  { icon: Mic, label: 'Luyện nói', sub: 'Tình huống thật', color: 'bg-indigo-500', to: '/luyen-noi' },
  {
    icon: Clapperboard,
    label: 'Dịch video',
<<<<<<< HEAD
    sub: 'Video Youtube',
=======
    sub: 'Nghe EN + text VI',
>>>>>>> e162bce51dc80dd606c75f0a5fc5f5988ba45b30
    color: 'bg-rose-500',
    to: '/dich-video',
    disabled: false,
  },
];

export default function HomePage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const localStats = useListeningStats();
  const [remoteStats, setRemoteStats] = useState<LessonHistoryStats | null>(
    () => peekCache<LessonHistoryStats>(PrefetchKeys.lessonStats) ?? null,
  );

  // Chỉ prefetch sau khi trang chủ mount và auth đã sẵn sàng.
  useEffect(() => {
    if (authLoading) return;

    void prefetchHomeFeatures(isAuthenticated);

    if (!user?.id) {
      setRemoteStats(null);
      return;
    }

    void fetchLessonStats()
      .then(setRemoteStats)
      .catch(() => setRemoteStats(null));
  }, [authLoading, isAuthenticated, user?.id]);

  const streakDays = Math.max(
    localStats.streakDays,
    user?.streakDays ?? 0,
    remoteStats?.streakDays ?? 0,
  );

  return (
    <MobileLayout>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex"
        >
          <Logo size="sm" />
        </Link>
        {isAuthenticated ? (
          <Link to="/ca-nhan" className="rounded-full">
            <UserAvatar
              name={user?.fullName ?? 'User'}
              src={user?.avatarUrl}
              size="sm"
              bordered
            />
          </Link>
        ) : (
          <Link to="/dang-nhap" className="flex items-center gap-1 text-primary text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5">
            <User size={14} />
            Đăng nhập
          </Link>
        )}
      </div>

      {/* Hero */}
      <div className="px-4 py-4">
        <div
          className="rounded-2xl p-5 relative overflow-hidden bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/home-listening-hero.png')" }}
        >
          <h1 className="hero-title text-xl font-bold text-gray-900 leading-tight">
            Nghe chủ động -<br />Nói tự nhiên
          </h1>
          <p className="text-gray-600 text-sm mt-2">Lắng nghe – Bắt chước – Tiến bộ mỗi ngày</p>
          <div className="flex gap-2 mt-3">
            {['Listen', 'Shadow', 'Improve'].map((tag) => (
              <span key={tag} className="text-xs bg-white/70 text-primary px-2 py-1 rounded-full font-medium">{tag}</span>
            ))}
          </div>
          <Link
            to="/kham-pha"
            className="mt-4 inline-block gradient-btn text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            Bắt đầu nghe
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl card-shadow p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-gray-900">{lessons.length.toLocaleString('vi-VN')}</p>
            <p className="text-[10px] text-gray-500 leading-tight">Bài nghe chất lượng cao</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{categories.length.toLocaleString('vi-VN')}</p>
            <p className="text-[10px] text-gray-500 leading-tight">Chủ đề đa dạng</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">{streakDays}</p>
            <p className="text-[10px] text-gray-500 leading-tight">Ngày streak Liên tục học tập</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {quickLinks.map((item) => {
            const { icon: Icon, label, sub, color, disabled } = item;
            const content = (
              <>
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 ${color} rounded-xl sm:rounded-2xl flex items-center justify-center ${
                    disabled ? 'opacity-50' : ''
                  }`}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] font-semibold text-center leading-tight ${
                    disabled ? 'text-gray-400' : 'text-gray-800'
                  }`}
                >
                  {label}
                </span>
                <span className="text-[8px] sm:text-[9px] text-gray-400 text-center leading-tight line-clamp-2">
                  {sub}
                </span>
              </>
            );

            if (disabled) {
              return (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 cursor-not-allowed select-none opacity-70"
                  aria-disabled="true"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link key={label} to={item.to} className="flex flex-col items-center gap-1">
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Lessons */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Bài nghe nổi bật</h2>
          <Link to="/kham-pha?filter=featured" className="text-sm text-primary font-medium">Xem tất cả</Link>
        </div>
        <HorizontalScroll
          className="pb-2"
          visibleItems={2}
          autoPlay
          autoPlayInterval={3000}
          hideScrollbar
        >
          <div className="flex gap-3">
            {featuredLessons.map((lesson) => (
              <LessonLink
                key={lesson.id}
                lessonId={lesson.id}
                data-carousel-item
                draggable={false}
                className="flex-shrink-0 rounded-xl overflow-hidden card-shadow bg-white block"
                style={{ width: 'var(--carousel-item-width, 11rem)' }}
              >
                <div className="relative h-24">
                  <img
                    src={lesson.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                  <span className={`absolute top-2 left-2 text-[9px] font-bold text-white px-1.5 py-0.5 rounded ${levelColors[lesson.level]}`}>
                    {formatLevelLabel(lesson.level)}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                      <Play size={14} className="text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{lesson.title}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatDuration(lesson.duration)}</p>
                </div>
              </LessonLink>
            ))}
          </div>
        </HorizontalScroll>
      </div>

      {/* Popular Topics */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Chủ đề phổ biến</h2>
          <Link to="/kham-pha" className="text-sm text-primary font-medium">Xem tất cả &gt;</Link>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {categories.slice(0, 5).map((cat) => (
            <Link
              key={cat.id}
              to={`/kham-pha?category=${cat.id}`}
              className="bg-white rounded-2xl card-shadow overflow-hidden min-w-0"
            >
              <div className="flex h-[7.5rem]">
                <img
                  src={cat.imageUrl}
                  alt=""
                  className="w-[9rem] h-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0 p-2.5 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-7 h-7 flex-shrink-0 ${cat.iconColor} rounded-full flex items-center justify-center text-sm shadow`}
                    >
                      {cat.icon}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-1">
                    {cat.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
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
    </MobileLayout>
  );
}
