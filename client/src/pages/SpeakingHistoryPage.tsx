import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flame,
  Grid3X3,
  Lightbulb,
  Loader2,
  Mic,
  Plane,
  Rocket,
  SlidersHorizontal,
  Star,
  Sun,
  Trophy,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import {
  type SpeakingHistoryItem,
  type SpeakingHistoryResponse,
} from '../lib/api';
import { peekCache } from '../lib/prefetchCache';
import { fetchSpeakingHistory, PrefetchKeys } from '../lib/prefetchFeatures';
import {
  getScenarioCategory,
  getScenarioPresentation,
  type SpeakingCategory,
} from './SpeakingPage';

const HISTORY_FILTERS = [
  { id: 'all' as const, label: 'Tất cả', icon: Grid3X3 },
  { id: 'daily' as const, label: 'Hằng ngày', icon: Sun },
  { id: 'travel' as const, label: 'Du lịch', icon: Plane },
  { id: 'work' as const, label: 'Công việc', icon: BriefcaseBusiness },
  { id: 'study' as const, label: 'Học tập', icon: BookOpen },
] satisfies Array<{
  id: SpeakingCategory;
  label: string;
  icon: typeof Grid3X3;
}>;

function getCategoryPresentation(category: Exclude<SpeakingCategory, 'all'>) {
  if (category === 'travel') {
    return {
      label: 'Du lịch',
      className: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
    };
  }
  if (category === 'work') {
    return {
      label: 'Công việc',
      className:
        'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
    };
  }
  if (category === 'study') {
    return {
      label: 'Học tập',
      className:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    };
  }
  return {
    label: 'Hằng ngày',
    className:
      'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-300',
  };
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const daysAgo = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );
  const time = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  if (daysAgo === 0) return `Hôm nay, ${time}`;
  if (daysAgo === 1) return `Hôm qua, ${time}`;
  if (daysAgo > 1 && daysAgo < 7) return `${daysAgo} ngày trước, ${time}`;
  if (daysAgo >= 7 && daysAgo < 14) return `1 tuần trước, ${time}`;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatPracticeDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} phút ${String(seconds).padStart(2, '0')} giây`;
}

function getScorePresentation(score: number | null) {
  if (score == null) {
    return {
      label: 'Chưa chấm',
      ringClass: 'border-gray-200 text-gray-500 dark:border-neutral-700',
      labelClass: 'text-gray-500 dark:text-gray-400',
    };
  }
  if (score >= 90) {
    return {
      label: 'Xuất sắc',
      ringClass: 'border-emerald-400 text-emerald-700 dark:text-emerald-300',
      labelClass: 'text-emerald-500 dark:text-emerald-300',
    };
  }
  if (score >= 80) {
    return {
      label: 'Rất tốt',
      ringClass: 'border-emerald-400 text-emerald-700 dark:text-emerald-300',
      labelClass: 'text-emerald-500 dark:text-emerald-300',
    };
  }
  if (score >= 70) {
    return {
      label: 'Khá tốt',
      ringClass: 'border-orange-400 text-orange-700 dark:text-orange-300',
      labelClass: 'text-orange-500 dark:text-orange-300',
    };
  }
  return {
    label: 'Cần cố gắng',
    ringClass: 'border-rose-400 text-rose-700 dark:text-rose-300',
    labelClass: 'text-rose-500 dark:text-rose-300',
  };
}

const EMPTY_HISTORY: SpeakingHistoryResponse = {
  stats: {
    totalSessions: 0,
    averageScore: null,
    streakDays: 0,
    practicedTopics: 0,
  },
  items: [],
};

export default function SpeakingHistoryPage() {
  const navigate = useNavigate();
  const listRef = useRef<HTMLElement>(null);
  const cachedHistoryRef = useRef(
    peekCache<SpeakingHistoryResponse>(PrefetchKeys.speakingHistory),
  );
  const cachedHistory = cachedHistoryRef.current;
  const [history, setHistory] = useState<SpeakingHistoryResponse>(
    () => cachedHistory ?? EMPTY_HISTORY,
  );
  const [activeCategory, setActiveCategory] = useState<SpeakingCategory>('all');
  const [highScoresOnly, setHighScoresOnly] = useState(false);
  const [loading, setLoading] = useState(() => !cachedHistory);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    void fetchSpeakingHistory()
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((err) => {
        if (!cancelled && !cachedHistory) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không tải được lịch sử luyện nói',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    return history.items.filter((item) => {
      if (
        activeCategory !== 'all' &&
        getScenarioCategory(item.scenario) !== activeCategory
      ) {
        return false;
      }
      if (highScoresOnly && (item.averageOverall ?? 0) < 80) return false;
      return true;
    });
  }, [activeCategory, highScoresOnly, history.items]);

  const stats = [
    {
      label: 'Bài đã luyện',
      hint: 'Tổng số bài',
      value: history.stats.totalSessions,
      icon: Mic,
      iconClass: 'bg-violet-500 text-white',
      cardClass:
        'border-violet-100 bg-violet-50/80 dark:border-violet-500/20 dark:bg-violet-500/10',
    },
    {
      label: 'Trung bình',
      hint: 'Điểm trung bình',
      value:
        history.stats.averageScore == null
          ? '0%'
          : `${history.stats.averageScore}%`,
      icon: Trophy,
      iconClass: 'bg-emerald-400 text-white',
      cardClass:
        'border-emerald-100 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    },
    {
      label: 'Chuỗi ngày',
      hint: 'Luyện nói',
      value: history.stats.streakDays,
      icon: Flame,
      iconClass: 'bg-sky-400 text-white',
      cardClass:
        'border-sky-100 bg-sky-50/80 dark:border-sky-500/20 dark:bg-sky-500/10',
    },
    {
      label: 'Chủ đề đã học',
      hint: 'Khám phá',
      value: history.stats.practicedTopics,
      icon: Star,
      iconClass: 'bg-orange-400 text-white',
      cardClass:
        'border-orange-100 bg-orange-50/80 dark:border-orange-500/20 dark:bg-orange-500/10',
    },
  ];

  return (
    <MobileLayout showPlayer={false} showNav={false}>
      <div className="min-h-screen bg-white px-4 pb-8 text-[#10205b] dark:bg-neutral-950 dark:text-white">
        <header className="grid grid-cols-[42px_1fr_42px] items-center gap-3 pb-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/luyen-noi')}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white text-[#132363] shadow-[0_8px_22px_rgba(43,50,102,0.10)] ring-1 ring-slate-100 transition active:scale-95 dark:bg-neutral-900 dark:text-white dark:ring-neutral-800"
            aria-label="Quay lại"
          >
            <ArrowLeft size={22} strokeWidth={2.3} />
          </button>
          <h1 className="text-center text-[21px] font-black tracking-[-0.5px] text-[#10205b] dark:text-white">
            Lịch sử
          </h1>
          <button
            type="button"
            onClick={() =>
              listRef.current?.scrollIntoView({ behavior: 'smooth' })
            }
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white text-[#14276d] shadow-[0_8px_22px_rgba(43,50,102,0.10)] ring-1 ring-slate-100 transition active:scale-95 dark:bg-neutral-900 dark:text-violet-300 dark:ring-neutral-800"
            aria-label="Xem danh sách luyện nói"
          >
            <CalendarDays size={21} strokeWidth={2.3} />
          </button>
        </header>

        <section className="relative h-[128px] overflow-hidden rounded-[22px] border border-violet-100 bg-[#f4f0ff] shadow-[0_10px_28px_rgba(77,54,151,0.08)] dark:border-violet-500/20 dark:bg-neutral-900">
          <img
            src="/images/speaking/history-hero.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-cover object-center dark:brightness-[0.68]"
          />
          <div className="relative z-10 max-w-[225px] px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="whitespace-nowrap text-[17px] font-black tracking-[-0.3px] text-[#132363] dark:text-white">
                Tiến bộ mỗi ngày
              </h2>
              <Rocket
                size={19}
                className="text-violet-500"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2.5 max-w-[175px] text-[11px] font-medium leading-[16px] text-[#5e6b94] dark:text-gray-300">
              Bạn đã hoàn thành{' '}
              <span className="font-extrabold text-violet-600 dark:text-violet-300">
                {history.stats.totalSessions} bài luyện nói
              </span>
              . Hãy tiếp tục phát huy nhé!
            </p>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-4 gap-2">
          {stats.map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`min-w-0 rounded-[18px] border px-1.5 py-3 text-center ${stat.cardClass}`}
              >
                <span
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${stat.iconClass}`}
                >
                  <StatIcon size={16} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <p className="mt-2 text-[20px] font-black leading-none text-[#122869] dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-2 truncate text-[9px] font-extrabold text-[#17275f] dark:text-gray-200">
                  {stat.label}
                </p>
                <p className="mt-1 truncate text-[8px] font-medium text-[#8992ad] dark:text-gray-500">
                  {stat.hint}
                </p>
              </div>
            );
          })}
        </section>

        <section className="-mx-4 mt-5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            {HISTORY_FILTERS.map((filter) => {
              const FilterIcon = filter.icon;
              const selected = activeCategory === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveCategory(filter.id)}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition active:scale-[0.98] ${
                    selected
                      ? 'border-violet-600 bg-violet-600 text-white shadow-[0_6px_14px_rgba(124,77,255,0.24)]'
                      : 'border-[#e2e5f2] bg-white text-[#536083] dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300'
                  }`}
                  aria-pressed={selected}
                >
                  <FilterIcon size={15} strokeWidth={2.1} />
                  {filter.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setHighScoresOnly((current) => !current)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition active:scale-[0.98] ${
                highScoresOnly
                  ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                  : 'border-[#e2e5f2] bg-white text-violet-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-violet-300'
              }`}
              aria-pressed={highScoresOnly}
            >
              <SlidersHorizontal size={15} strokeWidth={2.1} />
              Lọc
            </button>
          </div>
        </section>

        <section ref={listRef} className="mt-5 scroll-mt-4">
          <h2 className="text-[18px] font-black tracking-[-0.2px] text-[#10205b] dark:text-white">
            Danh sách luyện nói
          </h2>

          {loading ? (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-[22px] border border-slate-100 bg-white px-4 py-10 text-sm text-slate-500 shadow-[0_8px_22px_rgba(30,43,93,0.06)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-400">
              <Loader2 size={17} className="animate-spin text-violet-500" />
              Đang tải lịch sử...
            </div>
          ) : error ? (
            <div className="mt-3 rounded-[22px] border border-red-100 bg-red-50 px-4 py-8 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mt-3 rounded-[22px] border border-[#e8eaf5] bg-[#fafaff] px-5 py-9 text-center shadow-[0_8px_22px_rgba(30,43,93,0.05)] dark:border-neutral-800 dark:bg-neutral-900">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                <Mic size={22} />
              </span>
              <p className="mt-3 text-sm font-extrabold text-[#17275f] dark:text-white">
                Chưa có buổi luyện nói phù hợp
              </p>
              <p className="mx-auto mt-1 max-w-[250px] text-[11px] leading-4 text-[#7d87a6] dark:text-gray-400">
                Hãy hoàn thành một tình huống luyện nói hoặc chọn bộ lọc khác.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {filteredItems.map((item) => {
                const category = getScenarioCategory(item.scenario);
                const scenarioPresentation = getScenarioPresentation(
                  item.scenario,
                );
                const categoryPresentation = getCategoryPresentation(category);
                const scorePresentation = getScorePresentation(
                  item.averageOverall,
                );

                return (
                  <article
                    key={item.id}
                    className="grid grid-cols-[70px_minmax(0,1fr)_66px] items-center gap-2.5 rounded-[18px] border border-[#e7e9f4] bg-white p-2 shadow-[0_8px_22px_rgba(30,43,93,0.07)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_8px_22px_rgba(0,0,0,0.24)]"
                  >
                    <img
                      src={scenarioPresentation.image}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="h-16 w-[70px] select-none rounded-[12px] object-cover"
                    />

                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <h3 className="truncate text-[13px] font-extrabold text-[#10205b] dark:text-white">
                          {item.scenario.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold ${categoryPresentation.className}`}
                        >
                          {categoryPresentation.label}
                        </span>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1.5 truncate text-[9px] font-medium text-[#75809f] dark:text-gray-400">
                        <CalendarDays size={12} className="shrink-0" />
                        {formatHistoryDate(item.completedAt ?? item.createdAt)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[8px] font-medium text-[#8992ad] dark:text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={10} />
                          {formatPracticeDuration(item.durationMs)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mic size={11} />
                          {item.turnsSpoken} lượt nói
                        </span>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-0.5">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full p-[5px] ${item.averageOverall == null ? 'border-[5px]' : ''} ${scorePresentation.ringClass}`}
                          style={{
                            background:
                              item.averageOverall == null
                                ? undefined
                                : `conic-gradient(currentColor ${Math.min(100, item.averageOverall) * 3.6}deg, rgba(148, 163, 184, 0.22) 0deg)`,
                          }}
                        >
                          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[14px] font-black dark:bg-neutral-900">
                            {item.averageOverall ?? '—'}
                          </span>
                        </div>
                        <p
                          className={`mt-1 whitespace-nowrap text-[8px] font-extrabold ${scorePresentation.labelClass}`}
                        >
                          {scorePresentation.label}
                        </p>
                      </div>
                      <ChevronRight
                        size={15}
                        className="text-violet-500"
                        aria-hidden="true"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="mt-6 flex items-center gap-3 rounded-[18px] border border-violet-100 bg-[#faf8ff] px-4 py-3 text-[#617095] dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-gray-300">
          <Lightbulb
            size={20}
            className="shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <p className="flex-1 text-[11px] font-medium">
            Luyện nói mỗi ngày để cải thiện kỹ năng và tăng sự tự tin!
          </p>
          <ChevronRight size={17} className="text-violet-500" />
        </aside>
      </div>
    </MobileLayout>
  );
}
