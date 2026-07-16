import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Target, Bookmark, MessageCircle, Play, User } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import Logo from '../components/Logo';
import HorizontalScroll from '../components/HorizontalScroll';
import UserAvatar from '../components/UserAvatar';
import LessonLink from '../components/LessonLink';
import { useAuth } from '../contexts/AuthContext';
import { useListeningStats } from '../contexts/HistoryContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { api, type LessonHistoryStats } from '../lib/api';
import { featuredLessons, formatDuration } from '../data/mockData';
import { getRandomLessonId, lessons, formatLevelLabel } from '../data/lessons';
import { categories } from '../data/categories';

const levelColors: Record<string, string> = {
  BEGINNER: 'bg-green-500',
  INTERMEDIATE: 'bg-blue-500',
  ADVANCED: 'bg-purple-500',
};

const quickLinks = [
  { icon: Headphones, label: 'Bài nghe', sub: 'Theo chủ đề', color: 'bg-blue-500', to: '/kham-pha' },
  { icon: Target, label: 'Luyện tập', sub: 'Shadowing', color: 'bg-pink-500', randomLesson: true },
  { icon: Bookmark, label: 'Yêu thích', sub: 'Đã lưu', color: 'bg-orange-500', to: '/kham-pha?filter=fav' },
  { icon: MessageCircle, label: 'Chat AI', sub: 'Theo cấp độ', color: 'bg-teal-500', to: '/tro-chuyen-ai' },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const { goToLesson } = useRequireAuth();
  const localStats = useListeningStats();
  const [remoteStats, setRemoteStats] = useState<LessonHistoryStats | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setRemoteStats(null);
      return;
    }

    void api.getMyLessonStats()
      .then(setRemoteStats)
      .catch(() => setRemoteStats(null));
  }, [user?.id]);

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
          className="inline-flex rounded-xl bg-white border border-gray-100 px-2.5 py-1.5 card-shadow"
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
        <div className="grid grid-cols-4 gap-2">
          {quickLinks.map((item) => {
            const { icon: Icon, label, sub, color } = item;
            const content = (
              <>
                <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center`}>
                  <Icon size={22} className="text-white" />
                </div>
                <span className="text-[10px] font-semibold text-gray-800">{label}</span>
                <span className="text-[9px] text-gray-400">{sub}</span>
              </>
            );

            if ('randomLesson' in item && item.randomLesson) {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => goToLesson(getRandomLessonId())}
                  className="flex flex-col items-center gap-1"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={label} to={item.to!} className="flex flex-col items-center gap-1">
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
                  className="w-[4.5rem] h-full object-cover flex-shrink-0"
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
