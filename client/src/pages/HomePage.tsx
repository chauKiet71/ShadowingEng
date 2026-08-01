import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CircleCheck, Mic, Play, User } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import Logo from '../components/Logo';
import HorizontalScroll from '../components/HorizontalScroll';
import UserAvatar from '../components/UserAvatar';
import LessonLink from '../components/LessonLink';
import HeroBannerSlider from '../components/HeroBannerSlider';
import { useAuth } from '../contexts/AuthContext';
import type { SpeakingScenario, VocabularyOverview } from '../lib/api';
import { peekCache } from '../lib/prefetchCache';
import {
  fetchVocabularyOverview,
  fetchSpeakingScenarios,
  PrefetchKeys,
  prefetchHomeFeatures,
} from '../lib/prefetchFeatures';
import { featuredLessons, formatDuration } from '../data/mockData';

const forYouLinks = [
  {
    label: 'Bài nghe',
    sub: 'Luyện nghe mỗi ngày',
    action: 'Bắt đầu',
    to: '/kham-pha',
    image: '/images/home/listening-card.webp',
    actionIcon: Play,
    actionClass: 'text-blue-600',
  },
  {
    label: 'Từ vựng',
    sub: 'Học từ mới dễ nhớ',
    action: 'Học ngay',
    to: '/tu-vung',
    image: '/images/home/vocabulary-card.webp',
    actionIcon: BookOpen,
    actionClass: 'text-violet-600',
  },
  {
    label: 'Luyện nói',
    sub: 'Giao tiếp tự tin',
    action: 'Bắt đầu',
    to: '/luyen-noi',
    image: '/images/home/speaking-card.webp',
    actionIcon: Mic,
    actionClass: 'text-emerald-600',
  },
  {
    label: 'Dịch video',
    sub: 'Xem, dịch và học',
    action: 'Khám phá',
    to: '/dich-video',
    image: '/images/home/video-translation-card.webp',
    actionIcon: Play,
    actionClass: 'text-orange-600',
  },
];

const vocabularyCoverMap: Record<string, string> = {
  '1000-tu-thong-dung': '/images/vocabulary/common-1000-cover.webp?v=1',
  'du-lich-co-ban': '/images/vocabulary/travel-basic-cover.webp?v=1',
  'giao-tiep-hang-ngay': '/images/vocabulary/daily-conversation-cover.webp?v=1',
  'cong-viec-van-phong': '/images/vocabulary/office-work-cover.webp?v=1',
  'phim-anh-giai-tri': '/images/vocabulary/movies-entertainment-cover.webp?v=1',
  'cong-nghe': '/images/vocabulary/technology-cover.webp?v=1',
  'giao-duc': '/images/vocabulary/education-cover.webp?v=1',
  'kinh-te': '/images/vocabulary/economics-cover.webp?v=1',
};

const vocabularyFallbackSets = [
  {
    id: 'common-1000',
    slug: '1000-tu-thong-dung',
    title: '1000 Từ thông dụng',
    wordCount: 1000,
    learnedCount: 0,
  },
  {
    id: 'travel-basic',
    slug: 'du-lich-co-ban',
    title: 'Du lịch cơ bản',
    wordCount: 150,
    learnedCount: 0,
  },
  {
    id: 'daily-conversation',
    slug: 'giao-tiep-hang-ngay',
    title: 'Giao tiếp hằng ngày',
    wordCount: 500,
    learnedCount: 0,
  },
];

