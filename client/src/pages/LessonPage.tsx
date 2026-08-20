import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Gauge,
  Play,
  Pause,
  Maximize,
  Languages,
  Repeat,
  Bookmark,
  Mic,
  Lock,
  Crown,
} from 'lucide-react';
import LessonWordDetailSheet from '../components/LessonWordDetailSheet';
import { useAuth } from '../contexts/AuthContext';
import {
  findActiveSentenceIndex,
  formatTime,
  getLessonById,
  type LessonSentence,
  type LessonWordTiming,
} from '../data/lessons';
import { useHistory } from '../contexts/HistoryContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useCanAccessLesson } from '../contexts/LessonAccessContext';
import { useShadowing } from '../hooks/useShadowing';
import { ApiError, api, type VocabularyLookupDetail } from '../lib/api';
import { resolveLessonPhonetics } from '../lib/phonetic';
import { speakEnglishText } from '../lib/speech';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const;
const VIDEO_CONTROLS_VISIBLE_MS = 2000;
type PlaybackRate = (typeof PLAYBACK_RATES)[number];

type LessonWordLookupContext = {
  word: string;
  sentence: string;
  sentenceTranslation: string;
};

function cleanVocabularyToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[^a-z'-]+|[^a-z'-]+$/g, '');
}

function estimateLessonWordTimings(
  sentence: LessonSentence,
): LessonWordTiming[] {
  const words = sentence.english.split(/\s+/).filter(Boolean);
  const weights = words.map((word) =>
    Math.max(1, word.replace(/[^a-z0-9]+/gi, '').length),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const duration = Math.max(0.12, sentence.time_end - sentence.time_start);
  let cursor = sentence.time_start;

  return words.map((text, index) => {
    const end =
      index === words.length - 1
        ? sentence.time_end
        : cursor + (duration * weights[index]) / totalWeight;
    const timing = { text, start: cursor, end };
    cursor = end;
    return timing;
  });
}

function resolveLessonWordTimings(
  sentence: LessonSentence,
): LessonWordTiming[] {
  const displayWords = sentence.english.split(/\s+/).filter(Boolean);
  const alignedWords = sentence.words;
  const hasUsableAlignment =
    alignedWords?.length === displayWords.length &&
    alignedWords.every(
      (word, index) =>
        Number.isFinite(word.start) &&
        Number.isFinite(word.end) &&
        word.end >= word.start &&
        cleanVocabularyToken(word.text) ===
          cleanVocabularyToken(displayWords[index]),
    );

  if (!hasUsableAlignment || !alignedWords) {
    return estimateLessonWordTimings(sentence);
  }

  return alignedWords.map((word, index) => ({
    ...word,
    text: displayWords[index],
  }));
}

function findActiveWordIndex(words: LessonWordTiming[], time: number) {
  let active = -1;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (time + 0.04 < word.start) break;
    const nextStart = words[index + 1]?.start ?? word.end;
    const visibleEnd = Math.max(
      word.end,
      Math.min(nextStart, word.start + 0.12),
    );
    if (time <= visibleEnd + 0.04) active = index;
  }
  return active;
}

function wordBorderClass(active: boolean) {
  return `inline-block rounded-[5px] border px-0.5 py-px transition-colors duration-75 ${
    active ? 'border-emerald-400 bg-emerald-400/10' : 'border-transparent'
  }`;
}

function formatPlaybackRate(rate: PlaybackRate) {
  return `${rate === 1 ? '1.0' : rate}x`;
}

function formatSentenceEndTime(sentence: LessonSentence) {
  const displayEnd =
    Math.floor(sentence.time_end) === Math.floor(sentence.time_start)
      ? Math.ceil(sentence.time_end)
      : sentence.time_end;
  return formatTime(displayEnd);
}

function speakSentence(text: string, playbackRate: PlaybackRate) {
  speakEnglishText(text, playbackRate);
}

