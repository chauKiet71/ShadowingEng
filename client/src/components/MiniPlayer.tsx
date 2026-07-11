import { Link } from 'react-router-dom';
import { Play, ListMusic } from 'lucide-react';
import LessonLink from './LessonLink';
import { formatDuration } from '../data/mockData';
import { getLessonById, formatLevelLabel } from '../data/lessons';
import { useAuth } from '../contexts/AuthContext';
import { useHistory } from '../contexts/HistoryContext';
export default function MiniPlayer() {
  const { isAuthenticated } = useAuth();
  const { currentLearningEntry } = useHistory();

  if (!isAuthenticated || !currentLearningEntry) return null;

  const lesson = getLessonById(currentLearningEntry.lessonId);
  if (!lesson) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4">
      <div className="max-w-lg mx-auto bg-gray-900 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
        <LessonLink lessonId={lesson.id} className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={lesson.thumbnailUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{lesson.title}</p>
            <p className="text-gray-400 text-xs">
              {formatLevelLabel(lesson.level)} • {formatDuration(lesson.duration)}
            </p>
          </div>
        </LessonLink>
        <LessonLink
          lessonId={lesson.id}
          className="w-9 h-9 bg-primary rounded-full flex items-center justify-center flex-shrink-0"
          aria-label="Tiếp tục nghe"
        >
          <Play size={16} className="text-white ml-0.5" fill="white" />
        </LessonLink>
        <Link
          to="/lich-su"
          className="text-gray-400 flex-shrink-0"
          aria-label="Lịch sử học tập"
        >
          <ListMusic size={20} />
        </Link>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700 pointer-events-none">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${currentLearningEntry.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