const speakingFallbackCards = [
  {
    slug: 'lam-quen',
    title: 'Làm quen',
    description: 'Trò chuyện xã giao và hỏi đáp về sở thích',
    image: '/images/speaking/redesign/intro.webp',
  },
  {
    slug: 'nha-hang',
    title: 'Nhà hàng',
    description: 'Gọi món, hỏi thành phần và thanh toán tại nhà hàng',
    image: '/images/speaking/redesign/restaurant.webp',
  },
  {
    slug: 'san-bay',
    title: 'Sân bay',
    description: 'Check-in, hỏi cổng và xử lý hành lý tại sân bay',
    image: '/images/speaking/redesign/airport.webp',
  },
  {
    slug: 'khach-san',
    title: 'Khách sạn',
    description: 'Nhận phòng, hỏi tiện nghi và yêu cầu hỗ trợ',
    image: '/images/speaking/redesign/hotel.webp',
  },
  {
    slug: 'mua-sam',
    title: 'Mua sắm',
    description: 'Hỏi giá, size và xin giảm giá khi mua sắm',
    image: '/images/speaking/redesign/shopping.webp',
  },
  {
    slug: 'phong-van',
    title: 'Phỏng vấn xin việc',
    description: 'Trả lời câu hỏi phỏng vấn và nêu kinh nghiệm',
    image: '/images/speaking/redesign/interview.webp',
  },
];

