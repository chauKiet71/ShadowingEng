import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Filter,
  Trash2,
  Headphones,
  Clock,
  Calendar,
  Play,
  X,
  ChevronDown,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import LessonLink from '../components/LessonLink';
import {
  formatLastListened,
  formatLevelLabel,
  useHistory,
} from '../contexts/HistoryContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { getLessonById } from '../data/lessons';
import { formatDuration } from '../data/mockData';

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'LEARNING', label: 'Đang học' },
  { key: 'COMPLETED', label: 'Đã hoàn thành' },
  { key: 'fav', label: 'Yêu thích' },
] as const;

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState(0);
  const { entries, clearHistory, removeEntry } = useHistory();
  const { isFavorite } = useFavorites();

  const items = useMemo(() => {
    return entries
      .map((entry) => {
        const lesson = getLessonById(entry.lessonId);
        if (!lesson) return null;
        return { entry, lesson };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [entries]);

  const filteredItems = useMemo(() => {
    const tab = tabs[activeTab];
    if (tab.key === 'all') return items;
    if (tab.key === 'fav') {
      return items.filter(({ lesson }) => isFavorite(lesson.id));
    }
    return items.filter(({ entry }) => entry.status === tab.key);
  }, [items, activeTab, isFavorite]);

  const stats = useMemo(() => {
    const completed = items.filter(({ entry }) => entry.status === 'COMPLETED');
    const totalSeconds = items.reduce(
      (sum, { entry }) => sum + entry.listenedSeconds,
      0,
    );
    return {
      lessonsListened: items.length,
      hoursListened: (totalSeconds / 3600).toFixed(1),
    };
  }, [items]);

  return (
    <MobileLayout>
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Lịch sử</h1>
          <div className="flex gap-2">
            <button type="button" className="flex items-center gap-1 text-sm text-gray-500 px-2 py-1">
              <Filter size={16} /> Bộ lọc
            </button>
            <button
              type="button"
              onClick={clearHistory}
              className="flex items-center gap-1 text-sm text-red-500 px-2 py-1"
            >
              <Trash2 size={16} /> Xóa
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-4 -mx-4 px-4 overflow-x-auto no-scrollbar">
          {tabs.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`pb-2 px-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-3">Tổng quan</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center">
              <Headphones size={20} className="text-primary mx-auto mb-1" />
              <p className="font-bold text-gray-900">{stats.lessonsListened}</p>
              <p className="text-[10px] text-gray-400">Bài đã nghe</p>
            </div>
            <div className="text-center">
              <Clock size={20} className="text-blue-500 mx-auto mb-1" />
              <p className="font-bold text-gray-900">{stats.hoursListened}</p>
              <p className="text-[10px] text-gray-400">Giờ đã nghe</p>
            </div>
            <div className="text-center">
              <Calendar size={20} className="text-green-500 mx-auto mb-1" />
              <p className="font-bold text-gray-900">—</p>
              <p className="text-[10px] text-gray-400">Ngày liên tiếp</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Danh sách lịch sử</h3>
          <button type="button" className="flex items-center gap-1 text-sm text-gray-500">
            Mới nhất <ChevronDown size={14} />
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl card-shadow p-8 text-center mb-4">
            <p className="text-sm text-gray-500">
              {activeTab === 3
                ? 'Chưa có bài yêu thích trong lịch sử.'
                : 'Chưa có bài nghe nào. Hãy nghe hết một bài để lưu vào lịch sử.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {filteredItems.map(({ entry, lesson }) => (
              <LessonLink
                key={entry.lessonId}
                lessonId={lesson.id}
                className="bg-white rounded-xl card-shadow p-3 flex gap-3"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={lesson.thumbnailUrl}
                    alt=""
                    className="w-20 h-14 rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                      <Play size={12} className="text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {lesson.title}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeEntry(lesson.id);
                      }}
                      className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Xóa khỏi lịch sử"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <span
                    className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${
                      entry.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {entry.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang học'}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {lesson.topic} • {formatLevelLabel(lesson.level)}
                  </p>
                  {entry.status === 'LEARNING' && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">{entry.progress}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {formatDuration(lesson.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {formatLastListened(entry.lastListenedAt)}
                    </span>
                  </div>
                </div>
              </LessonLink>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
