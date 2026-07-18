import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clapperboard,
  Languages,
  Loader2,
  Mic,
  Subtitles,
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

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YtPlayer }) => void;
            onStateChange?: (event: { data: number; target: YtPlayer }) => void;
          };
        },
      ) => YtPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YtPlayer = {
  destroy: () => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
};

function loadYoutubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector('script[data-yt-api]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.dataset.ytApi = '1';
      document.body.appendChild(tag);
    }
  });
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

  // Giữ câu hiện tại đến khi câu kế bắt đầu (không tin end ngắn của YouTube)
  let active = -1;
  for (let i = 0; i < segments.length; i += 1) {
    if (segments[i].start <= time + 0.08) active = i;
    else break;
  }
  return active;
}

/** Cố định câu active ở đầu vùng transcript (ngay dưới video). */
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

export default function VideoTranslatePage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
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
  const playerRef = useRef<YtPlayer | null>(null);
  const syncRafRef = useRef<number | null>(null);
  const transcriptListRef = useRef<HTMLDivElement | null>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const prevActiveIndexRef = useRef(-1);

  const activeIndex = useMemo(
    () => findActiveSegmentIndex(job?.segments ?? [], currentTime),
    [job?.segments, currentTime],
  );
  const activeSegment =
    activeIndex >= 0 && job?.segments
      ? job.segments[activeIndex]
      : null;

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
      const player = playerRef.current;
      if (player) {
        setCurrentTime(player.getCurrentTime());
      }
      syncRafRef.current = window.requestAnimationFrame(tick);
    };
    syncRafRef.current = window.requestAnimationFrame(tick);
  }

  function pausePlayback() {
    playerRef.current?.pauseVideo();
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
        setQuota(nextQuota);
        setRecent(list.jobs.filter((item) => item.status === 'READY').slice(0, 8));
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

  useEffect(() => {
    if (!job || job.status !== 'READY') return;

    let destroyed = false;
    let player: YtPlayer | null = null;

    async function setup() {
      await loadYoutubeApi();
      if (destroyed || !window.YT) return;

      playerRef.current?.destroy();
      player = new window.YT.Player('vt-player', {
        videoId: job!.youtubeVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          mute: 0,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            // Mặc định: chỉ nghe audio tiếng Anh gốc của YouTube
            event.target.unMute();
          },
          onStateChange: (event) => {
            const playing = event.data === window.YT!.PlayerState.PLAYING;
            const paused =
              event.data === window.YT!.PlayerState.PAUSED ||
              event.data === window.YT!.PlayerState.ENDED;

            event.target.unMute();
            if (playing) {
              startSyncLoop();
            } else if (paused) {
              stopSyncLoop();
            }
          },
        },
      });
      playerRef.current = player;
    }

    void setup();

    return () => {
      destroyed = true;
      stopSyncLoop();
      player?.destroy();
      playerRef.current = null;
    };
  }, [job?.id, job?.status, job?.youtubeVideoId]);

  function goToUpgrade() {
    navigate('/nang-cap', {
      state: {
        from: '/dich-video',
        message:
          'Bạn đã hết 3 video miễn phí hôm nay. Nâng cấp Premium để dịch không giới hạn.',
      },
    });
  }

  async function submitUrl(raw?: string) {
    const nextUrl = (raw ?? url).trim();
    if (!nextUrl) {
      setError('Hãy dán link YouTube');
      return;
    }
    if (quota && !quota.isPremium && (quota.remaining ?? 0) <= 0) {
      goToUpgrade();
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await api.createVideoTranslateJob(nextUrl);
      setJob(result.job);
      setQuota(result.quota);
      if (result.fromCache && result.job.status === 'READY') {
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

  function seekToSegment(seg: VideoTranslateSegment) {
    const player = playerRef.current;
    if (player) {
      player.seekTo(seg.start, true);
      player.playVideo();
    }
    setCurrentTime(seg.start);
    startSyncLoop();
  }

  const processing =
    job?.status === 'PENDING' || job?.status === 'PROCESSING';
  const ready = job?.status === 'READY';

  return (
    <MobileLayout showNav>
      <div
        className={
          ready
            ? 'px-4 pt-3 flex flex-col h-[calc(100dvh-5.5rem)]'
            : 'px-4 pt-4 pb-8 space-y-4'
        }
      >
        <div className={`flex items-center gap-3 ${ready ? 'shrink-0 mb-2' : ''}`}>
          <Link to="/" className="text-gray-600 p-1 -ml-1">
            <ArrowLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Dịch video
            </h1>
            {!ready && (
              <p className="text-xs text-gray-500 truncate">
                Nghe tiếng Anh · xem bản dịch VI
              </p>
            )}
          </div>
          {ready && job ? (
            <button
              type="button"
              onClick={() => {
                setJob(null);
                setUrl('');
                setError('');
                setCurrentTime(0);
                prevActiveIndexRef.current = -1;
              }}
              className="text-xs font-semibold text-rose-500 shrink-0 px-2 py-1"
            >
              Video khác
            </button>
          ) : (
            <Clapperboard className="text-rose-500 shrink-0" size={22} />
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-rose-500" size={28} />
          </div>
        ) : (
          <>
            {!ready && (
              <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Link YouTube
                </label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitUrl();
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2.5 text-sm outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  disabled={submitting || processing}
                  onClick={() => void submitUrl()}
                  className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-semibold py-2.5 text-sm flex items-center justify-center gap-2"
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
                <Loader2 className="animate-spin text-rose-500 mx-auto" size={28} />
                <p className="font-semibold text-gray-900 dark:text-white">
                  Đang xử lý video
                </p>
                <p className="text-xs text-gray-500">
                  Lấy transcript tiếng Anh, dịch chữ sang VI (không tạo audio Việt)…
                </p>
              </div>
            )}

            {ready && job && (
              <>
                <div className="shrink-0 space-y-2 bg-gray-50 dark:bg-neutral-950 z-10">
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                    <div id="vt-player" className="w-full h-full" />
                  </div>

                  <p
                    className="min-w-0 text-sm font-semibold text-gray-900 dark:text-white truncate"
                    title={job.title || undefined}
                  >
                    {job.title || 'YouTube video'}
                  </p>

                  <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 px-2 py-2 flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSubtitles((prev) => !prev)}
                      aria-pressed={showSubtitles}
                      className={`flex-1 rounded-xl py-2.5 flex flex-col items-center gap-1 transition-colors ${
                        showSubtitles
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                          : 'text-gray-500'
                      }`}
                    >
                      <Subtitles size={18} strokeWidth={showSubtitles ? 2.5 : 2} />
                      <span className="text-[10px] font-semibold">
                        Phụ đề {showSubtitles ? 'bật' : 'tắt'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShadowingToggle}
                      disabled={isFetching || !activeSegment?.en}
                      className={`flex-[1.4] rounded-xl py-2.5 px-2 flex items-center justify-center gap-2 text-white font-semibold disabled:opacity-60 ${
                        isRecording
                          ? 'bg-red-500'
                          : isFetching
                            ? 'bg-gray-400'
                            : 'bg-emerald-500'
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
                        <span className="block text-[9px] font-medium opacity-90">
                          {isRecording
                            ? 'Bấm để dừng'
                            : 'Nói theo câu đang phát'}
                        </span>
                      </span>
                    </button>
                  </div>
                </div>

                <div
                  ref={transcriptListRef}
                  className="mt-2 flex-1 min-h-0 overflow-y-auto overscroll-contain px-0.5"
                >
                  <div className="space-y-3 pb-[45vh]">
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
                          className={`w-full text-left p-4 rounded-xl border cursor-pointer transition-colors duration-300 ease-out ${
                            active
                              ? 'bg-green-50 border-green-300 shadow-sm ring-1 ring-green-200 dark:bg-green-950/30 dark:border-green-700 dark:ring-green-800'
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
                                          ? 'text-green-600'
                                          : 'text-red-500'
                                      }
                                    >
                                      {displayWord}
                                    </span>
                                  );
                                })}
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
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
                              <p className="text-xs text-indigo-500 mt-1 italic">
                                {phoneticText}
                              </p>
                            )}
                            {showSubtitles && (
                              <p className="text-sm text-gray-400 mt-1">{seg.vi}</p>
                            )}
                            <p className="text-[10px] text-gray-300 mt-1.5">
                              {formatTime(seg.start)} – {formatTime(seg.end)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
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
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openJob(item)}
                      className="w-full flex gap-3 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-2.5 text-left"
                    >
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="w-24 h-14 object-cover rounded-xl shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-14 rounded-xl bg-gray-100 dark:bg-neutral-800 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                          {item.title || item.youtubeVideoId}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          {item.durationSec
                            ? formatTime(item.durationSec)
                            : '—'}
                          {item.fromCache ? ' · cache' : ''}
                        </p>
                      </div>
                    </button>
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