export default function HomePage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [vocabularyOverview, setVocabularyOverview] =
    useState<VocabularyOverview | null>(
      () =>
        peekCache<VocabularyOverview>(PrefetchKeys.vocabularyOverview) ?? null,
    );
  const [speakingScenarios, setSpeakingScenarios] = useState<
    SpeakingScenario[]
  >(() => peekCache<SpeakingScenario[]>(PrefetchKeys.speakingScenarios) ?? []);

  const vocabularySets =
    vocabularyOverview?.sets.filter((set) => vocabularyCoverMap[set.slug]) ??
    vocabularyFallbackSets;
  const speakingCards = speakingFallbackCards.map((fallback) => {
    const scenario = speakingScenarios.find(
      (item) => item.slug === fallback.slug,
    );

    return {
      ...fallback,
      title: scenario?.title ?? fallback.title,
      description: scenario?.description ?? fallback.description,
    };
  });

  // Khởi chạy các API công khai song song ngay khi vào trang chủ, không chờ auth.
  useEffect(() => {
    void prefetchHomeFeatures(false);
    void fetchVocabularyOverview()
      .then(setVocabularyOverview)
      .catch(() => undefined);
    void fetchSpeakingScenarios()
      .then(setSpeakingScenarios)
      .catch(() => undefined);
  }, []);

  // Sau khi auth sẵn sàng, bổ sung dữ liệu tài khoản. Cache sẽ chống gọi trùng
  // các request công khai đang chạy hoặc đã hoàn tất ở effect phía trên.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    void prefetchHomeFeatures(true);
    void fetchVocabularyOverview(true)
      .then(setVocabularyOverview)
      .catch(() => undefined);
  }, [authLoading, isAuthenticated, user?.id]);

  return (
    <MobileLayout>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Link to="/" className="inline-flex">
          <Logo size="sm" />
        </Link>
        {isAuthenticated ? (
          <Link to="/ca-nhan" className="rounded-full">
            <UserAvatar
              name={user?.fullName ?? 'User'}
              src={user?.avatarUrl}
              size="sm"
            />
          </Link>
        ) : (
          <Link
            to="/dang-nhap"
            className="flex items-center gap-1 text-primary text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5"
          >
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
        <div className="mb-3">
          <h2 className="text-[18px] font-extrabold text-gray-900 dark:text-white">
            Dành cho bạn
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {forYouLinks.map((item) => {
            const ActionIcon = item.actionIcon;

            return (
              <Link
                key={item.label}
                to={item.to}
                className="group relative block h-[154px] overflow-hidden rounded-[22px] bg-slate-900 shadow-[0_10px_24px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/20 transition duration-200 active:scale-[0.98]"
                aria-label={`${item.label}: ${item.action}`}
              >
                <img
                  src={item.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  draggable={false}
                />
                <div className="relative z-10 flex h-full flex-col items-start p-3.5">
                  <h3 className="text-[17px] font-extrabold leading-tight text-white drop-shadow-sm">
                    {item.label}
                  </h3>
                  <p className="mt-1 max-w-[54%] text-[10px] font-medium leading-[14px] text-white/80">
                    {item.sub}
                  </p>
                  <span
                    className={`mt-auto inline-flex items-center gap-1 rounded-full bg-[#ffffff] px-2.5 py-1.5 text-[10px] font-extrabold leading-none shadow-sm ${item.actionClass}`}
                  >
                    <ActionIcon
                      size={12}
                      strokeWidth={2.6}
                      aria-hidden="true"
                    />
                    {item.action}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Lessons */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Bài nghe nổi bật</h2>
          <Link
            to="/kham-pha?filter=featured"
            className="text-sm text-primary font-medium"
          >
            Xem tất cả
          </Link>
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
                      <Play
                        size={14}
                        className="text-primary ml-0.5"
                        fill="currentColor"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">
                    {lesson.title}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {formatDuration(lesson.duration)}
                  </p>
                </div>
              </LessonLink>
            ))}
          </div>
        </HorizontalScroll>
      </div>

      {/* Vocabulary Sets */}
      <section className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Khám phá bộ từ vựng
          </h2>
          <Link
            to="/tu-vung"
            className="text-xs font-semibold text-primary dark:text-indigo-400"
          >
            Xem tất cả
          </Link>
        </div>

        <HorizontalScroll
          className="-mx-4 px-4 pb-3"
          hideScrollbar
          startAtBeginning
        >
          <div className="flex gap-3">
            {vocabularySets.slice(0, 8).map((set) => (
              <Link
                key={set.id}
                to="/tu-vung"
                data-carousel-item
                draggable={false}
                aria-label={`${set.title}, ${set.wordCount} từ`}
                className="group flex w-[132px] min-w-[132px] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white text-left shadow-[0_4px_12px_rgba(15,23,42,0.10)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_8px_18px_rgba(15,23,42,0.14)] active:scale-[0.98] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-indigo-700"
              >
                <div className="h-[120px] w-full overflow-hidden bg-slate-100 dark:bg-neutral-800">
                  <img
                    src={vocabularyCoverMap[set.slug]}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="h-full w-full select-none object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="flex min-h-[76px] flex-1 flex-col px-2.5 py-2.5">
                  <p className="truncate text-[11px] font-bold leading-4 text-slate-900 dark:text-white">
                    {set.title}
                  </p>
                  <div className="mt-auto flex items-center gap-3 pt-2 text-[9px] font-medium text-slate-500 dark:text-neutral-400">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={10} strokeWidth={2} />
                      {set.wordCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CircleCheck size={10} strokeWidth={2} />
                      {set.learnedCount ?? 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </HorizontalScroll>
      </section>

      {/* Speaking Scenarios */}
      <section className="mb-6 px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white">Luyện nói</h2>
          <Link
            to="/luyen-noi"
            className="text-xs font-semibold text-primary dark:text-indigo-400"
          >
            Xem tất cả
          </Link>
        </div>

        <HorizontalScroll
          className="-mx-4 px-4 pb-3"
          hideScrollbar
          startAtBeginning
        >
          <div className="flex gap-3">
            {speakingCards.map((scenario) => (
              <Link
                key={scenario.slug}
                to="/luyen-noi"
                data-carousel-item
                draggable={false}
                aria-label={`Luyện nói: ${scenario.title}`}
                className="group flex w-[152px] min-w-[152px] flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white text-left shadow-[0_4px_12px_rgba(15,23,42,0.10)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_8px_18px_rgba(15,23,42,0.14)] active:scale-[0.98] dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-violet-700"
              >
                <div className="h-[105px] w-full overflow-hidden bg-slate-100 dark:bg-neutral-800">
                  <img
                    src={scenario.image}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="flex min-h-[78px] flex-1 flex-col px-2.5 py-2.5">
                  <p className="truncate text-[12px] font-bold leading-4 text-slate-900 dark:text-white">
                    {scenario.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[9px] font-medium leading-[13px] text-slate-500 dark:text-neutral-400">
                    {scenario.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </HorizontalScroll>
      </section>
    </MobileLayout>
  );
}
