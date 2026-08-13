import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clapperboard,
  Headphones,
  Loader2,
  MoreVertical,
  Play,
  Trash2,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { api, type VideoTranslateJob } from '../lib/api';

type SourceFilter = 'all' | 'youtube' | 'upload';

const SOURCE_FILTERS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'upload', label: 'Tải lên' },
];

function formatDuration(seconds: number | null) {
  if (!seconds) return '--:--';
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatAddedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const itemDayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const difference = Math.round((dayStart - itemDayStart) / 86_400_000);

  if (difference === 0) return 'Hôm nay';
  if (difference === 1) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN');
}

function isAudioUrl(value: string | null) {
  return Boolean(value && /\.(mp3|m4a|wav|opus)(\?|$)/i.test(value));
}

function statusLabel(job: VideoTranslateJob) {
  if (job.status === 'PENDING' || job.status === 'PROCESSING') {
    return 'Đang xử lý';
  }
  if (job.status === 'FAILED') return 'Xử lý thất bại';
  return null;
}

export default function MyVideosPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<VideoTranslateJob[]>([]);
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [menuJobId, setMenuJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    void api
      .listVideoTranslateJobs()
      .then((result) => {
        if (!cancelled) setJobs(result.jobs);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Không tải được danh sách video',
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

  useEffect(() => {
    if (!menuJobId) return;
    const closeMenu = () => setMenuJobId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [menuJobId]);

  const visibleJobs = useMemo(() => {
    const completedJobs = jobs.filter((job) => job.status === 'READY');
    if (filter === 'youtube') {
      return completedJobs.filter((job) => Boolean(job.youtubeVideoId));
    }
    if (filter === 'upload') {
      return completedJobs.filter((job) => !job.youtubeVideoId);
    }
    return completedJobs;
  }, [filter, jobs]);

  async function deleteJob(job: VideoTranslateJob) {
    setMenuJobId(null);
    setJobs((current) => current.filter((item) => item.id !== job.id));
    setError('');

    try {
      await api.deleteVideoTranslateJob(job.id);
    } catch (requestError) {
      setJobs((current) => [job, ...current]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không xóa được video',
      );
    }
  }

  function openJob(job: VideoTranslateJob) {
    if (job.status !== 'READY') return;
    void navigate(`/dich-video?job=${encodeURIComponent(job.id)}`);
  }

  return (
    <MobileLayout>
      <main className="min-h-screen px-4 pb-6 pt-3 text-[#0b1533] dark:text-white">
        <header className="relative flex h-12 items-center justify-center">
          <button
            type="button"
            onClick={() => navigate('/ca-nhan')}
            className="absolute left-0 inline-flex h-10 w-10 items-center justify-center"
            aria-label="Trở về trang cá nhân"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-sm font-semibold">Video của tôi</h1>
        </header>

        <p className="mt-1 text-center text-xs text-slate-500 dark:text-neutral-400">
          Nội dung từ YouTube và thiết bị của bạn
        </p>

        <div className="mt-5 grid grid-cols-3 rounded-2xl border border-slate-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {SOURCE_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`h-9 rounded-xl text-xs font-semibold transition-colors ${
                filter === item.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 dark:text-neutral-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <Clapperboard className="mx-auto text-primary" size={27} />
            <p className="mt-3 text-sm font-semibold">Chưa có nội dung nào</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-neutral-400">
              Video và audio bạn thêm sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <section className="mt-5 space-y-3" aria-label="Danh sách video của tôi">
            {visibleJobs.map((job) => {
              const audioOnly = isAudioUrl(job.mediaUrl);
              const processingLabel = statusLabel(job);

              return (
                <article
                  key={job.id}
                  role={job.status === 'READY' ? 'button' : undefined}
                  tabIndex={job.status === 'READY' ? 0 : undefined}
                  onClick={() => openJob(job)}
                  onKeyDown={(event) => {
                    if (
                      job.status === 'READY' &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      openJob(job);
                    }
                  }}
                  className={`relative flex min-h-[112px] gap-3 rounded-2xl border border-[#e9e7f2] bg-white p-2.5 pr-10 shadow-[0_5px_18px_rgba(42,37,83,0.05)] dark:border-neutral-800 dark:bg-neutral-900 ${
                    job.status === 'READY' ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="relative h-[92px] w-[156px] shrink-0 overflow-hidden rounded-xl bg-[#f0edff] dark:bg-neutral-800">
                    {job.thumbnailUrl ? (
                      <img
                        src={job.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : job.mediaUrl && !audioOnly ? (
                      <video
                        src={`${job.mediaUrl}#t=0.1`}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                        <Headphones size={30} />
                      </div>
                    )}

                    {job.status === 'READY' && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white">
                          <Play
                            size={16}
                            className="ml-0.5"
                            fill="currentColor"
                          />
                        </span>
                      </span>
                    )}

                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {formatDuration(job.durationSec)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 py-1">
                    <h2 className="line-clamp-2 text-sm font-extrabold leading-5">
                      {job.title ||
                        job.originalFilename ||
                        (job.youtubeVideoId ? 'Video YouTube' : 'Tệp đã tải lên')}
                    </h2>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-neutral-400">
                      {job.youtubeVideoId ? 'YouTube' : 'Tải lên'} ·{' '}
                      {formatDuration(job.durationSec)} ·{' '}
                      {formatAddedDate(job.createdAt)}
                    </p>
                    {processingLabel && (
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          job.status === 'FAILED'
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {processingLabel}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label={`Tùy chọn ${job.title || job.originalFilename || 'video'}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuJobId((current) =>
                        current === job.id ? null : job.id,
                      );
                    }}
                    className="absolute right-1.5 top-2 inline-flex h-8 w-8 items-center justify-center text-slate-500"
                  >
                    <MoreVertical size={19} />
                  </button>

                  {menuJobId === job.id && (
                    <div
                      className="absolute right-2 top-10 z-20 rounded-xl border border-slate-100 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => void deleteJob(job)}
                        className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 size={15} />
                        Xóa khỏi danh sách
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </MobileLayout>
  );
}
