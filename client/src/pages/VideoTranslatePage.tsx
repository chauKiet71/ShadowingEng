import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clapperboard,
  Gauge,
  Languages,
  Lightbulb,
  Link2,
  Loader2,
  Mic,
  MoreVertical,
  Play,
  Repeat,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import LessonWordDetailSheet from '../components/LessonWordDetailSheet';
import MobileLayout from '../components/MobileLayout';
import { useAuth } from '../contexts/AuthContext';
import { useShadowing } from '../hooks/useShadowing';
import {
  ApiError,
  api,
  type VocabularyLookupDetail,
  type VideoTranslateJob,
  type VideoTranslateQuota,
  type VideoTranslateSegment,
} from '../lib/api';
import { resolveLessonPhonetics } from '../lib/phonetic';

const DELETED_RECENT_VIDEO_IDS_KEY = 'video_translate_deleted_recent_job_ids';
const ACCEPT_MEDIA =
  'video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,.mp4,.webm,.mov,.mkv,.mp3,.m4a,.wav';
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const;
type PlaybackRate = (typeof PLAYBACK_RATES)[number];

type VideoTranslateNavigationState = {
  videoTranslateJob?: VideoTranslateJob;
  videoTranslateQuota?: VideoTranslateQuota;
};

type VideoWordLookupContext = {
  word: string;
  sentence: string;
  sentenceTranslation: string;
};

type YoutubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  unMute: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YoutubePlayer }) => void;
            onStateChange?: (event: {
              data: number;
              target: YoutubePlayer;
            }) => void;
            onError?: () => void;
          };
        },
      ) => YoutubePlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise !== null) return youtubeApiPromise;

  youtubeApiPromise = new Promise<void>((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };

    if (!document.querySelector('script[data-youtube-iframe-api]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.youtubeIframeApi = 'true';
      script.onerror = () => {
        youtubeApiPromise = null;
        reject(new Error('Không tải được trình phát YouTube'));
      };
      document.body.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

function formatPlaybackRate(rate: PlaybackRate) {
  return `${rate === 1 ? '1.0' : rate}x`;
}

function cleanVocabularyToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[^a-z'-]+|[^a-z'-]+$/g, '');
}

function speakVocabularyText(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.75;
  window.speechSynthesis.speak(utterance);
}

function getDeletedRecentVideoIds() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(DELETED_RECENT_VIDEO_IDS_KEY) ?? '[]',
    ) as unknown;
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
  playbackRate: PlaybackRate,
): number {
  if (!segments.length) return -1;
  const lookahead = 0.08 * playbackRate;
  let active = -1;
  for (let i = 0; i < segments.length; i += 1) {
    if (segments[i].start <= time + lookahead) active = i;
    else break;
  }
  return active;
}

type SegmentWordTiming = NonNullable<VideoTranslateSegment['words']>[number];

function estimateSegmentWordTimings(
  segment: VideoTranslateSegment,
): SegmentWordTiming[] {
  const words = segment.en.split(/\s+/).filter(Boolean);
  const weights = words.map((word) =>
    Math.max(1, word.replace(/[^a-z0-9]+/gi, '').length),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const duration = Math.max(0.12, segment.end - segment.start);
  let cursor = segment.start;

  return words.map((text, index) => {
    const end =
      index === words.length - 1
        ? segment.end
        : cursor + (duration * weights[index]) / totalWeight;
    const timing = { text, start: cursor, end };
    cursor = end;
    return timing;
  });
}

function resolveSegmentWordTimings(segment: VideoTranslateSegment) {
  const stored = segment.words?.filter(
    (word) =>
      word.text.trim().length > 0 &&
      Number.isFinite(word.start) &&
      Number.isFinite(word.end),
  );
  if (!stored?.length) return estimateSegmentWordTimings(segment);

  const segmentDuration = Math.max(0.12, segment.end - segment.start);
  const latestStoredEnd = Math.max(...stored.map((word) => word.end));
  const timingsAreRelative =
    segment.start > 0.1 && latestStoredEnd <= segmentDuration + 0.25;
  let previousEnd = segment.start;

  return stored.map((word, index) => {
    const offset = timingsAreRelative ? segment.start : 0;
    const rawStart = word.start + offset;
    const rawEnd = word.end + offset;
    const start = Math.min(
      segment.end,
      Math.max(segment.start, previousEnd, rawStart),
    );
    const end =
      index === stored.length - 1
        ? segment.end
        : Math.min(segment.end, Math.max(start, rawEnd));
    previousEnd = end;
    return { ...word, start, end };
  });
}

function findActiveWordIndex(
  words: SegmentWordTiming[],
  time: number,
  playbackRate: PlaybackRate,
  segmentEnd: number,
) {
  const lookahead = 0.04 * playbackRate;
  if (time > segmentEnd + lookahead) return -1;

  let active = -1;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (time + lookahead < word.start) break;
    active = index;
  }
  return active;
}

