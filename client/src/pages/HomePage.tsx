import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, User } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import Logo from '../components/Logo';
import HorizontalScroll from '../components/HorizontalScroll';
import UserAvatar from '../components/UserAvatar';
import LessonLink from '../components/LessonLink';
import PopularTopics from '../components/PopularTopics';
import HeroBannerSlider from '../components/HeroBannerSlider';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchLessonStats,
  prefetchHomeFeatures,
} from '../lib/prefetchFeatures';
import { featuredLessons, formatDuration } from '../data/mockData';

const forYouLinks = [
  {
    label: 'Bài nghe',
    sub: 'Theo chủ đề',
    to: '/kham-pha',
    image: '/images/home-feature-listening.png',
    cardClass:
      'bg-gradient-to-b from-sky-50 to-cyan-50/80 dark:from-sky-950/70 dark:to-neutral-900 dark:ring-1 dark:ring-white/10',
  },
  {
    label: 'Từ vựng',
    sub: 'Học & ôn tập',
    to: '/tu-vung',
    image: '/images/home-feature-vocab.png',
    cardClass:
      'bg-gradient-to-b from-violet-50 to-slate-50 dark:from-violet-950/70 dark:to-neutral-900 dark:ring-1 dark:ring-white/10',
  },
  {
    label: 'Luyện nói',
    sub: 'Tình huống thật',
    to: '/luyen-noi',
    image: '/images/home-feature-speaking.png',
    cardClass:
      'bg-gradient-to-b from-indigo-50 to-blue-50/70 dark:from-indigo-950/70 dark:to-neutral-900 dark:ring-1 dark:ring-white/10',
  },
  {
    label: 'Dịch video',
    sub: 'Upload & dịch',
    to: '/dich-video',
    image: '/images/home-feature-video.png',
    cardClass:
      'bg-gradient-to-b from-indigo-50 to-blue-50/70 dark:from-indigo-950/70 dark:to-neutral-900 dark:ring-1 dark:ring-white/10',
  },
];

export default function HomePage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  // Chỉ prefetch sau khi trang chủ mount và auth đã sẵn sàng.
  useEffect(() => {
    if (authLoading) return;

    void prefetchHomeFeatures(isAuthenticated);

    if (user?.id) {
      void fetchLessonStats().catch(() => undefined);
    }
  }, [authLoading, isAuthenticated, user?.id]);

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
        <HeroBannerSlider />
      </div>

      {/* For You */}
      <div className="px-4 mb-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-3">
          Dành cho bạn
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {forYouLinks.map((item) => {
            const { label, sub, image, cardClass, disabled } = item;
            const content = (
              <>
                <img
                  src={image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain object-center p-2 pb-8 dark:brightness-90 dark:contrast-105"
                  draggable={false}
                />
                <div className="absolute inset-x-0 bottom-0 px-1.5 pb-2 pt-1 text-center z-10">
                  <span
                    className={`block text-[12px] font-bold leading-tight ${
                      disabled
                        ? 'text-rose-300 dark:text-rose-300/70'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`block text-[10px] mt-0.5 leading-tight ${
                      disabled
                        ? 'text-rose-200 dark:text-rose-200/50'
                        : 'text-slate-400 dark:text-gray-400'
                    }`}
                  >
                    {sub}
                  </span>
                </div>
              </>
            );

            const className = `relative block rounded-[14px] overflow-hidden aspect-[2/1.05] shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)] ${cardClass} ${
              disabled
                ? 'opacity-90 cursor-not-allowed select-none'
                : 'active:scale-[0.98] transition-transform'
            }`;

            if (disabled) {
              return (
                <div key={label} className={className} aria-disabled="true" aria-label={label}>
                  {content}
                </div>
              );
            }

            return (
              <Link key={label} to={item.to} className={className} aria-label={label}>
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
      <PopularTopics limit={6} className="px-4 mb-6" />
    </MobileLayout>
  );
}
