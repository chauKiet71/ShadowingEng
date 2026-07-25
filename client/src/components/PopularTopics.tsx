import { Link } from 'react-router-dom';
import { categories, type Category } from '../data/categories';
import { getLessonsByCategory } from '../data/lessons';
import { useHistory } from '../contexts/HistoryContext';

function shortTopicName(name: string) {
  // Prefer the part before "&" for overlay (e.g. "Du lịch")
  const amp = name.indexOf('&');
  if (amp > 0) return name.slice(0, amp).trim();
  return name;
}

function topicImageUrl(url: string) {
  return url.replace(/([?&])w=\d+/g, '$1w=600').replace(/([?&])h=\d+/g, '$1h=450');
}

function ProgressRing({
  done,
  total,
}: {
  done: number;
  total: number;
}) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  const offset = c * (1 - ratio);

  return (
    <div className="relative w-11 h-11">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="rgba(15,23,42,0.45)"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#93C5FD"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-sky-200 tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

function TopicCard({
  category,
  done,
  total,
}: {
  category: Category;
  done: number;
  total: number;
}) {
  return (
    <Link
      to={`/kham-pha?category=${category.id}`}
      className="relative block rounded-[22px] overflow-hidden aspect-[4/3] active:scale-[0.98] transition-transform shadow-[0_2px_10px_rgba(15,23,42,0.08)]"
      aria-label={`${category.name}, ${done}/${total} bài`}
    >
      <img
        src={topicImageUrl(category.imageUrl)}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/40 backdrop-blur-[1.5px]"
        aria-hidden
      />
      <span className="absolute top-2.5 left-3 text-white text-[15px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] leading-tight max-w-[70%]">
        {shortTopicName(category.name)}
      </span>
      <div className="absolute bottom-2.5 right-2.5">
        <ProgressRing done={done} total={total} />
      </div>
    </Link>
  );
}

type PopularTopicsProps = {
  limit?: number;
  className?: string;
};

export default function PopularTopics({
  limit,
  className = 'px-4 mb-4',
}: PopularTopicsProps) {
  const { entries } = useHistory();
  const list = typeof limit === 'number' ? categories.slice(0, limit) : categories;

  const completedIds = new Set(
    entries.filter((e) => e.status === 'COMPLETED').map((e) => e.lessonId),
  );

  return (
    <div className={className}>
      <div className="mb-3">
        <h2 className="font-bold text-gray-900 dark:text-white">Chủ đề phổ biến</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {list.map((cat) => {
          const lessons = getLessonsByCategory(cat.id);
          const total = lessons.length || cat.lessonCount;
          const done = lessons.filter((l) => completedIds.has(l.id)).length;
          return (
            <TopicCard key={cat.id} category={cat} done={done} total={total} />
          );
        })}
      </div>
    </div>
  );
}
