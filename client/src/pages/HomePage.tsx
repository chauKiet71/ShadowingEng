import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CircleCheck,
  FileVideo,
  Loader2,
  Play,
  User,
  Video,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import Logo from '../components/Logo';
import HorizontalScroll from '../components/HorizontalScroll';
import UserAvatar from '../components/UserAvatar';
import LessonLink from '../components/LessonLink';
import HeroBannerSlider from '../components/HeroBannerSlider';
import { useAuth } from '../contexts/AuthContext';
import {
  ApiError,
  api,
  type SpeakingScenario,
  type VideoTranslateJob,
  type VideoTranslateQuota,
  type VocabularyOverview,
} from '../lib/api';
import { peekCache } from '../lib/prefetchCache';
import {
  fetchVocabularyOverview,
  fetchSpeakingScenarios,
  PrefetchKeys,
  prefetchHomeFeatures,
} from '../lib/prefetchFeatures';
import { featuredLessons, formatDuration } from '../data/mockData';

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

const VIDEO_SOURCE_SHEET_CLOSE_MS = 440;
const ACCEPT_LOCAL_MEDIA =
  'video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,.mp4,.webm,.mov,.mp3,.m4a,.wav';
type VideoProcessingSource = 'youtube' | 'upload';

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [vocabularyOverview, setVocabularyOverview] =
    useState<VocabularyOverview | null>(
      () =>
        peekCache<VocabularyOverview>(PrefetchKeys.vocabularyOverview) ?? null,
    );
  const [speakingScenarios, setSpeakingScenarios] = useState<
    SpeakingScenario[]
  >(() => peekCache<SpeakingScenario[]>(PrefetchKeys.speakingScenarios) ?? []);
  const [isVideoSourceOpen, setIsVideoSourceOpen] = useState(false);
  const [isVideoSourceClosing, setIsVideoSourceClosing] = useState(false);
  const [isYoutubeUrlDialogOpen, setIsYoutubeUrlDialogOpen] = useState(false);
  const [isLocalMediaDialogOpen, setIsLocalMediaDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeUrlError, setYoutubeUrlError] = useState('');
  const [localMediaName, setLocalMediaName] = useState('');
  const [localMediaError, setLocalMediaError] = useState('');
  const [processingSource, setProcessingSource] =
    useState<VideoProcessingSource | null>(null);
  const [videoProcessingJob, setVideoProcessingJob] =
    useState<VideoTranslateJob | null>(null);
  const [youtubeSubmitting, setYoutubeSubmitting] = useState(false);
  const [localMediaSubmitting, setLocalMediaSubmitting] = useState(false);
  const videoSourceCloseTimerRef = useRef<number | null>(null);
  const videoProcessing =
    youtubeSubmitting ||
    localMediaSubmitting ||
    videoProcessingJob?.status === 'PENDING' ||
    videoProcessingJob?.status === 'PROCESSING';

  const vocabularySets = Array.isArray(vocabularyOverview?.sets)
    ? vocabularyOverview.sets.filter((set) => vocabularyCoverMap[set.slug])
    : vocabularyFallbackSets;
  const availableSpeakingScenarios = Array.isArray(speakingScenarios)
    ? speakingScenarios
    : [];
  const speakingCards = speakingFallbackCards.map((fallback) => {
    const scenario = availableSpeakingScenarios.find(
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

  useEffect(() => {
    if (
      !isVideoSourceOpen &&
      !isYoutubeUrlDialogOpen &&
      !isLocalMediaDialogOpen
    ) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isLocalMediaDialogOpen) {
          if (!videoProcessing) {
            setIsLocalMediaDialogOpen(false);
            setLocalMediaError('');
          }
        } else if (isYoutubeUrlDialogOpen) {
          if (!videoProcessing) {
            setIsYoutubeUrlDialogOpen(false);
            setYoutubeUrlError('');
          }
        } else {
          closeVideoSourceSheet();
        }
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isVideoSourceOpen,
    isVideoSourceClosing,
    isYoutubeUrlDialogOpen,
    isLocalMediaDialogOpen,
    videoProcessing,
  ]);

  useEffect(() => {
    if (
      !videoProcessingJob ||
      (videoProcessingJob.status !== 'PENDING' &&
        videoProcessingJob.status !== 'PROCESSING')
    ) {
      return;
    }

    let cancelled = false;
    const poll = () => {
      void api
        .getVideoTranslateJob(videoProcessingJob.id)
        .then((result) => {
          if (cancelled) return;
          if (result.job.status === 'READY') {
            setIsYoutubeUrlDialogOpen(false);
            setIsLocalMediaDialogOpen(false);
            setVideoProcessingJob(null);
            navigate(
              `/dich-video?job=${encodeURIComponent(result.job.id)}`,
              {
                state: {
                  videoTranslateJob: result.job,
                  videoTranslateQuota: result.quota,
                },
              },
            );
            return;
          }
          if (result.job.status === 'FAILED') {
            const message =
              result.job.errorMessage || 'Xử lý video thất bại';
            setVideoProcessingJob(null);
            if (processingSource === 'upload') {
              setLocalMediaError(message);
            } else {
              setYoutubeUrlError(message);
            }
            return;
          }
          setVideoProcessingJob(result.job);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const message =
            error instanceof Error
              ? error.message
              : 'Không kiểm tra được trạng thái video';
          setVideoProcessingJob(null);
          if (processingSource === 'upload') {
            setLocalMediaError(message);
          } else {
            setYoutubeUrlError(message);
          }
        });
    };

    poll();
    const timer = window.setInterval(poll, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    navigate,
    processingSource,
    videoProcessingJob?.id,
    videoProcessingJob?.status,
  ]);

  useEffect(
    () => () => {
      if (videoSourceCloseTimerRef.current !== null) {
        window.clearTimeout(videoSourceCloseTimerRef.current);
      }
    },
    [],
  );

  const finishClosingVideoSourceSheet = (
    destination?: string,
    onClosed?: () => void,
  ) => {
    setIsVideoSourceOpen(false);
    setIsVideoSourceClosing(false);
    videoSourceCloseTimerRef.current = null;
    if (destination) navigate(destination);
    onClosed?.();
  };

  const closeVideoSourceSheet = (
    destination?: string,
    onClosed?: () => void,
  ) => {
    if (isVideoSourceClosing) return;

    setIsVideoSourceClosing(true);
    videoSourceCloseTimerRef.current = window.setTimeout(
      () => finishClosingVideoSourceSheet(destination, onClosed),
      VIDEO_SOURCE_SHEET_CLOSE_MS,
    );
  };

  const openVideoSourceSheet = () => {
    if (videoSourceCloseTimerRef.current !== null) {
      window.clearTimeout(videoSourceCloseTimerRef.current);
      videoSourceCloseTimerRef.current = null;
    }
    setIsVideoSourceClosing(false);
    setIsVideoSourceOpen(true);
  };

  const openYoutubeUrlDialog = () => {
    closeVideoSourceSheet(undefined, () => {
      setYoutubeUrlError('');
      setProcessingSource('youtube');
      setVideoProcessingJob(null);
      setYoutubeSubmitting(false);
      setIsYoutubeUrlDialogOpen(true);
    });
  };

  const closeYoutubeUrlDialog = () => {
    if (videoProcessing) return;
    setIsYoutubeUrlDialogOpen(false);
    setYoutubeUrlError('');
    setProcessingSource(null);
  };

  const closeLocalMediaDialog = () => {
    if (videoProcessing) return;
    setIsLocalMediaDialogOpen(false);
    setLocalMediaError('');
    setLocalMediaName('');
    setProcessingSource(null);
  };

  const openReadyVideo = (
    readyJob: VideoTranslateJob,
    nextQuota: VideoTranslateQuota,
  ) => {
    setIsYoutubeUrlDialogOpen(false);
    setIsLocalMediaDialogOpen(false);
    setVideoProcessingJob(null);
    navigate(`/dich-video?job=${encodeURIComponent(readyJob.id)}`, {
      state: {
        videoTranslateJob: readyJob,
        videoTranslateQuota: nextQuota,
      },
    });
  };

  const submitYoutubeUrl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextUrl = youtubeUrl.trim();
    if (!nextUrl) {
      setYoutubeUrlError('Vui lòng dán URL video Youtube');
      return;
    }

    setYoutubeUrlError('');
    setProcessingSource('youtube');
    setYoutubeSubmitting(true);
    try {
      const result = await api.createVideoTranslateJob(nextUrl);
      if (result.job.status === 'READY') {
        openReadyVideo(result.job, result.quota);
        return;
      }
      setVideoProcessingJob(result.job);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'VIDEO_TRANSLATE_QUOTA_EXCEEDED'
      ) {
        setIsYoutubeUrlDialogOpen(false);
        navigate('/nang-cap', {
          state: {
            from: '/',
            message:
              'Bạn đã hết lượt dịch video hôm nay. Nâng cấp Premium để tiếp tục.',
          },
        });
        return;
      }
      setYoutubeUrlError(
        error instanceof Error ? error.message : 'Không thể xử lý video',
      );
    } finally {
      setYoutubeSubmitting(false);
    }
  };

  const submitLocalMedia = async (file: File) => {
    setProcessingSource('upload');
    setLocalMediaName(file.name);
    setLocalMediaError('');
    setIsLocalMediaDialogOpen(true);
    setLocalMediaSubmitting(true);
    try {
      const result = await api.createVideoTranslateJobFromUpload(file);
      if (result.job.status === 'READY') {
        openReadyVideo(result.job, result.quota);
        return;
      }
      setVideoProcessingJob(result.job);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'VIDEO_TRANSLATE_QUOTA_EXCEEDED'
      ) {
        setIsLocalMediaDialogOpen(false);
        navigate('/nang-cap', {
          state: {
            from: '/',
            message:
              'Bạn đã hết lượt dịch video hôm nay. Nâng cấp Premium để tiếp tục.',
          },
        });
        return;
      }
      setLocalMediaError(
        error instanceof Error ? error.message : 'Không thể xử lý video',
      );
    } finally {
      setLocalMediaSubmitting(false);
    }
  };

  const startLocalMediaUpload = (file: File) => {
    const beginUpload = () => {
      void submitLocalMedia(file);
    };

    if (isVideoSourceOpen) {
      closeVideoSourceSheet(undefined, beginUpload);
    } else {
      beginUpload();
    }
  };

  const handleLocalMediaInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    if (file) startLocalMediaUpload(file);
  };

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

      <div className="pointer-events-none fixed bottom-[70px] left-1/2 z-40 w-full max-w-lg -translate-x-1/2">
        <button
          type="button"
          onClick={openVideoSourceSheet}
          className="pointer-events-auto absolute bottom-0 right-[20px] inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(79,70,229,0.32)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]"
          aria-label="Thêm video"
          aria-haspopup="dialog"
          aria-expanded={isVideoSourceOpen || isYoutubeUrlDialogOpen}
        >
          <Video size={19} strokeWidth={2.6} aria-hidden="true" />
          <span>Thêm video</span>
        </button>
      </div>

      {isVideoSourceOpen && (
        <div
          className={`fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 backdrop-blur-[2px] ${
            isVideoSourceClosing
              ? 'video-source-backdrop-out pointer-events-none'
              : 'video-source-backdrop-in'
          }`}
          onClick={() => closeVideoSourceSheet()}
          role="presentation"
          data-state={isVideoSourceClosing ? 'closing' : 'open'}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-source-sheet-title"
            onClick={(event) => event.stopPropagation()}
            className={`w-full max-w-lg rounded-t-[28px] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-7 text-slate-900 shadow-[0_-18px_60px_rgba(15,23,42,0.22)] will-change-transform dark:bg-neutral-900 dark:text-white ${
              isVideoSourceClosing
                ? 'video-source-sheet-out'
                : 'video-source-sheet-in'
            }`}
          >
            <h2
              id="video-source-sheet-title"
              className="text-[18px] font-bold leading-6"
            >
              Nhập Video hoặc Âm thanh
            </h2>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-neutral-400">
              Vui lòng chọn từ đâu để nhập tệp phương tiện
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={openYoutubeUrlDialog}
                className="flex min-h-[84px] w-full items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition-colors hover:bg-slate-100 active:bg-slate-200/70 dark:border-neutral-700 dark:bg-neutral-800/70 dark:hover:bg-neutral-800"
              >
                <Video
                  size={24}
                  className="shrink-0 text-slate-600 dark:text-neutral-300"
                  fill="currentColor"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-[16px] font-bold leading-5">
                    URL Youtube
                  </span>
                  <span className="mt-0.5 block max-w-[340px] text-[14px] leading-[19px] text-slate-500 dark:text-neutral-400">
                    Phát video Youtube trong ứng dụng, không cần tải xuống
                  </span>
                </span>
              </button>

              <div className="relative">
                <div className="pointer-events-none flex min-h-[84px] w-full items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition-colors dark:border-neutral-700 dark:bg-neutral-800/70">
                  <FileVideo
                    size={24}
                    className="shrink-0 text-slate-600 dark:text-neutral-300"
                    fill="currentColor"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-[16px] font-bold leading-5">
                      Phương tiện địa phương
                    </span>
                    <span className="mt-0.5 block max-w-[340px] text-[14px] leading-[19px] text-slate-500 dark:text-neutral-400">
                      Nhập tệp phương tiện từ bộ nhớ địa phương của bạn, không cần sao chép
                    </span>
                  </span>
                </div>
                <input
                  type="file"
                  accept={ACCEPT_LOCAL_MEDIA}
                  aria-label="Chọn phương tiện địa phương"
                  onChange={handleLocalMediaInput}
                  className="absolute inset-0 h-full w-full cursor-pointer rounded-xl opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {isYoutubeUrlDialogOpen && (
        <div
          className="lesson-word-backdrop-in fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 px-6 backdrop-blur-[2px]"
          onClick={closeYoutubeUrlDialog}
          role="presentation"
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="youtube-url-dialog-title"
            aria-busy={videoProcessing}
            onSubmit={submitYoutubeUrl}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[360px] rounded-[24px] bg-white p-5 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.28)] dark:bg-neutral-900 dark:text-white"
          >
            <h2
              id="youtube-url-dialog-title"
              className="text-[16px] font-bold leading-6"
            >
              {videoProcessing ? 'Đang xử lý video' : 'URL Youtube'}
            </h2>

            {videoProcessing ? (
              <div
                className="flex min-h-[156px] flex-col items-center justify-center px-3 text-center"
                aria-live="polite"
              >
                <Loader2
                  size={32}
                  className="animate-spin text-primary"
                  aria-hidden="true"
                />
                <p className="mt-4 text-sm font-bold">
                  Đang tạo phụ đề Youtube
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-neutral-400">
                  AI đang nhận dạng nội dung và dịch sang tiếng Việt. Giao diện
                  học sẽ tự động mở khi hoàn tất.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="home-youtube-url" className="sr-only">
                  URL video Youtube
                </label>
                <input
                  id="home-youtube-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  autoFocus
                  value={youtubeUrl}
                  onChange={(event) => {
                    setYoutubeUrl(event.target.value);
                    if (youtubeUrlError) setYoutubeUrlError('');
                  }}
                  placeholder="Dán URL video Youtube"
                  aria-invalid={Boolean(youtubeUrlError)}
                  aria-describedby={
                    youtubeUrlError ? 'home-youtube-url-error' : undefined
                  }
                  className={`mt-5 h-12 w-full rounded-xl border bg-transparent px-4 text-sm outline-none transition focus:ring-2 focus:ring-primary/20 dark:bg-neutral-950 ${
                    youtubeUrlError
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-slate-300 focus:border-primary dark:border-neutral-700'
                  }`}
                />
                {youtubeUrlError && (
                  <p
                    id="home-youtube-url-error"
                    className="mt-1.5 text-xs text-red-500"
                  >
                    {youtubeUrlError}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={closeYoutubeUrlDialog}
                    className="h-11 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:bg-slate-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={!youtubeUrl.trim()}
                    className="h-11 rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-bold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Lưu
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {isLocalMediaDialogOpen && (
        <div
          className="lesson-word-backdrop-in fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 px-6 backdrop-blur-[2px]"
          onClick={closeLocalMediaDialog}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="local-media-dialog-title"
            aria-busy={videoProcessing}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[360px] rounded-[24px] bg-white p-5 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.28)] dark:bg-neutral-900 dark:text-white"
          >
            <h2
              id="local-media-dialog-title"
              className="text-[16px] font-bold leading-6"
            >
              {videoProcessing ? 'Đang xử lý video' : 'Phương tiện địa phương'}
            </h2>

            {videoProcessing ? (
              <div
                className="flex min-h-[176px] flex-col items-center justify-center px-3 text-center"
                aria-live="polite"
              >
                <Loader2
                  size={32}
                  className="animate-spin text-primary"
                  aria-hidden="true"
                />
                <p className="mt-4 text-sm font-bold">Đang tạo phụ đề</p>
                <p className="mt-1 max-w-full truncate text-xs font-medium text-slate-600 dark:text-neutral-300">
                  {localMediaName}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-neutral-400">
                  AI đang nhận dạng tiếng Anh và dịch sang tiếng Việt. Giao diện
                  học sẽ tự động mở khi hoàn tất.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-neutral-800">
                  <FileVideo
                    size={22}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <p className="min-w-0 truncate text-sm font-semibold">
                    {localMediaName}
                  </p>
                </div>

                {localMediaError && (
                  <p
                    className="mt-3 text-xs leading-5 text-red-500"
                    role="alert"
                  >
                    {localMediaError}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={closeLocalMediaDialog}
                    className="h-11 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:bg-slate-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    Đóng
                  </button>
                  <div className="relative">
                    <div className="pointer-events-none flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-secondary text-sm font-bold text-white shadow-sm">
                      Chọn lại
                    </div>
                    <input
                      type="file"
                      accept={ACCEPT_LOCAL_MEDIA}
                      aria-label="Chọn lại phương tiện địa phương"
                      onChange={handleLocalMediaInput}
                      className="absolute inset-0 h-full w-full cursor-pointer rounded-xl opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </MobileLayout>
  );
}
