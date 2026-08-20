import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  Lightbulb,
  Loader2,
  Mic,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  type SpeakingHistoryItem,
  type SpeakingHistoryResponse,
} from '../lib/api';
import { peekCache } from '../lib/prefetchCache';
import { fetchSpeakingHistory, PrefetchKeys } from '../lib/prefetchFeatures';
import {
  getSpeakingConversationOwnerId,
  listSpeakingConversations,
  type SpeakingConversationRecord,
} from '../lib/speakingConversationStorage';
import {
  getScenarioCategory,
  getScenarioPresentation,
} from './SpeakingPage';

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

function conversationToHistoryItem(
  record: SpeakingConversationRecord,
): SpeakingHistoryItem {
  return {
    id: record.id,
    level: record.level,
    dialect: record.dialect,
    status: record.status,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
    durationMs: record.durationMs,
    turnsSpoken: record.turnsSpoken,
    averageOverall: record.averageOverall,
    scenario: {
      ...record.scenario,
      minLevel: 'A1',
      maxLevel: 'C2',
      sortOrder: 0,
    },
  };
}

function mergeHistoryItems(
  apiItems: SpeakingHistoryItem[],
  localRecords: SpeakingConversationRecord[],
) {
  const byId = new Map(apiItems.map((item) => [item.id, item]));
  for (const record of localRecords) {
    const existing = byId.get(record.id);
    if (!existing) {
      byId.set(record.id, conversationToHistoryItem(record));
      continue;
    }
    byId.set(record.id, {
      ...existing,
      turnsSpoken: Math.max(existing.turnsSpoken, record.turnsSpoken),
      durationMs: Math.max(existing.durationMs, record.durationMs),
      averageOverall: record.averageOverall ?? existing.averageOverall,
      completedAt: record.completedAt ?? existing.completedAt,
    });
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.completedAt ?? b.createdAt).getTime() -
      new Date(a.completedAt ?? a.createdAt).getTime(),
  );
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
  const { user } = useAuth();
  const listRef = useRef<HTMLElement>(null);
  const cachedHistoryRef = useRef(
    peekCache<SpeakingHistoryResponse>(PrefetchKeys.speakingHistory),
  );
  const cachedHistory = cachedHistoryRef.current;
  const localRecords = listSpeakingConversations(
    getSpeakingConversationOwnerId(user?.id),
  );
  const [history, setHistory] = useState<SpeakingHistoryResponse>(
    () => cachedHistory ?? EMPTY_HISTORY,
  );
  const [loading, setLoading] = useState(
    () => !cachedHistory && localRecords.length === 0,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    void fetchSpeakingHistory()
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((err) => {
        if (!cancelled && !cachedHistory && localRecords.length === 0) {
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

  const items = useMemo(
    () => mergeHistoryItems(history.items, localRecords),
    [history.items, localRecords],
  );

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

        <section ref={listRef} className="scroll-mt-4">
          {loading && items.length === 0 ? (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-[22px] border border-slate-100 bg-white px-4 py-10 text-sm text-slate-500 shadow-[0_8px_22px_rgba(30,43,93,0.06)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-400">
              <Loader2 size={17} className="animate-spin text-violet-500" />
              Đang tải lịch sử...
            </div>
          ) : error && items.length === 0 ? (
            <div className="mt-3 rounded-[22px] border border-red-100 bg-red-50 px-4 py-8 text-center text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-3 rounded-[22px] border border-[#e8eaf5] bg-[#fafaff] px-5 py-9 text-center shadow-[0_8px_22px_rgba(30,43,93,0.05)] dark:border-neutral-800 dark:bg-neutral-900">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                <Mic size={22} />
              </span>
              <p className="mt-3 text-sm font-extrabold text-[#17275f] dark:text-white">
                Chưa có buổi luyện nói
              </p>
              <p className="mx-auto mt-1 max-w-[250px] text-[11px] leading-4 text-[#7d87a6] dark:text-gray-400">
                Hãy hoàn thành một tình huống luyện nói để xem lại tại đây.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {items.map((item) => {
                const category = getScenarioCategory(item.scenario);
                const scenarioPresentation = getScenarioPresentation(
                  item.scenario,
                );
                const categoryPresentation = getCategoryPresentation(category);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/luyen-noi/lich-su/${item.id}`)}
                    className="grid w-full grid-cols-[70px_minmax(0,1fr)_20px] items-center gap-2.5 rounded-[18px] border border-[#e7e9f4] bg-white p-2 text-left shadow-[0_8px_22px_rgba(30,43,93,0.07)] transition active:scale-[0.99] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_8px_22px_rgba(0,0,0,0.24)]"
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

                    <ChevronRight
                      size={15}
                      className="justify-self-end text-violet-500"
                      aria-hidden="true"
                    />
                  </button>
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
