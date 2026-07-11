import LessonLink from './LessonLink';
import { Play } from 'lucide-react';
import type { Lesson } from '../data/lessons';
import { formatLevelLabel } from '../data/lessons';
import { formatDuration } from '../data/mockData';

const levelColors: Record<string, string> = {
  BEGINNER: 'bg-green-500',
  INTERMEDIATE: 'bg-blue-500',
  ADVANCED: 'bg-purple-500',
};

interface LessonGridProps {
  lessons: Lesson[];
  emptyMessage?: string;
}

export default function LessonGrid({ lessons, emptyMessage }: LessonGridProps) {
  if (lessons.length === 0) {
    return (
      <div className="bg-white rounded-2xl card-shadow p-8 text-center">
        <p className="text-sm text-gray-500">
          {emptyMessage ?? 'Chưa có bài nghe nào.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lessons.map((lesson) => (
        <LessonLink
          key={lesson.id}
          lessonId={lesson.id}
          className="flex rounded-xl overflow-hidden card-shadow bg-white"
        >
          <div className="relative w-28 h-24 shrink-0">
            <img src={lesson.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            <span
              className={`absolute top-2 left-2 text-[9px] font-bold text-white px-1.5 py-0.5 rounded ${
                levelColors[lesson.level]
              }`}
            >
              {formatLevelLabel(lesson.level)}
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                <Play size={14} className="text-primary ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>
          <div className="p-3 flex-1 flex flex-col justify-center min-w-0">
            <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
              {lesson.title}
            </p>
            <p className="text-xs text-gray-400 mt-1">{lesson.topic}</p>
            <p className="text-xs text-primary font-medium mt-1">
              {formatDuration(lesson.duration)}
            </p>
          </div>
        </LessonLink>
      ))}
    </div>
  );
}