/** Cố định câu active ở đầu vùng transcript — chừa vài px để không cắt border trên */
const ACTIVE_SENTENCE_SLOT_TOP = 6;
const TRANSCRIPT_SCROLL_DURATION_MS = 360;

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function scrollSentenceIntoView(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
): () => void {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const offsetTop = elementRect.top - containerRect.top + container.scrollTop;
  const targetTop = offsetTop - ACTIVE_SENTENCE_SLOT_TOP;
  const maxScroll = Math.max(
    0,
    container.scrollHeight - container.clientHeight,
  );
  const clampedTargetTop = Math.min(maxScroll, Math.max(0, targetTop));

  if (behavior !== 'smooth') {
    container.scrollTo({ top: clampedTargetTop, behavior: 'auto' });
    return () => undefined;
  }

  const startTop = container.scrollTop;
  const distance = clampedTargetTop - startTop;
  if (Math.abs(distance) < 1) return () => undefined;

  const startedAt = performance.now();
  let animationFrame = 0;

  const animate = (now: number) => {
    const progress = Math.min(
      (now - startedAt) / TRANSCRIPT_SCROLL_DURATION_MS,
      1,
    );
    container.scrollTop = startTop + distance * easeInOutCubic(progress);

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate);
    }
  };

  animationFrame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationFrame);
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const lesson = useMemo(() => (id ? getLessonById(id) : undefined), [id]);
  const {
    canAccess,
    locked,
    loading: accessLoading,
  } = useCanAccessLesson(id ?? '');
  const lessonNavigationState = location.state as {
    autoPlay?: boolean;
    returnTo?: string;
  } | null;
  const autoPlayOnOpen = lessonNavigationState?.autoPlay !== false;
  const returnTo = lessonNavigationState?.returnTo;
  const { updateListeningProgress, markLessonCompleted } = useHistory();
  const { isFavorite, toggleFavorite } = useFavorites();
  const lessonSaved = lesson ? isFavorite(lesson.id) : false;
  const {
    result: shadowingResult,
    error: shadowingError,
    isRecording,
    isFetching,
    toggleRecording,
    reset: resetShadowing,
  } = useShadowing();
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoSurfaceRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const lastProgressSaveRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const playbackSpeedRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevActiveIndexRef = useRef(-1);
  const wordLookupRequestRef = useRef(0);
  const videoControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlaybackEnded, setHasPlaybackEnded] = useState(false);
  const [isVideoControlsVisible, setIsVideoControlsVisible] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [isPlaybackRateOpen, setIsPlaybackRateOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(lesson?.duration ?? 0);
  const [shadowingResultIndex, setShadowingResultIndex] = useState<
    number | null
  >(null);
  const [phoneticTexts, setPhoneticTexts] = useState<string[]>([]);
  const [wordLookupContext, setWordLookupContext] =
    useState<LessonWordLookupContext | null>(null);
  const [wordDetail, setWordDetail] = useState<VocabularyLookupDetail | null>(
    null,
  );
  const [wordDetailLoading, setWordDetailLoading] = useState(false);
  const [wordDetailError, setWordDetailError] = useState('');
  const [wordDetailSaving, setWordDetailSaving] = useState(false);
  const wordTimingsBySentence = useMemo(
    () => (lesson?.sentences ?? []).map(resolveLessonWordTimings),
    [lesson?.sentences],
  );

  const clearVideoControlsTimer = useCallback(() => {
    if (videoControlsTimerRef.current === null) return;
    window.clearTimeout(videoControlsTimerRef.current);
    videoControlsTimerRef.current = null;
  }, []);

  const showVideoControlsTemporarily = useCallback(() => {
    clearVideoControlsTimer();
    setIsVideoControlsVisible(true);
    videoControlsTimerRef.current = window.setTimeout(() => {
      setIsVideoControlsVisible(false);
      videoControlsTimerRef.current = null;
    }, VIDEO_CONTROLS_VISIBLE_MS);
  }, [clearVideoControlsTimer]);

  const hideVideoControls = useCallback(() => {
    clearVideoControlsTimer();
    setIsVideoControlsVisible(false);
  }, [clearVideoControlsTimer]);

  const resetPlaybackToStart = useCallback((audio: HTMLAudioElement) => {
    prevActiveIndexRef.current = -1;
    if (transcriptRef.current) transcriptRef.current.scrollTop = 0;
    audio.currentTime = 0;
    setCurrentTime(0);
    setActiveIndex(0);
    setHasPlaybackEnded(false);
  }, []);

  const toggleVideoControls = useCallback(() => {
    if (isVideoControlsVisible) {
      hideVideoControls();
      return;
    }
    showVideoControlsTemporarily();
  }, [hideVideoControls, isVideoControlsVisible, showVideoControlsTemporarily]);

  useEffect(() => {
    showVideoControlsTemporarily();
    return clearVideoControlsTimer;
  }, [lesson?.id, showVideoControlsTemporarily, clearVideoControlsTimer]);

  useEffect(() => {
    resetShadowing();
    setShadowingResultIndex(null);
  }, [lesson?.id, resetShadowing]);

  useEffect(() => {
    if (!lesson || !showPhonetic) {
      setPhoneticTexts([]);
      return;
    }

    let cancelled = false;
    void resolveLessonPhonetics(lesson.sentences).then((values) => {
      if (!cancelled) setPhoneticTexts(values);
    });

    return () => {
      cancelled = true;
    };
  }, [lesson, showPhonetic]);

  useEffect(() => {
    if (isRecording && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isRecording]);

  useEffect(() => {
    completedRef.current = false;
    lastProgressSaveRef.current = 0;
    sentenceRefs.current = [];
    prevActiveIndexRef.current = -1;
    transcriptRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setIsLooping(false);
    setPlaybackRate(1);
    setIsPlaybackRateOpen(false);
    setShowTranslation(true);
    setShowPhonetic(false);
    setIsPlaying(false);
    setHasPlaybackEnded(false);
    setCurrentTime(0);
    setActiveIndex(0);
    wordLookupRequestRef.current += 1;
    setWordLookupContext(null);
    setWordDetail(null);
    setWordDetailError('');
    setWordDetailLoading(false);
    setWordDetailSaving(false);
    if (audioRef.current) {
      audioRef.current.playbackRate = 1;
    }
  }, [lesson?.id]);

  useEffect(() => {
    if (!wordLookupContext) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      wordLookupRequestRef.current += 1;
      setWordLookupContext(null);
      setWordDetail(null);
      setWordDetailError('');
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [wordLookupContext]);

  /** Click vào bài nghe → phát audio ngay khi vào trang */
  useEffect(() => {
    if (!lesson || !autoPlayOnOpen) return;
    if (accessLoading || (locked && !canAccess)) return;

    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;

    const tryPlay = () => {
      if (cancelled) return;
      void audio.play().catch(() => {
        /* trình duyệt chặn autoplay — người dùng bấm Play */
      });
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      tryPlay();
    } else {
      const onReady = () => tryPlay();
      audio.addEventListener('canplay', onReady, { once: true });
      audio.load();
      return () => {
        cancelled = true;
        audio.removeEventListener('canplay', onReady);
        audio.pause();
      };
    }

    return () => {
      cancelled = true;
      audio.pause();
    };
  }, [
    lesson?.id,
    lesson?.audioUrl,
    autoPlayOnOpen,
    accessLoading,
    locked,
    canAccess,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
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

  useEffect(() => {
    const container = transcriptRef.current;
    const el = sentenceRefs.current[activeIndex];
    if (!container || !el) return;

    const prev = prevActiveIndexRef.current;
    if (activeIndex === prev) return;

    const behavior: ScrollBehavior = prev >= 0 ? 'smooth' : 'auto';
    prevActiveIndexRef.current = activeIndex;

    let cancelScroll: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      cancelScroll = scrollSentenceIntoView(container, el, behavior);
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelScroll?.();
    };
  }, [activeIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !lesson) return;

    const getEffectiveDuration = () =>
      audio.duration > 0 && Number.isFinite(audio.duration)
        ? audio.duration
        : lesson.duration;

    const syncPlaybackPosition = () => {
      const time = audio.currentTime;
      if (!Number.isFinite(time)) return;
      setCurrentTime(time);
      setActiveIndex((prev) => {
        const next = findActiveSentenceIndex(lesson.sentences, time);
        return prev === next ? prev : next;
      });
    };

    const saveListeningProgress = () => {
      const now = Date.now();
      if (now - lastProgressSaveRef.current >= 3000) {
        lastProgressSaveRef.current = now;
        updateListeningProgress(
          lesson.id,
          audio.currentTime,
          getEffectiveDuration(),
        );
      }
    };

    const syncDuration = () => {
      const nextDuration = getEffectiveDuration();
      if (nextDuration > 0) setDuration(nextDuration);
    };

    const onTimeUpdate = () => {
      syncPlaybackPosition();
      saveListeningProgress();
    };
    const onEnded = () => {
      if (!completedRef.current) {
        completedRef.current = true;
        markLessonCompleted(lesson.id, getEffectiveDuration());
      }

      if (isLooping) {
        resetPlaybackToStart(audio);
        audio.playbackRate = playbackRate;
        setIsPlaying(true);
        void audio.play().catch(() => {
          setIsPlaying(false);
          setHasPlaybackEnded(true);
          clearVideoControlsTimer();
          setIsVideoControlsVisible(true);
        });
        return;
      }

      syncPlaybackPosition();
      setIsPlaying(false);
      setHasPlaybackEnded(true);
      clearVideoControlsTimer();
      setIsVideoControlsVisible(true);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setHasPlaybackEnded(false);
      syncPlaybackPosition();
    };
    const onPause = () => {
      syncPlaybackPosition();
      setIsPlaying(false);
    };
    const onLoadedMetadata = () => {
      syncDuration();
      syncPlaybackPosition();
      audio.playbackRate = playbackRate;
    };
    const onError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', syncDuration);
    audio.addEventListener('seeking', syncPlaybackPosition);
    audio.addEventListener('seeked', syncPlaybackPosition);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', syncDuration);
      audio.removeEventListener('seeking', syncPlaybackPosition);
      audio.removeEventListener('seeked', syncPlaybackPosition);
      audio.removeEventListener('error', onError);
    };
  }, [
    lesson,
    playbackRate,
    updateListeningProgress,
    markLessonCompleted,
    clearVideoControlsTimer,
    isLooping,
    resetPlaybackToStart,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !lesson) return;

    let animationFrame = 0;
    const syncPlayback = () => {
      const actuallyPlaying = !audio.paused && !audio.ended;
      setIsPlaying((previous) =>
        previous === actuallyPlaying ? previous : actuallyPlaying,
      );

      if (actuallyPlaying || audio.seeking) {
        const time = audio.currentTime;
        if (Number.isFinite(time)) {
          setCurrentTime(time);
          setActiveIndex((prev) => {
            const next = findActiveSentenceIndex(lesson.sentences, time);
            return prev === next ? prev : next;
          });

          const now = Date.now();
          if (now - lastProgressSaveRef.current >= 3000) {
            lastProgressSaveRef.current = now;
            const effectiveDuration =
              audio.duration > 0 && Number.isFinite(audio.duration)
                ? audio.duration
                : lesson.duration;
            updateListeningProgress(lesson.id, time, effectiveDuration);
          }
        }
      }
      animationFrame = requestAnimationFrame(syncPlayback);
    };

    animationFrame = requestAnimationFrame(syncPlayback);
    return () => cancelAnimationFrame(animationFrame);
  }, [lesson, updateListeningProgress]);

  useEffect(() => {
    if (!lesson) void navigate('/', { replace: true });
  }, [lesson, navigate]);

  useEffect(() => {
    if (lesson) setDuration(lesson.duration);
  }, [lesson]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      try {
        if (hasPlaybackEnded || audio.ended) {
          resetPlaybackToStart(audio);
        }
        audio.playbackRate = playbackRate;
        await audio.play();
      } catch {
        speakSentence(
          lesson?.sentences[activeIndex]?.english ?? '',
          playbackRate,
        );
      }
    }
  };

  const seekToSentence = (index: number) => {
    const audio = audioRef.current;
    const sentence = lesson?.sentences[index];
    if (!audio || !sentence) return;
    const wasPaused = audio.paused;
    setActiveIndex(index);
    audio.currentTime = sentence.time_start;
    setCurrentTime(sentence.time_start);
    setHasPlaybackEnded(false);

    if (wasPaused) {
      audio.playbackRate = playbackRate;
      void audio.play().catch(() => {
        speakSentence(sentence.english, playbackRate);
      });
    }
  };

  const goToAdjacentSentence = (direction: -1 | 1) => {
    if (!lesson) return;
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= lesson.sentences.length) return;

    const audio = audioRef.current;
    const sentence = lesson.sentences[nextIndex];
    if (!audio || !sentence) return;

    const wasPaused = !isPlaying;
    setActiveIndex(nextIndex);
    audio.currentTime = sentence.time_start;
    setCurrentTime(sentence.time_start);
    setHasPlaybackEnded(false);

    if (wasPaused) {
      audio.playbackRate = playbackRate;
      void audio.play().catch(() => {
        speakSentence(sentence.english, playbackRate);
      });
    }
  };

  const selectPlaybackRate = (rate: PlaybackRate) => {
    setPlaybackRate(rate);
    setIsPlaybackRateOpen(false);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const toggleLoop = async () => {
    const next = !isLooping;
    setIsLooping(next);
    const audio = audioRef.current;
    if (next && audio) {
      if (hasPlaybackEnded || audio.ended) resetPlaybackToStart(audio);
      if (!audio.paused) return;
      try {
        audio.playbackRate = playbackRate;
        await audio.play();
      } catch {
        /* autoplay blocked */
      }
    }
  };

  const handleBack = () => {
    if (returnTo) {
      void navigate(returnTo, { replace: true });
      return;
    }
    const historyState = window.history.state as { idx?: unknown } | null;
    if (typeof historyState?.idx === 'number' && historyState.idx > 0) {
      void navigate(-1);
      return;
    }
    void navigate('/');
  };

  const lookupWordDetail = async (context: LessonWordLookupContext) => {
    const requestId = wordLookupRequestRef.current + 1;
    wordLookupRequestRef.current = requestId;
    setWordLookupContext(context);
    setWordDetail(null);
    setWordDetailError('');
    setWordDetailLoading(true);

    try {
      const detail = await api.lookupVocabularyWord(context);
      if (wordLookupRequestRef.current === requestId) setWordDetail(detail);
    } catch (error) {
      if (wordLookupRequestRef.current !== requestId) return;
      setWordDetailError(
        error instanceof ApiError
          ? error.message
          : 'Không thể tra cứu từ này. Vui lòng thử lại.',
      );
    } finally {
      if (wordLookupRequestRef.current === requestId) {
        setWordDetailLoading(false);
      }
    }
  };

  const openWordDetail = (value: string, sentence: LessonSentence) => {
    const word = cleanVocabularyToken(value);
    if (!word) return;
    audioRef.current?.pause();
    setIsPlaying(false);
    void lookupWordDetail({
      word,
      sentence: sentence.english,
      sentenceTranslation: sentence.vietnamese,
    });
  };

  const closeWordDetail = () => {
    wordLookupRequestRef.current += 1;
    setWordLookupContext(null);
    setWordDetail(null);
    setWordDetailError('');
    setWordDetailLoading(false);
    setWordDetailSaving(false);
  };

  const retryWordLookup = () => {
    if (wordLookupContext) void lookupWordDetail(wordLookupContext);
  };

  const lookupRelatedWord = (word: string) => {
    if (!wordLookupContext) return;
    void lookupWordDetail({ ...wordLookupContext, word });
  };

  const saveWordDetail = async () => {
    if (!wordDetail || wordDetail.progress || wordDetailSaving) return;
    if (!user) {
      void navigate('/dang-nhap', {
        state: { from: location.pathname },
      });
      return;
    }

    setWordDetailSaving(true);
    try {
      const progress = await api.learnVocabularyWord(wordDetail.id);
      setWordDetail((current) =>
        current ? { ...current, progress } : current,
      );
    } catch (error) {
      setWordDetailError(
        error instanceof ApiError
          ? error.message
          : 'Không thể lưu từ vựng lúc này.',
      );
    } finally {
      setWordDetailSaving(false);
    }
  };

  if (!lesson) return null;

  if (!accessLoading && locked && !canAccess) {
    return (
      <div className="min-h-screen max-w-lg mx-auto flex flex-col bg-gray-50">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={handleBack}
            className="p-1 text-gray-600"
            aria-label="Quay lại"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 truncate flex-1">
            {lesson.title}
          </h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Lock size={28} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Bài học Pro</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-xs">
            Bài này đã bị khóa. Nâng cấp gói Pro để mở khóa và nghe không giới
            hạn.
          </p>
          <button
            type="button"
            onClick={() => {
              void navigate('/nang-cap', {
                state: { from: `/bai-hoc/${lesson.id}` },
              });
            }}
            className="mt-6 inline-flex items-center gap-2 gradient-btn text-white font-semibold px-6 py-3 rounded-xl"
          >
            <Crown size={18} />
            Nâng cấp Pro
          </button>
        </div>
      </div>
    );
  }

  const progressRatio =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const activeSentence = lesson.sentences[activeIndex]?.english ?? '';

  const toggleVideoFullscreen = async () => {
    const surface = videoSurfaceRef.current;
    if (!surface) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await surface.requestFullscreen();
      }
    } catch {
      // Some embedded browsers do not expose the Fullscreen API.
    }
  };

  const handleShadowingToggle = () => {
    if (isFetching) return;
    if (!isRecording) {
      setShadowingResultIndex(activeIndex);
    }
    void toggleRecording(activeSentence);
  };

  const shadowingButtonClass = isRecording
    ? 'bg-red-500 hover:bg-red-600 ring-2 ring-red-300 ring-offset-2'
    : isFetching
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-gradient-to-r from-primary to-secondary hover:opacity-95 shadow-md shadow-primary/25';

  return (
    <div className="h-screen max-w-lg mx-auto flex flex-col bg-gray-50 overflow-hidden">
      <audio
        ref={audioRef}
        data-testid="lesson-audio"
        src={lesson.audioUrl}
        preload="auto"
      />

      <div className="flex-shrink-0 bg-white px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-gray-100 z-20">
        <button
          type="button"
          onClick={handleBack}
          className="flex-shrink-0 p-1 -ml-1 text-gray-700"
          aria-label="Quay lại"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="min-w-0 font-semibold text-gray-900 text-sm truncate text-center px-1">
          {lesson.title}
        </h1>
        <div className="w-7 flex-shrink-0" aria-hidden />
      </div>

      <div className="flex-shrink-0 z-10 bg-gray-50 px-0 mb-3">
        <div
          ref={videoSurfaceRef}
          data-testid="lesson-video-surface"
          className="bg-black aspect-[20/11] relative overflow-hidden w-full cursor-pointer"
          onClick={toggleVideoControls}
        >
          <img
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            className="absolute inset-0 w-full h-full object-cover opacity-75 scale-105"
          />
          <div
            className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-b from-black/25 via-black/35 to-black/55"
            aria-hidden
          />
          <div className="absolute inset-0 p-3.5">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="max-w-full text-[15px] font-semibold leading-snug text-white drop-shadow-sm">
                {activeSentence}
              </p>
            </div>

            <div
              data-testid="lesson-video-controls"
              aria-hidden={!isVideoControlsVisible}
              inert={!isVideoControlsVisible}
              onClick={(event) => {
                event.stopPropagation();
                showVideoControlsTemporarily();
              }}
              className={`absolute inset-x-3.5 bottom-3.5 z-10 transition-[opacity,translate] duration-500 ease-out will-change-[opacity,translate] ${
                isVideoControlsVisible
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
            >
              <div className="mb-2.5 flex items-center justify-center gap-5">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center text-white disabled:opacity-40"
                  disabled={activeIndex === 0}
                  onClick={() => goToAdjacentSentence(-1)}
                  aria-label="Câu trước"
                >
                  <RotateCcw size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40"
                  aria-label={
                    hasPlaybackEnded
                      ? 'Phát lại từ đầu'
                      : isPlaying
                        ? 'Tạm dừng'
                        : 'Phát'
                  }
                >
                  {hasPlaybackEnded ? (
                    <RefreshCw size={27} className="text-white" />
                  ) : isPlaying ? (
                    <Pause size={26} className="text-white" fill="white" />
                  ) : (
                    <Play
                      size={26}
                      className="ml-0.5 text-white"
                      fill="white"
                    />
                  )}
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center text-white disabled:opacity-40"
                  disabled={activeIndex >= lesson.sentences.length - 1}
                  onClick={() => goToAdjacentSentence(1)}
                  aria-label="Câu sau"
                >
                  <RotateCw size={22} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-9 text-[11px] tabular-nums text-white/90">
                  {formatTime(currentTime)}
                </span>
                <div
                  data-testid="lesson-progress-track"
                  className="h-3 flex-1 cursor-pointer py-1"
                  onClick={(event) => {
                    const audio = audioRef.current;
                    if (!audio || duration <= 0) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const nextRatio = Math.min(
                      1,
                      Math.max(0, (event.clientX - bounds.left) / bounds.width),
                    );
                    const nextTime = nextRatio * duration;
                    audio.currentTime = nextTime;
                    setCurrentTime(nextTime);
                    setHasPlaybackEnded(false);
                  }}
                  aria-label="Tua audio"
                >
                  <div className="h-1 overflow-hidden rounded-full bg-white/30">
                    <div
                      data-testid="lesson-progress-fill"
                      className="h-full w-full origin-left rounded-full bg-primary will-change-transform"
                      style={{ transform: `scaleX(${progressRatio})` }}
                    />
                  </div>
                </div>
                <span className="w-9 text-right text-[11px] tabular-nums text-white/90">
                  {formatTime(duration)}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleVideoFullscreen()}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-white/90"
                  aria-label="Toàn màn hình"
                >
                  <Maximize size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={transcriptRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 pb-4"
      >
        <div className="space-y-3 pt-1.5 pb-[45vh]">
          {lesson.sentences.map((item, index) => {
            const phoneticText = phoneticTexts[index] ?? '';
            const isActive = activeIndex === index;
            const timedWords = wordTimingsBySentence[index] ?? [];
            const activeWordIndex =
              isActive && isPlaying
                ? findActiveWordIndex(timedWords, currentTime)
                : -1;
            return (
              <div
                key={item.id}
                ref={(el) => {
                  sentenceRefs.current[index] = el;
                }}
                onClick={() => seekToSentence(index)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-out ${
                  isActive
                    ? 'bg-primary/5 border-gray-100'
                    : 'bg-transparent border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {shadowingResultIndex === index && shadowingResult ? (
                      <p className="text-sm font-semibold leading-relaxed flex flex-wrap gap-x-1 gap-y-0.5">
                        {shadowingResult.words.map((word, wordIndex) => {
                          const displayWord =
                            item.english.split(/\s+/)[wordIndex] ?? word.word;
                          return (
                            <button
                              key={`${word.word}-${wordIndex}`}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openWordDetail(displayWord, item);
                              }}
                              aria-label={`Xem chi tiết từ ${cleanVocabularyToken(displayWord)}`}
                              className={`${
                                word.correct
                                  ? 'text-emerald-600'
                                  : 'text-red-500'
                              } ${wordBorderClass(wordIndex === activeWordIndex)} cursor-pointer focus-visible:outline-2 focus-visible:outline-primary`}
                            >
                              {displayWord}
                            </button>
                          );
                        })}
                      </p>
                    ) : (
                      <p
                        className={`text-sm font-semibold leading-relaxed flex flex-wrap gap-x-1 gap-y-0.5 ${
                          isActive
                            ? 'text-slate-900 dark:text-white'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {timedWords.map((word, wordIndex) => (
                          <button
                            key={`${word.start}-${word.text}-${wordIndex}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openWordDetail(word.text, item);
                            }}
                            aria-label={`Xem chi tiết từ ${cleanVocabularyToken(word.text)}`}
                            className={`${wordBorderClass(wordIndex === activeWordIndex)} cursor-pointer focus-visible:outline-2 focus-visible:outline-primary`}
                          >
                            {word.text}
                          </button>
                        ))}
                      </p>
                    )}
                    {shadowingResultIndex === index && shadowingResult && (
                      <p className="text-xs text-gray-500 mt-2">
                        Bạn nói:{' '}
                        <span className="italic">
                          {shadowingResult.transcript || '—'}
                        </span>
                      </p>
                    )}
                    {shadowingResultIndex === index && shadowingError && (
                      <p className="text-xs text-red-500 mt-2">
                        {shadowingError}
                      </p>
                    )}
                    {showPhonetic && phoneticText && (
                      <p className="text-xs text-primary mt-1.5 italic leading-relaxed">
                        {phoneticText}
                      </p>
                    )}
                    {showTranslation && (
                      <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                        {item.vietnamese}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-300 mt-2 tabular-nums">
                      {formatTime(item.time_start)} –{' '}
                      {formatSentenceEndTime(item)}
                    </p>
                  </div>
                  {isActive && (
                    <span
                      className={`audio-eq shrink-0 text-primary ${
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
          onSpeak={(text) => speakSentence(text, 0.75)}
          onLookupRelated={lookupRelatedWord}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="mx-auto max-w-lg px-3 py-1">
          <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_minmax(4.75rem,1.15fr)] items-stretch overflow-visible rounded-xl bg-slate-50 p-0.5 shadow-sm dark:bg-neutral-950">
            <div
              ref={playbackSpeedRef}
              className="relative min-w-0"
            >
              <button
                type="button"
                onClick={() => setIsPlaybackRateOpen((open) => !open)}
                aria-label="Tùy chỉnh tốc độ phát"
                aria-haspopup="menu"
                aria-expanded={isPlaybackRateOpen}
                className={`flex h-11 w-full flex-col items-center justify-center gap-px transition-colors ${
                  isPlaybackRateOpen || playbackRate !== 1
                    ? 'text-primary'
                    : 'text-gray-400'
                }`}
              >
                <Gauge
                  size={16}
                  strokeWidth={
                    isPlaybackRateOpen || playbackRate !== 1 ? 2.5 : 2
                  }
                />
                <span className="text-[8px] font-semibold tabular-nums leading-none">
                  {formatPlaybackRate(playbackRate)}
                </span>
                <span className="text-[8px] font-medium leading-none">
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
                active: showTranslation,
                action: () => setShowTranslation((prev) => !prev),
              },
              {
                icon: Bookmark,
                label: lessonSaved ? 'Đã lưu' : 'Lưu bài',
                active: lessonSaved,
                fillIcon: lessonSaved,
                action: () => {
                  if (lesson) toggleFavorite(lesson.id);
                },
              },
              {
                icon: Repeat,
                label: 'Lặp lại',
                active: isLooping,
                action: () => void toggleLoop(),
              },
            ].map(({ icon: Icon, label, action, active, fillIcon }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                aria-pressed={!!active}
                className={`flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                  active ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={active ? 2.5 : 2}
                  className={fillIcon ? 'fill-current' : undefined}
                />
                <span className="max-w-full text-[8px] font-medium leading-tight">
                  {label}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={handleShadowingToggle}
              disabled={isFetching}
              aria-label={
                isFetching
                  ? 'Đang chấm điểm'
                  : isRecording
                    ? 'Dừng Shadowing'
                    : 'Bắt đầu Shadowing'
              }
              className={`m-0.5 flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-white transition-all ${shadowingButtonClass}`}
            >
              {isFetching ? (
                <div className="loader" aria-hidden />
              ) : (
                <>
                  <Mic size={18} />
                  <span className="text-[9px] font-semibold leading-none">
                    {isRecording ? 'Dừng' : 'Nói'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
