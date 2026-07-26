import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clapperboard,
  Languages,
  Loader2,
  Mic,
  Subtitles,
  Upload,
  X,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { useShadowing } from '../hooks/useShadowing';
import {
  ApiError,
  api,
  type VideoTranslateJob,
  type VideoTranslateQuota,
  type VideoTranslateSegment,
} from '../lib/api';
import { resolveLessonPhonetics } from '../lib/phonetic';

const DELETED_RECENT_VIDEO_IDS_KEY = 'video_translate_deleted_recent_job_ids';
const ACCEPT_MEDIA =
  'video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,.mp4,.webm,.mov,.mkv,.mp3,.m4a,.wav';

function getDeletedRecentVideoIds() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(DELETED_RECENT_VIDEO_IDS_KEY) ?? '[]',
    );
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
  } catch {
    return new Set<string>();
  }
}

function rememberDeletedRecentVideoId(id: string) {
  const ids = getDeletedRecentVideoIds();
  ids.add(id);
  localStorage.setItem(
    DELETED_RECENT_VIDEO_IDS_KEY,
    JSON.stringify(Array.from(ids).slice(-100)),
  );
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function findActiveSegmentIndex(
  segments: VideoTranslateSegment[],
  time: number,
): number {
  if (!segments.length) return -1;
  let active = -1;
  for (let i = 0; i < segments.length; i += 1) {
    if (segments[i].start <= time + 0.08) active = i;
    else break;
  }
  return active;
}

const ACTIVE_SENTENCE_SLOT_TOP = 0;

function scrollSegmentIntoView(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const offsetTop = elementRect.top - containerRect.top + container.scrollTop;
  const targetTop = offsetTop - ACTIVE_SENTENCE_SLOT_TOP;
  const maxScroll = container.scrollHeight - container.clientHeight;
  container.scrollTo({
    top: Math.min(maxScroll, Math.max(0, targetTop)),
    behavior,
  });
}

function isAudioMediaUrl(url: string | null | undefined) {
  return Boolean(url && /\.(mp3|m4a|wav|opus)(\?|$)/i.test(url));
}

export default function VideoTranslatePage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quota, setQuota] = useState<VideoTranslateQuota | null>(null);
  const [job, setJob] = useState<VideoTranslateJob | null>(null);
  const [recent, setRecent] = useState<VideoTranslateJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [phoneticTexts, setPhoneticTexts] = useState<string[]>([]);
  const [shadowingResultIndex, setShadowingResultIndex] = useState<number | null>(
    null,
  );
  const {
    result: shadowingResult,
    error: shadowingError,
    isRecording,
    isProcessing,
    isFetching,
    toggleRecording,
    reset: resetShadowing,
  } = useShadowing();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncRafRef = useRef<number | null>(null);
  const transcriptListRef = useRef<HTMLDivElement | null>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevActiveIndexRef = useRef(-1);

  const activeIndex = useMemo(
    () => findActiveSegmentIndex(job?.segments ?? [], currentTime),
    [job?.segments, currentTime],
  );
  const activeSegment =
    activeIndex >= 0 && job?.segments ? job.segments[activeIndex] : null;

  useEffect(() => {
    const container = transcriptListRef.current;
    const el = segmentRefs.current[activeIndex];
    if (!container || !el || activeIndex < 0) return;
    const prev = prevActiveIndexRef.current;
    if (activeIndex === prev) return;
    const behavior: ScrollBehavior =
      prev >= 0 && Math.abs(activeIndex - prev) === 1 ? 'smooth' : 'auto';
    prevActiveIndexRef.current = activeIndex;
    const frame = requestAnimationFrame(() => {
      scrollSegmentIntoView(container, el, behavior);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex]);

  useEffect(() => {
    segmentRefs.current = [];
    prevActiveIndexRef.current = -1;
  }, [job?.id]);

  function stopSyncLoop() {
    if (syncRafRef.current != null) {
      window.cancelAnimationFrame(syncRafRef.current);
      syncRafRef.current = null;
    }
  }

  function startSyncLoop() {
    stopSyncLoop();
    const tick = () => {
      const media = mediaRef.current;
      if (media) setCurrentTime(media.currentTime || 0);
      syncRafRef.current = window.requestAnimationFrame(tick);
    };
    syncRafRef.current = window.requestAnimationFrame(tick);
  }

  function pausePlayback() {
    mediaRef.current?.pause();
    stopSyncLoop();
  }

  function handleShadowingToggle() {
    if (isFetching || !activeSegment?.en.trim()) return;
    if (!isRecording) {
      pausePlayback();
      setShadowingResultIndex(activeIndex);
    }
    void toggleRecording(activeSegment.en);
  }

  useEffect(() => {
    resetShadowing();
    setShadowingResultIndex(null);
    setPhoneticTexts([]);
  }, [job?.id, resetShadowing]);

  useEffect(() => {
    if (!job || job.status !== 'READY' || !job.segments.length) {
      setPhoneticTexts([]);
      return;
    }
    let cancelled = false;
    void resolveLessonPhonetics(
      job.segments.map((seg) => ({ english: seg.en })),
    ).then((values) => {
      if (!cancelled) setPhoneticTexts(values);
    });
    return () => {
      cancelled = true;
    };
  }, [job?.id, job?.status, job?.segments]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [nextQuota, list] = await Promise.all([
          api.getVideoTranslateQuota(),
          api.listVideoTranslateJobs(),
        ]);
        if (cancelled) return;
        const deletedIds = getDeletedRecentVideoIds();
        setQuota(nextQuota);
        setRecent(
          list.jobs
            .filter(
              (item) => item.status === 'READY' && !deletedIds.has(item.id),
            )
            .slice(0, 8),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Không tải được dịch video',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!job || (job.status !== 'PENDING' && job.status !== 'PROCESSING')) {
      return;
    }
    const timer = window.setInterval(() => {
      void api
        .getVideoTranslateJob(job.id)
        .then((result) => {
          setJob(result.job);
          setQuota(result.quota);
          if (result.job.status === 'READY') {
            setRecent((prev) => {
              const without = prev.filter((item) => item.id !== result.job.id);
              return [result.job, ...without].slice(0, 8);
            });
          }
          if (result.job.status === 'FAILED') {
            setError(result.job.errorMessage || 'Xử lý video thất bại');
          }
        })
        .catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  useEffect(() => () => stopSyncLoop(), []);

  function goToUpgrade() {
    navigate('/nang-cap', {
      state: {
        from: '/dich-video',
        message:
          'Bạn đã hết 3 video miễn phí hôm nay. Nâng cấp Premium để dịch không giới hạn.',
      },
    });
  }

  async function submitUpload() {
    if (!selectedFile) {
      setError('Hãy chọn file video hoặc audio');
      return;
    }
    if (quota && !quota.isPremium && (quota.remaining ?? 0) <= 0) {
      goToUpgrade();
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await api.createVideoTranslateJob(selectedFile);
      setJob(result.job);
      setQuota(result.quota);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (result.job.status === 'READY') {
        setRecent((prev) => {
          const without = prev.filter((item) => item.id !== result.job.id);
          return [result.job, ...without].slice(0, 8);
        });
      }
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.code === 'VIDEO_TRANSLATE_QUOTA_EXCEEDED'
      ) {
        goToUpgrade();
        return;
      }
      setError(err instanceof Error ? err.message : 'Không tạo được job dịch');
    } finally {
      setSubmitting(false);
    }
  }

  function openJob(item: VideoTranslateJob) {
    setJob(item);
    setError('');
    setCurrentTime(0);
    prevActiveIndexRef.current = -1;
  }

  async function deleteRecentJob(item: VideoTranslateJob) {
    setRecent((prev) => prev.filter((recentItem) => recentItem.id !== item.id));
    if (job?.id === item.id) {
      setJob(null);
      setCurrentTime(0);
      prevActiveIndexRef.current = -1;
    }

    try {
      await api.deleteVideoTranslateJob(item.id);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 404 &&
        err.message.startsWith('Cannot DELETE')
      ) {
        rememberDeletedRecentVideoId(item.id);
        return;
      }
      setRecent((prev) => [item, ...prev].slice(0, 8));
      setError(err instanceof Error ? err.message : 'Không xóa được video');
    }
  }

  function seekToSegment(seg: VideoTranslateSegment) {
    const media = mediaRef.current;
    if (media) {
      media.currentTime = seg.start;
      void media.play();
    }
    setCurrentTime(seg.start);
    startSyncLoop();
  }

  const processing =
    job?.status === 'PENDING' || job?.status === 'PROCESSING';
  const ready = job?.status === 'READY';
  const mediaIsAudio = isAudioMediaUrl(job?.mediaUrl);

  return (
    <MobileLayout showNav={!ready}>
      <div
        className={
          ready
            ? 'px-4 pt-3 flex flex-col h-[100dvh]'
            : 'px-4 pt-4 pb-8 space-y-4'
        }
      >
        <div className={`flex items-center gap-3 ${ready ? 'shrink-0 mb-2' : ''}`}>
          <button
            type="button"
            onClick={() => {
              if (ready) {
                setJob(null);
                setSelectedFile(null);
                setError('');
                setCurrentTime(0);
                prevActiveIndexRef.current = -1;
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
              }
              if (window.history.state?.idx > 0) {
                navigate(-1);
                return;
              }
              navigate('/');
            }}
            className="text-gray-600 p-1 -ml-1"
            aria-label="Quay lại"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            {!ready && (
              <h1 className="text-xl font-bold text-gray-900">
                Dịch video
              </h1>
            )}
          </div>
          {ready && job ? (
            <button
              type="button"
              onClick={() => {
                setJob(null);
                setSelectedFile(null);
                setError('');
                setCurrentTime(0);
                prevActiveIndexRef.current = -1;
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-xs font-semibold text-primary shrink-0 px-2 py-1"
            >
              Video khác
            </button>
          ) : (
            <Clapperboard className="text-primary shrink-0" size={22} />
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : (
          <>
            {!ready && (
              <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Tải video lên
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_MEDIA}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setError('');
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-2xl border border-dashed border-primary/40 dark:border-primary/50 bg-primary/5 dark:bg-primary/10 px-3 py-8 text-center"
                >
                  <Upload className="mx-auto text-primary mb-2" size={22} />
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {selectedFile ? selectedFile.name : 'Chọn file từ máy'}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    mp4, webm, mov, mp3, m4a, wav · tối đa 120MB
                  </p>
                </button>
                <button
                  type="button"
                  disabled={submitting || processing || !selectedFile}
                  onClick={() => void submitUpload()}
                  className="w-full rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 disabled:opacity-60 text-white font-semibold py-2.5 text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25"
                >
                  {submitting || processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Languages size={16} />
                  )}
                  {processing ? 'Đang dịch…' : 'Dịch video'}
                </button>
                {quota && (
                  <p className="text-xs text-gray-500 text-center">
                    {quota.isPremium
                      ? 'Premium · không giới hạn số video'
                      : `Miễn phí còn ${quota.remaining ?? 0}/${quota.limit} video hôm nay · tối đa ${Math.floor(quota.maxSeconds / 60)} phút/video`}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-sm px-3 py-2">
                {error}
              </div>
            )}

            {processing && (
              <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-6 text-center space-y-2">
                <Loader2 className="animate-spin text-primary mx-auto" size={28} />
                <p className="font-semibold text-gray-900 dark:text-white">
                  Đang xử lý video
                </p>
                <p className="text-xs text-gray-500">
                  Nhận dạng tiếng Anh (Whisper) rồi dịch sang tiếng Việt…
                </p>
              </div>
            )}

            {ready && job && job.mediaUrl && (
              <>
                <div className="shrink-0 space-y-2 bg-white dark:bg-neutral-950 z-10">
                  <div
                    className={`rounded-2xl overflow-hidden bg-black ${
                      mediaIsAudio ? 'aspect-[16/7] flex items-center justify-center' : 'aspect-video'
                    }`}
                  >
                    {mediaIsAudio ? (
                      <audio
                        key={job.id}
                        ref={(el) => {
                          mediaRef.current = el;
                        }}
                        src={job.mediaUrl}
                        controls
                        className="w-full px-3"
                        onPlay={startSyncLoop}
                        onPause={stopSyncLoop}
                        onEnded={stopSyncLoop}
                        onTimeUpdate={(e) =>
                          setCurrentTime(e.currentTarget.currentTime || 0)
                        }
                      />
                    ) : (
                      <video
                        key={job.id}
                        ref={(el) => {
                          mediaRef.current = el;
                        }}
                        src={job.mediaUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain bg-black"
                        onPlay={startSyncLoop}
                        onPause={stopSyncLoop}
                        onEnded={stopSyncLoop}
                        onTimeUpdate={(e) =>
                          setCurrentTime(e.currentTarget.currentTime || 0)
                        }
                      />
                    )}
                  </div>

                  <p
                    className="min-w-0 text-sm font-semibold text-gray-900 dark:text-white truncate"
                    title={job.title || undefined}
                  >
                    {job.title || job.originalFilename || 'Video đã tải lên'}
                  </p>
                </div>

                <div
                  ref={transcriptListRef}
                  className="mt-2 flex-1 min-h-0 overflow-y-auto overscroll-contain px-0.5"
                >
                  <div className="space-y-3 pb-28">
                    {job.segments.map((seg, idx) => {
                      const active = idx === activeIndex;
                      const showScore =
                        shadowingResultIndex === idx &&
                        !!shadowingResult?.words?.length;
                      const phoneticText = phoneticTexts[idx] ?? '';
                      return (
                        <button
                          key={`${seg.start}-${idx}`}
                          ref={(el) => {
                            segmentRefs.current[idx] = el;
                          }}
                          type="button"
                          onClick={() => seekToSegment(seg)}
                          className={`w-full text-left p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-out ${
                            active
                              ? 'bg-primary/5 border-primary shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                              : 'bg-white border-gray-100 dark:bg-neutral-900 dark:border-neutral-800'
                          }`}
                        >
                          <div className="min-w-0">
                            {showScore ? (
                              <p className="text-sm font-semibold leading-relaxed flex flex-wrap gap-x-1 gap-y-0.5">
                                {shadowingResult!.words.map((word, wordIndex) => {
                                  const displayWord =
                                    seg.en.split(/\s+/)[wordIndex] ?? word.word;
                                  return (
                                    <span
                                      key={`${word.word}-${wordIndex}`}
                                      className={
                                        word.correct
                                          ? 'text-emerald-600'
                                          : 'text-red-500'
                                      }
                                    >
                                      {displayWord}
                                    </span>
                                  );
                                })}
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                                {seg.en}
                              </p>
                            )}

                            {showScore && shadowingResult && (
                              <p className="text-xs text-gray-500 mt-2">
                                Bạn nói:{' '}
                                <span className="italic">
                                  {shadowingResult.transcript || '—'}
                                </span>
                                {typeof shadowingResult.score === 'number'
                                  ? ` · ${Math.round(shadowingResult.score)}%`
                                  : ''}
                              </p>
                            )}
                            {shadowingResultIndex === idx && shadowingError && (
                              <p className="text-xs text-red-500 mt-2">
                                {shadowingError}
                              </p>
                            )}
                            {shadowingResultIndex === idx && isProcessing && (
                              <p className="text-xs text-gray-400 mt-2">
                                Đang chấm điểm...
                              </p>
                            )}

                            {phoneticText && (
                              <p className="text-xs text-primary mt-1.5 italic leading-relaxed">
                                {phoneticText}
                              </p>
                            )}
                            {showSubtitles && (
                              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                                {seg.vi}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-300 mt-2 tabular-nums">
                              {formatTime(seg.start)} – {formatTime(seg.end)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t border-gray-100 dark:border-neutral-800">
                  <div className="max-w-lg mx-auto px-4 pt-2.5 pb-3">
                    <div className="rounded-2xl bg-slate-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 px-2 py-2 flex items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSubtitles((prev) => !prev)}
                        aria-pressed={showSubtitles}
                        className={`flex-1 rounded-xl py-2.5 flex flex-col items-center gap-1 transition-colors ${
                          showSubtitles ? 'text-primary' : 'text-gray-400'
                        }`}
                      >
                        <Subtitles
                          size={18}
                          strokeWidth={showSubtitles ? 2.5 : 2}
                        />
                        <span
                          className={`text-[10px] font-semibold ${
                            showSubtitles ? 'border-b-2 border-primary pb-0.5' : ''
                          }`}
                        >
                          Phụ đề {showSubtitles ? 'bật' : 'tắt'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShadowingToggle}
                        disabled={isFetching || !activeSegment?.en}
                        className={`flex-[1.4] rounded-full py-2.5 px-2 flex items-center justify-center gap-2 text-white font-semibold disabled:opacity-60 ${
                          isRecording
                            ? 'bg-red-500 ring-2 ring-red-300 ring-offset-1'
                            : isFetching
                              ? 'bg-gray-400'
                              : 'bg-gradient-to-r from-primary to-secondary shadow-md shadow-primary/25'
                        }`}
                      >
                        {isFetching ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Mic size={16} />
                        )}
                        <span className="text-left leading-tight">
                          <span className="block text-xs font-bold">
                            {isRecording
                              ? 'Đang ghi…'
                              : isFetching
                                ? 'Đang chấm…'
                                : 'Shadowing'}
                          </span>
                          <span
                            className={`block text-[9px] font-medium ${
                              isRecording ? 'text-red-100' : 'text-white/80'
                            }`}
                          >
                            {isRecording
                              ? 'Bấm để dừng'
                              : 'Nói theo câu đang phát'}
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!ready && recent.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 px-1">
                  Gần đây
                </h2>
                <div className="space-y-2">
                  {recent.map((item) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openJob(item)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openJob(item);
                        }
                      }}
                      className="relative w-full flex gap-3 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-2.5 pr-10 text-left cursor-pointer"
                    >
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="w-24 h-14 object-cover rounded-xl shrink-0 bg-primary/5"
                        />
                      ) : item.mediaUrl &&
                        !/\.(mp3|m4a|wav|opus)(\?|$)/i.test(item.mediaUrl) ? (
                        <video
                          src={`${item.mediaUrl}#t=0.1`}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-24 h-14 object-cover rounded-xl shrink-0 bg-black pointer-events-none"
                        />
                      ) : (
                        <div className="w-24 h-14 rounded-xl bg-primary/5 dark:bg-primary/10 shrink-0 flex items-center justify-center">
                          <Clapperboard className="text-primary" size={20} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                          {item.title || item.originalFilename || 'Video đã tải lên'}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          {item.durationSec
                            ? formatTime(item.durationSec)
                            : '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Xóa video gần đây"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteRecentJob(item);
                        }}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-primary/5 hover:text-primary dark:hover:bg-neutral-800"
                      >
                        <X size={15} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
