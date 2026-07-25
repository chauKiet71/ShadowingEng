import { Play, Lock } from 'lucide-react';
import LessonLink from './LessonLink';
import type { Lesson } from '../data/lessons';
import { formatLevelLabel } from '../data/lessons';
import { formatDuration } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { useLessonAccess } from '../contexts/LessonAccessContext';

const levelBadgeStyles: Record<string, string> = {
  BEGINNER:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  INTERMEDIATE:
    'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  ADVANCED:
    'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
};

interface LessonGridProps {
  lessons: Lesson[];
  emptyMessage?: string;
  /** Kept for call-site compatibility; all cards share the soft layout */
  variant?: 'classic' | 'soft';
}

export default function LessonGrid({
  lessons,
  emptyMessage,
}: LessonGridProps) {
  const { user } = useAuth();
  const { isLessonLocked } = useLessonAccess();

  if (lessons.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {emptyMessage ?? 'Chưa có bài nghe nào.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lessons.map((lesson) => {
        const locked = isLessonLocked(lesson.id) && !user?.isPremium;
        return (
          <LessonLink
            key={lesson.id}
            lessonId={lesson.id}
            className="flex items-center gap-3 rounded-[20px] bg-white dark:bg-neutral-900 px-3 py-3 shadow-[0_2px_12px_rgba(99,102,241,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
          >
            <div
              className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-violet-50 dark:bg-neutral-800 ${
                locked ? 'opacity-60' : ''
              }`}
            >
              <img
                src={lesson.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                {lesson.title}
              </p>
              <span
                className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  levelBadgeStyles[lesson.level] ?? levelBadgeStyles.BEGINNER
                }`}
              >
                {formatLevelLabel(lesson.level)}
              </span>
              <p className="text-xs text-slate-400 dark:text-gray-400 mt-1 truncate">
                {lesson.topic}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 pl-1">
              {!locked && (
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {formatDuration(lesson.duration)}
                </span>
              )}
              <div className="w-9 h-9 rounded-full bg-white dark:bg-neutral-700 shadow-[0_2px_8px_rgba(37,99,235,0.18)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.55)] flex items-center justify-center ring-1 ring-transparent dark:ring-white/10">
                {locked ? (
                  <Lock size={14} className="text-amber-500" />
                ) : (
                  <Play size={14} className="text-primary ml-0.5" fill="currentColor" />
                )}
              </div>
            </div>
          </LessonLink>
        );
      })}
    </div>
  );
}