function wordBorderClass(active: boolean) {
  return `inline-block rounded-[5px] border px-0.5 py-px transition-colors duration-75 ${
    active ? 'border-emerald-400 bg-emerald-400/10' : 'border-transparent'
  }`;
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

function formatRecentDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Hôm nay';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export default function VideoTranslatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigationState = location.state as VideoTranslateNavigationState | null;
  const routedJob = navigationState?.videoTranslateJob ?? null;
  const requestedJobId = searchParams.get('job');
  const initialUrl = searchParams.get('url')?.trim() ?? '';
  const [url, setUrl] = useState(initialUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quota, setQuota] = useState<VideoTranslateQuota | null>(
    navigationState?.videoTranslateQuota ?? null,
  );
  const [job, setJob] = useState<VideoTranslateJob | null>(routedJob);
  const [recent, setRecent] = useState<VideoTranslateJob[]>([]);
  const [loading, setLoading] = useState(!routedJob);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sourceMode, setSourceMode] = useState<'url' | 'upload'>(() =>
    searchParams.get('mode') === 'upload' ? 'upload' : 'url',
  );
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [recentMenuId, setRecentMenuId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [isPlaybackRateOpen, setIsPlaybackRateOpen] = useState(false);
  const [phoneticTexts, setPhoneticTexts] = useState<string[]>([]);
  const [wordLookupContext, setWordLookupContext] =
    useState<VideoWordLookupContext | null>(null);
  const [wordDetail, setWordDetail] = useState<VocabularyLookupDetail | null>(
    null,
  );
  const [wordDetailLoading, setWordDetailLoading] = useState(false);
  const [wordDetailError, setWordDetailError] = useState('');
  const [wordDetailSaving, setWordDetailSaving] = useState(false);
  const [shadowingResultIndex, setShadowingResultIndex] = useState<
    number | null
  >(null);
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
  const youtubePlayerRef = useRef<YoutubePlayer | null>(null);
  const youtubePlayerMountRef = useRef<HTMLDivElement | null>(null);
  const isLoopingRef = useRef(false);
  const autoPlayRequestedRef = useRef(Boolean(routedJob));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recentSectionRef = useRef<HTMLDivElement | null>(null);
  const syncRafRef = useRef<number | null>(null);
  const transcriptListRef = useRef<HTMLDivElement | null>(null);
  const playbackSpeedRef = useRef<HTMLDivElement | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevActiveIndexRef = useRef(-1);
  const wordLookupRequestRef = useRef(0);
  const autoSubmitUrlRef = useRef<string | null>(
    searchParams.get('autoSubmit') === '1' && initialUrl ? initialUrl : null,
  );

  const activeIndex = useMemo(
    () =>
      findActiveSegmentIndex(job?.segments ?? [], currentTime, playbackRate),
    [job?.segments, currentTime, playbackRate],
  );
  const activeSegment =
    activeIndex >= 0 && job?.segments ? job.segments[activeIndex] : null;
  const wordTimingsBySegment = useMemo(
    () => (job?.segments ?? []).map(resolveSegmentWordTimings),
    [job?.segments],
  );

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
    setIsPlaying(false);
    setShowTranslation(true);
    setShowPhonetic(false);
    setIsLooping(false);
    isLoopingRef.current = false;
    setPlaybackRate(1);
    setIsPlaybackRateOpen(false);
    if (mediaRef.current) {
      mediaRef.current.loop = false;
      mediaRef.current.playbackRate = 1;
    }
    youtubePlayerRef.current?.setPlaybackRate(1);
  }, [job?.id]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    const media = mediaRef.current;
    if (media) media.playbackRate = playbackRate;
    youtubePlayerRef.current?.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    if (!isPlaybackRateOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!playbackSpeedRef.current?.contains(event.target as Node)) {
        setIsPlaybackRateOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPlaybackRateOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isPlaybackRateOpen]);

  function stopSyncLoop() {
    if (syncRafRef.current != null) {
      window.cancelAnimationFrame(syncRafRef.current);
      syncRafRef.current = null;
    }
  }

  function startSyncLoop() {
    stopSyncLoop();
    const tick = () => {
      const youtubePlayer = youtubePlayerRef.current;
      const media = mediaRef.current;
      if (youtubePlayer) {
        setCurrentTime(youtubePlayer.getCurrentTime() || 0);
      } else if (media) {
        setCurrentTime(media.currentTime || 0);
      }
      syncRafRef.current = window.requestAnimationFrame(tick);
    };
    syncRafRef.current = window.requestAnimationFrame(tick);
  }

  function attachMediaElement(
    element: HTMLVideoElement | HTMLAudioElement | null,
  ) {
    mediaRef.current = element;
    if (!element) return;

    element.loop = isLooping;
    element.playbackRate = playbackRate;
    if (!autoPlayRequestedRef.current) return;

    autoPlayRequestedRef.current = false;
    element.currentTime = 0;
    void element.play().catch(() => {
      setIsPlaying(false);
    });
  }

  function pausePlayback() {
    youtubePlayerRef.current?.pauseVideo();
    mediaRef.current?.pause();
    setIsPlaying(false);
    stopSyncLoop();
  }

  async function lookupWordDetail(context: VideoWordLookupContext) {
    const requestId = wordLookupRequestRef.current + 1;
    wordLookupRequestRef.current = requestId;
    setWordLookupContext(context);
    setWordDetail(null);
    setWordDetailError('');
    setWordDetailLoading(true);

    try {
      const detail = await api.lookupVocabularyWord(context);
      if (wordLookupRequestRef.current === requestId) setWordDetail(detail);
    } catch (lookupError) {
      if (wordLookupRequestRef.current !== requestId) return;
      setWordDetailError(
        lookupError instanceof ApiError
          ? lookupError.message
          : 'Không thể tra cứu từ này. Vui lòng thử lại.',
      );
    } finally {
      if (wordLookupRequestRef.current === requestId) {
        setWordDetailLoading(false);
      }
    }
  }

  function openWordDetail(value: string, segment: VideoTranslateSegment) {
    const word = cleanVocabularyToken(value);
    if (!word) return;
    pausePlayback();
    void lookupWordDetail({
      word,
      sentence: segment.en,
      sentenceTranslation: segment.vi,
    });
  }

  function closeWordDetail() {
    wordLookupRequestRef.current += 1;
    setWordLookupContext(null);
    setWordDetail(null);
    setWordDetailError('');
    setWordDetailLoading(false);
    setWordDetailSaving(false);
  }

  function retryWordLookup() {
    if (wordLookupContext) void lookupWordDetail(wordLookupContext);
  }

  function lookupRelatedWord(word: string) {
    if (!wordLookupContext) return;
    void lookupWordDetail({ ...wordLookupContext, word });
  }

  async function saveWordDetail() {
    if (!wordDetail || wordDetail.progress || wordDetailSaving) return;
    if (!user) {
      void navigate('/dang-nhap', { state: { from: '/dich-video' } });
      return;
    }

    setWordDetailSaving(true);
    try {
      const progress = await api.learnVocabularyWord(wordDetail.id);
      setWordDetail((current) =>
        current ? { ...current, progress } : current,
      );
    } catch (saveError) {
      setWordDetailError(
        saveError instanceof ApiError
          ? saveError.message
          : 'Không thể lưu từ vựng lúc này.',
      );
    } finally {
      setWordDetailSaving(false);
    }
  }

  function handleMediaPlay() {
    setIsPlaying(true);
    startSyncLoop();
  }

  function handleMediaPause() {
    setIsPlaying(false);
    stopSyncLoop();
  }

  function handleMediaEnded() {
    setIsPlaying(false);
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

  async function toggleLoop() {
    const next = !isLooping;
    setIsLooping(next);
    isLoopingRef.current = next;
    const youtubePlayer = youtubePlayerRef.current;
    if (youtubePlayer) {
      if (next && !isPlaying) youtubePlayer.playVideo();
      return;
    }
    const media = mediaRef.current;
    if (!media) return;

    media.loop = next;
    if (next && media.paused) {
      try {
        await media.play();
      } catch {
        setIsPlaying(false);
      }
    }
  }

  function selectPlaybackRate(rate: PlaybackRate) {
    setPlaybackRate(rate);
    setIsPlaybackRateOpen(false);
    youtubePlayerRef.current?.setPlaybackRate(rate);
    if (mediaRef.current) mediaRef.current.playbackRate = rate;
  }

  useEffect(() => {
    resetShadowing();
    setShadowingResultIndex(null);
    setPhoneticTexts([]);
    wordLookupRequestRef.current += 1;
    setWordLookupContext(null);
    setWordDetail(null);
    setWordDetailError('');
    setWordDetailLoading(false);
    setWordDetailSaving(false);
  }, [job?.id, resetShadowing]);

  useEffect(() => {
    if (
      !job ||
      job.status !== 'READY' ||
      !job.segments.length ||
      !showPhonetic
    ) {
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
  }, [job?.id, job?.status, job?.segments, showPhonetic]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const requestedJobPromise =
          requestedJobId && !routedJob
            ? api.getVideoTranslateJob(requestedJobId)
            : Promise.resolve(null);
        const [nextQuota, list, requestedJob] = await Promise.all([
          api.getVideoTranslateQuota(),
          api.listVideoTranslateJobs(),
          requestedJobPromise,
        ]);
        if (cancelled) return;
        const deletedIds = getDeletedRecentVideoIds();
        setQuota(requestedJob?.quota ?? nextQuota);
        if (requestedJob) setJob(requestedJob.job);
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
    if (loading || !autoSubmitUrlRef.current) return;

    const pendingUrl = autoSubmitUrlRef.current;
    autoSubmitUrlRef.current = null;
    navigate('/dich-video?mode=url', { replace: true });
    void submitUrl(pendingUrl);
  }, [loading, navigate]);

  useEffect(() => {
    if (!job || (job.status !== 'PENDING' && job.status !== 'PROCESSING')) {
      return;
    }
    const timer = window.setInterval(() => {
      void api
        .getVideoTranslateJob(job.id)
        .then((result) => {
          if (result.job.status === 'READY') {
            openJob(result.job);
          } else {
            setJob(result.job);
          }
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
    }, 1000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  useEffect(() => {
    const youtubeVideoId = job?.youtubeVideoId;
    if (!youtubeVideoId || job.status !== 'READY') return;

    let disposed = false;
    let player: YoutubePlayer | null = null;

    void loadYoutubeApi()
      .then(() => {
        const mount = youtubePlayerMountRef.current;
        if (disposed || !mount || !window.YT) return;

        player = new window.YT.Player(mount, {
          videoId: youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              if (disposed) return;
              youtubePlayerRef.current = event.target;
              event.target.unMute();
              event.target.setPlaybackRate(playbackRate);
              if (autoPlayRequestedRef.current) {
                autoPlayRequestedRef.current = false;
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              const states = window.YT?.PlayerState;
              if (!states) return;
              if (event.data === states.PLAYING) {
                setIsPlaying(true);
                startSyncLoop();
                return;
              }
              if (event.data === states.ENDED && isLoopingRef.current) {
                event.target.seekTo(0, true);
                event.target.playVideo();
                return;
              }
              if (event.data === states.PAUSED || event.data === states.ENDED) {
                setIsPlaying(false);
                stopSyncLoop();
              }
            },
            onError: () => {
              setIsPlaying(false);
              stopSyncLoop();
              setError(
                'Video này không cho phép phát nhúng. Hãy mở một video YouTube khác.',
              );
            },
          },
        });
        youtubePlayerRef.current = player;
      })
      .catch((err: unknown) => {
        if (!disposed) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không tải được trình phát YouTube',
          );
        }
      });

    return () => {
      disposed = true;
      stopSyncLoop();
      player?.destroy();
      if (youtubePlayerRef.current === player) {
        youtubePlayerRef.current = null;
      }
    };
  }, [job?.id, job?.status, job?.youtubeVideoId]);

  useEffect(() => () => stopSyncLoop(), []);

  function goToUpgrade() {
    void navigate('/nang-cap', {
      state: {
        from: '/dich-video',
        message:
          'Bạn đã hết 3 video miễn phí hôm nay. Nâng cấp Premium để dịch không giới hạn.',
      },
    });
  }

  async function submitUrl(urlOverride?: string) {
    const nextUrl = (urlOverride ?? url).trim();
    if (!nextUrl) {
      setError('Hãy dán link YouTube');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await api.createVideoTranslateJob(nextUrl);
      if (result.job.status === 'READY') {
        openJob(result.job);
      } else {
        setJob(result.job);
      }
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
      const result = await api.createVideoTranslateJobFromUpload(selectedFile);
      if (result.job.status === 'READY') {
        openJob(result.job);
      } else {
        setJob(result.job);
      }
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
    autoPlayRequestedRef.current = true;
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
    const youtubePlayer = youtubePlayerRef.current;
    if (youtubePlayer) {
      youtubePlayer.seekTo(seg.start, true);
      youtubePlayer.setPlaybackRate(playbackRate);
      youtubePlayer.playVideo();
      setCurrentTime(seg.start);
      startSyncLoop();
      return;
    }
    const media = mediaRef.current;
    if (media) {
      media.currentTime = seg.start;
      media.playbackRate = playbackRate;
      void media.play();
    }
    setCurrentTime(seg.start);
    startSyncLoop();
  }

  const processing = job?.status === 'PENDING' || job?.status === 'PROCESSING';
  const ready = job?.status === 'READY';
  const mediaIsAudio = isAudioMediaUrl(job?.mediaUrl);
  const visibleRecent = showAllRecent ? recent : recent.slice(0, 2);

  if (!ready) {
    return (
      <MobileLayout showNav={false}>
        <div className="min-h-[100dvh] bg-white px-4 pb-32 pt-3 text-[#081333] dark:bg-neutral-950 dark:text-white">
          <header className="relative flex h-12 items-center justify-center">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  void navigate(-1);
                  return;
                }
                void navigate('/');
              }}
              className="absolute left-0 inline-flex h-10 w-10 items-center justify-center text-[#081333] dark:text-white"
              aria-label="Quay lại"
            >
              <ArrowLeft size={25} strokeWidth={2.25} />
            </button>
            <h1 className="text-[22px] font-extrabold leading-none">
              Dịch video
            </h1>
          </header>

          <div className="mt-4 grid h-12 grid-cols-2 rounded-full border border-slate-200 bg-white p-1 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-neutral-700 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => {
                setSourceMode('url');
                setError('');
              }}
              className={`rounded-full text-sm font-bold outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#8b7cf6]/40 ${
                sourceMode === 'url'
                  ? 'bg-[#6264ef] text-white shadow-[0_7px_16px_rgba(98,100,239,0.28)]'
                  : 'text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white'
              }`}
            >
              Link video
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceMode('upload');
                setError('');
              }}
              className={`rounded-full text-sm font-bold outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#8b7cf6]/40 ${
                sourceMode === 'upload'
                  ? 'bg-[#6264ef] text-white shadow-[0_7px_16px_rgba(98,100,239,0.28)]'
                  : 'text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white'
              }`}
            >
              Tải video
            </button>
          </div>

          <section className="mt-6">
            <h2 className="text-[19px] font-extrabold">
              {sourceMode === 'url' ? 'Dán link video' : 'Tải video lên'}
            </h2>

            <div className="mt-3 rounded-2xl border border-[#ebe8f7] bg-white p-4 shadow-[0_8px_28px_rgba(73,53,152,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
              {sourceMode === 'url' ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0ebff] text-[#5b2cf4] dark:bg-[#29213f]">
                      <Link2 size={22} strokeWidth={2.5} />
                    </span>
                    <p className="text-[13px] leading-5 text-slate-500 dark:text-neutral-300">
                      Dán liên kết Youtube
                    </p>
                  </div>
                  <div className="mt-4 flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[#6736f5] dark:border-neutral-700 dark:bg-neutral-950">
                    <label htmlFor="youtube-url" className="sr-only">
                      Dán link video
                    </label>
                    <div className="relative min-w-0 flex-1">
                      <Link2
                        size={18}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="youtube-url"
                        type="url"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        value={url}
                        disabled={submitting || processing}
                        onChange={(event) => {
                          setUrl(event.target.value);
                          setError('');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void submitUrl();
                        }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="h-full w-full bg-transparent pl-10 pr-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={submitting || processing || !url.trim()}
                      onClick={() => void submitUrl()}
                      className="m-1 min-w-[104px] rounded-lg bg-gradient-to-r from-[#632ef4] to-[#4b25ef] px-4 text-sm font-bold text-white transition-opacity disabled:opacity-50"
                    >
                      {submitting || processing ? (
                        <Loader2 className="mx-auto animate-spin" size={18} />
                      ) : (
                        'Dịch ngay'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0ebff] text-[#5b2cf4] dark:bg-[#29213f]">
                      <Upload size={22} strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#101a39] dark:text-white">
                        Chọn video từ thiết bị
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500 dark:text-neutral-400">
                        MP4, WebM, MOV, MP3, M4A, WAV · tối đa 120MB
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_MEDIA}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedFile(file);
                      if (file) setUrl('');
                      setError('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-dashed border-[#8b72e7] bg-[#f8f6ff] px-4 text-sm font-semibold text-[#5b2cf4] dark:bg-[#211b34]"
                  >
                    <span className="max-w-full truncate">
                      {selectedFile?.name ?? 'Chọn file video hoặc audio'}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting || processing || !selectedFile}
                    onClick={() => void submitUpload()}
                    className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#632ef4] to-[#4b25ef] text-sm font-bold text-white disabled:opacity-50"
                  >
                    {submitting || processing ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Languages size={18} />
                    )}
                    Dịch ngay
                  </button>
                </>
              )}

              {quota && (
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  {quota.isPremium
                    ? 'Premium · không giới hạn số video'
                    : `Còn ${quota.remaining ?? 0}/${quota.limit} lượt hôm nay · tối đa ${Math.floor(quota.maxSeconds / 60)} phút/video`}
                </p>
              )}
            </div>
          </section>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {processing && (
            <div className="mt-4 rounded-2xl border border-[#ebe8f7] bg-[#faf9ff] p-5 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <Loader2
                className="mx-auto animate-spin text-[#5b2cf4]"
                size={27}
              />
              <p className="mt-2 text-sm font-bold">Đang xử lý video</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-neutral-400">
                AI đang nhận dạng nội dung và tạo phụ đề tiếng Việt. Bạn có thể
                chờ tại đây.
              </p>
            </div>
          )}

          <div
            className="my-6 flex items-center gap-4 text-sm text-slate-500"
            aria-hidden
          >
            <span className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
            <span>Hoặc</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
          </div>

          <section ref={recentSectionRef} className="scroll-mt-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[19px] font-extrabold">Video gần đây</h2>
              {recent.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecent((value) => !value)}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#5b2cf4]"
                >
                  {showAllRecent ? 'Thu gọn' : 'Xem tất cả'}
                  <ChevronRight
                    size={17}
                    className={
                      showAllRecent ? 'rotate-90 transition-transform' : ''
                    }
                  />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-[#5b2cf4]" size={26} />
              </div>
            ) : visibleRecent.length > 0 ? (
              <div className="mt-3 space-y-3">
                {visibleRecent.map((item) => (
                  <article
                    key={item.id}
                    className="relative flex min-h-[104px] cursor-pointer gap-3 rounded-2xl border border-[#eeebf6] bg-white p-2.5 pr-9 shadow-[0_6px_20px_rgba(37,31,82,0.05)] dark:border-neutral-800 dark:bg-neutral-900"
                    onClick={() => openJob(item)}
                  >
                    <div className="relative h-[84px] w-[132px] shrink-0 overflow-hidden rounded-xl bg-[#eeeaff]">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : item.mediaUrl && !isAudioMediaUrl(item.mediaUrl) ? (
                        <video
                          src={`${item.mediaUrl}#t=0.1`}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src="/images/video-translate/video-translate-hero.png"
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white">
                          <Play
                            size={15}
                            className="ml-0.5"
                            fill="currentColor"
                          />
                        </span>
                      </span>
                      <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.durationSec
                          ? formatTime(item.durationSec)
                          : '--:--'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <h3 className="line-clamp-2 text-sm font-extrabold leading-5 text-[#101a39] dark:text-white">
                        {item.title || item.originalFilename || 'Video đã dịch'}
                      </h3>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                        {item.youtubeVideoId ? 'YouTube' : 'Tải lên'} ·{' '}
                        {item.durationSec
                          ? formatTime(item.durationSec)
                          : '--:--'}{' '}
                        · {formatRecentDate(item.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Tùy chọn video"
                      onClick={(event) => {
                        event.stopPropagation();
                        setRecentMenuId((value) =>
                          value === item.id ? null : item.id,
                        );
                      }}
                      className="absolute right-1.5 top-2 inline-flex h-8 w-8 items-center justify-center text-slate-500"
                    >
                      <MoreVertical size={19} />
                    </button>
                    {recentMenuId === item.id && (
                      <div className="absolute right-2 top-10 z-20 rounded-lg border border-slate-100 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRecentMenuId(null);
                            void deleteRecentJob(item);
                          }}
                          className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 size={15} />
                          Xóa video
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-[#ddd7f3] px-5 py-8 text-center dark:border-neutral-800">
                <Clapperboard className="mx-auto text-[#8065df]" size={25} />
                <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-neutral-300">
                  Video đã dịch sẽ xuất hiện tại đây
                </p>
              </div>
            )}
          </section>

          <aside className="mt-6 flex items-center gap-3 rounded-2xl border border-[#eee9ff] bg-[#faf9ff] p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eee9ff] text-[#5b2cf4] dark:bg-[#29213f]">
              <Lightbulb size={22} />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">Mẹo nhỏ</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-neutral-400">
                Video có phụ đề gốc sẽ cho kết quả dịch chính xác hơn.
              </p>
            </div>
          </aside>
        </div>
        <BottomNav />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={false}>
      <div
        className={
          ready
            ? 'px-4 pt-3 flex flex-col h-[100dvh]'
            : 'px-4 pt-4 pb-8 space-y-4'
        }
      >
        <div
          className={`flex items-center gap-3 ${ready ? 'shrink-0 mb-2' : ''}`}
        >
          <button
            type="button"
            onClick={() => {
              if (ready) {
                setJob(null);
                setUrl('');
                setSelectedFile(null);
                setError('');
                setCurrentTime(0);
                prevActiveIndexRef.current = -1;
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
              }
              if (window.history.length > 1) {
                void navigate(-1);
                return;
              }
              void navigate('/');
            }}
            className="text-gray-600 p-1 -ml-1"
            aria-label="Quay lại"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            {!ready && (
              <h1 className="text-xl font-bold text-gray-900">Dịch video</h1>
            )}
          </div>
          {ready && job ? (
            <button
              type="button"
              onClick={() => {
                setJob(null);
                setUrl('');
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
                <label
                  htmlFor="youtube-url"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Dán link YouTube
                </label>
                <div className="relative">
                  <Link2
                    size={17}
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="youtube-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={url}
                    disabled={submitting || processing}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setError('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void submitUrl();
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  disabled={submitting || processing || !url.trim()}
                  onClick={() => void submitUrl()}
                  className="w-full rounded-full bg-gradient-to-r from-primary to-secondary py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ||
                  (processing && Boolean(job?.youtubeVideoId)) ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Languages size={16} />
                  )}
                  {processing && job?.youtubeVideoId
                    ? 'Đang tạo phụ đề…'
                    : 'Tạo phụ đề'}
                </button>

                <div className="flex items-center gap-3 py-1" aria-hidden>
                  <span className="h-px flex-1 bg-gray-100 dark:bg-neutral-800" />
                  <span className="text-[11px] text-gray-400">
                    hoặc tải lên
                  </span>
                  <span className="h-px flex-1 bg-gray-100 dark:bg-neutral-800" />
                </div>

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
                    if (file) setUrl('');
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
                <Loader2
                  className="animate-spin text-primary mx-auto"
                  size={28}
                />
                <p className="font-semibold text-gray-900 dark:text-white">
                  Đang xử lý video
                </p>
                <p className="text-xs text-gray-500">
                  {job?.youtubeVideoId
                    ? 'Đang lấy lời thoại YouTube và dịch sang tiếng Việt…'
                    : 'Nhận dạng tiếng Anh (Whisper) rồi dịch sang tiếng Việt…'}
                </p>
              </div>
            )}

            {ready && job && (job.youtubeVideoId || job.mediaUrl) && (
              <>
                <div className="shrink-0 space-y-2 bg-white dark:bg-neutral-950 z-10">
                  <div
                    className={`rounded-2xl overflow-hidden bg-black ${
                      mediaIsAudio
                        ? 'aspect-[16/7] flex items-center justify-center'
                        : 'aspect-video'
                    }`}
                  >
                    {job.youtubeVideoId ? (
                      <div
                        key={job.id}
                        ref={youtubePlayerMountRef}
                        className="h-full w-full"
                      />
                    ) : mediaIsAudio ? (
                      <audio
                        key={job.id}
                        ref={attachMediaElement}
                        src={job.mediaUrl ?? undefined}
                        autoPlay={autoPlayRequestedRef.current}
                        controls
                        loop={isLooping}
                        className="w-full px-3"
                        onPlay={handleMediaPlay}
                        onPause={handleMediaPause}
                        onEnded={handleMediaEnded}
                        onTimeUpdate={(e) =>
                          setCurrentTime(e.currentTarget.currentTime || 0)
                        }
                      />
                    ) : (
                      <video
                        key={job.id}
                        ref={attachMediaElement}
                        src={job.mediaUrl ?? undefined}
                        autoPlay={autoPlayRequestedRef.current}
                        controls
                        loop={isLooping}
                        playsInline
                        className="w-full h-full object-contain bg-black"
                        onPlay={handleMediaPlay}
                        onPause={handleMediaPause}
                        onEnded={handleMediaEnded}
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
                    {job.title ||
                      job.originalFilename ||
                      (job.youtubeVideoId
                        ? 'YouTube video'
                        : 'Video đã tải lên')}
                  </p>
                </div>

                <div
                  ref={transcriptListRef}
                  className="mt-2 flex-1 min-h-0 overflow-y-auto overscroll-contain px-0.5"
                >
                  <div className="space-y-3 pb-44">
                    {job.segments.map((seg, idx) => {
                      const active = idx === activeIndex;
                      const showScore =
                        shadowingResultIndex === idx &&
                        !!shadowingResult?.words?.length;
                      const phoneticText = phoneticTexts[idx] ?? '';
                      const timedWords = wordTimingsBySegment[idx] ?? [];
                      const activeWordIndex =
                        active
                          ? findActiveWordIndex(
                              timedWords,
                              currentTime,
                              playbackRate,
                              seg.end,
                            )
                          : -1;
                      return (
                        <div
                          key={`${seg.start}-${idx}`}
                          ref={(el) => {
                            segmentRefs.current[idx] = el;
                          }}
                          role="group"
                          aria-label={`Phát phụ đề từ ${formatTime(seg.start)}`}
                          tabIndex={0}
                          onClick={() => seekToSegment(seg)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              seekToSegment(seg);
                            }
                          }}
                          className={`relative w-full text-left p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-out ${
                            active
                              ? 'bg-primary/5 border-gray-100 dark:bg-primary/10 dark:border-neutral-800'
                              : 'bg-transparent border-transparent'
                          }`}
                        >
                          <div className="min-w-0 pr-7">
                            {showScore ? (
                              <p className="text-sm font-semibold leading-relaxed flex flex-wrap gap-x-1 gap-y-0.5">
                                {shadowingResult.words.map(
                                  (word, wordIndex) => {
                                    const displayWord =
                                      seg.en.split(/\s+/)[wordIndex] ??
                                      word.word;
                                    return (
                                      <button
                                        key={`${word.word}-${wordIndex}`}
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openWordDetail(displayWord, seg);
                                        }}
                                        aria-label={`Xem chi tiết từ ${cleanVocabularyToken(displayWord)}`}
                                        aria-current={
                                          wordIndex === activeWordIndex
                                            ? 'true'
                                            : undefined
                                        }
                                        className={`${
                                          word.correct
                                            ? 'text-emerald-600'
                                            : 'text-red-500'
                                        } ${wordBorderClass(wordIndex === activeWordIndex)} cursor-pointer focus-visible:outline-2 focus-visible:outline-primary`}
                                      >
                                        {displayWord}
                                      </button>
                                    );
                                  },
                                )}
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed flex flex-wrap gap-x-1 gap-y-0.5">
                                {timedWords.map((word, wordIndex) => (
                                  <button
                                    key={`${word.start}-${word.text}-${wordIndex}`}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openWordDetail(word.text, seg);
                                    }}
                                    aria-label={`Xem chi tiết từ ${cleanVocabularyToken(word.text)}`}
                                    aria-current={
                                      wordIndex === activeWordIndex
                                        ? 'true'
                                        : undefined
                                    }
                                    className={`${wordBorderClass(
                                      wordIndex === activeWordIndex,
                                    )} cursor-pointer focus-visible:outline-2 focus-visible:outline-primary`}
                                  >
                                    {word.text}
                                  </button>
                                ))}
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

                            {showPhonetic && phoneticText && (
                              <p className="text-xs text-primary mt-1.5 italic leading-relaxed">
                                {phoneticText}
                              </p>
                            )}
                            {showTranslation && (
                              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                                {seg.vi}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-300 mt-2 tabular-nums">
                              {formatTime(seg.start)} – {formatTime(seg.end)}
                            </p>
                          </div>
                          {active && (
                            <span
                              className={`audio-eq absolute right-4 top-4 text-primary ${
                                isPlaying ? 'audio-eq-playing' : ''
                              }`}
                              aria-hidden
                            >
                              <span />
                              <span />
                              <span />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {wordLookupContext && (
                  <LessonWordDetailSheet
                    detail={wordDetail}
                    error={wordDetailError}
                    loading={wordDetailLoading}
                    saving={wordDetailSaving}
                    onClose={closeWordDetail}
                    onRetry={retryWordLookup}
                    onSave={() => void saveWordDetail()}
                    onSpeak={speakVocabularyText}
                    onLookupRelated={lookupRelatedWord}
                  />
                )}

                <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
                  <div className="mx-auto max-w-lg px-3 py-2.5">
                    <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_minmax(4.75rem,1.15fr)] items-stretch overflow-visible rounded-2xl bg-slate-50 p-1.5 shadow-sm dark:bg-neutral-950">
                      <div ref={playbackSpeedRef} className="relative min-w-0">
                        <button
                          type="button"
                          data-testid="video-speed-toggle"
                          onClick={() => setIsPlaybackRateOpen((open) => !open)}
                          aria-label="Tùy chỉnh tốc độ phát"
                          aria-haspopup="menu"
                          aria-expanded={isPlaybackRateOpen}
                          className={`flex h-[4.75rem] w-full flex-col items-center justify-center gap-0.5 transition-colors ${
                            isPlaybackRateOpen || playbackRate !== 1
                              ? 'text-primary'
                              : 'text-gray-400'
                          }`}
                        >
                          <Gauge
                            size={21}
                            strokeWidth={
                              isPlaybackRateOpen || playbackRate !== 1 ? 2.5 : 2
                            }
                          />
                          <span className="text-[10px] font-semibold tabular-nums leading-none">
                            {formatPlaybackRate(playbackRate)}
                          </span>
                          <span className="mt-1 text-[10px] font-medium leading-none">
                            Tốc độ
                          </span>
                        </button>

                        {isPlaybackRateOpen && (
                          <div
                            role="menu"
                            aria-label="Tốc độ phát"
                            className="absolute bottom-full left-0 mb-2 grid w-[min(20rem,calc(100vw-2rem))] grid-cols-5 gap-1 rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
                          >
                            {PLAYBACK_RATES.map((rate) => {
                              const selected = playbackRate === rate;
                              return (
                                <button
                                  key={rate}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={selected}
                                  onClick={() => selectPlaybackRate(rate)}
                                  className={`h-9 rounded-md text-xs font-semibold tabular-nums transition-colors ${
                                    selected
                                      ? 'bg-primary text-white'
                                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800'
                                  }`}
                                >
                                  {formatPlaybackRate(rate)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {[
                        {
                          icon: Languages,
                          label: 'Dịch',
                          testId: 'video-translation-toggle',
                          active: showTranslation,
                          action: () => setShowTranslation((prev) => !prev),
                        },
                        {
                          icon: BookOpen,
                          label: 'Phiên âm',
                          testId: 'video-phonetic-toggle',
                          active: showPhonetic,
                          action: () => setShowPhonetic((prev) => !prev),
                        },
                        {
                          icon: Repeat,
                          label: 'Lặp lại',
                          testId: 'video-loop-toggle',
                          active: isLooping,
                          action: () => void toggleLoop(),
                        },
                      ].map(({ icon: Icon, label, testId, action, active }) => (
                        <button
                          key={label}
                          type="button"
                          data-testid={testId}
                          onClick={action}
                          aria-pressed={active}
                          className={`flex h-[4.75rem] min-w-0 flex-col items-center justify-center gap-1 px-1 transition-colors ${
                            active ? 'text-primary' : 'text-gray-400'
                          }`}
                        >
                          <Icon size={21} strokeWidth={active ? 2.5 : 2} />
                          <span className="max-w-full text-[10px] font-medium leading-tight">
                            {label}
                          </span>
                        </button>
                      ))}

                      <button
                        type="button"
                        data-testid="video-shadowing-toggle"
                        onClick={handleShadowingToggle}
                        disabled={isFetching || !activeSegment?.en}
                        aria-label={
                          isFetching
                            ? 'Đang chấm điểm'
                            : isRecording
                              ? 'Dừng Shadowing'
                              : 'Bắt đầu Shadowing'
                        }
                        className={`m-1 flex h-[4.25rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-white transition-all disabled:opacity-60 ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 ring-2 ring-red-300 ring-offset-2'
                            : isFetching
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-primary to-secondary hover:opacity-95 shadow-md shadow-primary/25'
                        }`}
                      >
                        {isFetching ? (
                          <Loader2 size={20} className="animate-spin" aria-hidden />
                        ) : (
                          <>
                            <Mic size={24} />
                            <span className="text-[11px] font-semibold leading-none">
                              {isRecording ? 'Dừng' : 'Nói'}
                            </span>
                          </>
                        )}
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
                          {item.title ||
                            item.originalFilename ||
                            (item.youtubeVideoId
                              ? 'YouTube video'
                              : 'Video đã tải lên')}
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
