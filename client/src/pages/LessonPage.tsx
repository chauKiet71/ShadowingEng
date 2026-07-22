import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Bookmark, RotateCcw, RotateCw, Turtle,
  Play, Pause, Maximize, Languages, Repeat, BookOpen, Mic, Lock, Crown,
} from 'lucide-react';
import {
  findActiveSentenceIndex,
  formatTime,
  getLessonById,
  formatLevelLabel,
} from '../data/lessons';
import { useFavorites } from '../contexts/FavoritesContext';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useCanAccessLesson } from '../contexts/LessonAccessContext';
import { useShadowing } from '../hooks/useShadowing';
import { resolveLessonPhonetics } from '../lib/phonetic';

const NORMAL_PLAYBACK_RATE = 1;
const SLOW_PLAYBACK_RATE = 0.75;

function speakSentence(text: string, slow = false) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = slow ? 0.7 : 0.9;
  window.speechSynthesis.speak(utterance);
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
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
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
    const progress = Math.min((now - startedAt) / TRANSCRIPT_SCROLL_DURATION_MS, 1);
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
  const lesson = id ? getLessonById(id) : undefined;
  const { canAccess, locked, loading: accessLoading } = useCanAccessLesson(id ?? '');
  const autoPlayOnOpen =
    (location.state as { autoPlay?: boolean } | null)?.autoPlay !== false;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();
  const { updateListeningProgress, markLessonCompleted } = useHistory();
  const {
    result: shadowingResult,
    error: shadowingError,
    isRecording,
    isProcessing,
    isFetching,
    toggleRecording,
    reset: resetShadowing,
  } = useShadowing();
  const saved = lesson ? isFavorite(lesson.id) : false;

  const handleToggleFavorite = () => {
    if (!lesson) return;
    if (!isAuthenticated) {
      navigate('/dang-nhap', {
        state: {
          from: `/bai-hoc/${lesson.id}`,
          message: 'Vui lòng đăng nhập để lưu bài học.',
        },
      });
      return;
    }
    toggleFavorite(lesson.id);
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  const completedRef = useRef(false);
  const lastProgressSaveRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevActiveIndexRef = useRef(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showPhonetic, setShowPhonetic] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [isSlowPlayback, setIsSlowPlayback] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(lesson?.duration ?? 0);
  const [shadowingResultIndex, setShadowingResultIndex] = useState<number | null>(null);
  const [phoneticTexts, setPhoneticTexts] = useState<string[]>([]);

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
    setIsSlowPlayback(false);
    setShowTranslation(true);
    setShowPhonetic(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveIndex(0);
    if (audioRef.current) {
      audioRef.current.playbackRate = NORMAL_PLAYBACK_RATE;
    }
  }, [lesson?.id]);

  /** Click vào bài nghe → phát audio ngay khi vào trang */
  useEffect(() => {
    if (!lesson || !autoPlayOnOpen) return;
    if (accessLoading || (locked && !canAccess)) return;

    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;

    const tryPlay = () => {
      if (cancelled) return;
      audio.playbackRate = NORMAL_PLAYBACK_RATE;
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
  }, [lesson?.id, lesson?.audioUrl, autoPlayOnOpen, accessLoading, locked, canAccess]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = isSlowPlayback ? SLOW_PLAYBACK_RATE : NORMAL_PLAYBACK_RATE;
  }, [isSlowPlayback]);

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

    const onTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      setActiveIndex((prev) => {
        const next = findActiveSentenceIndex(lesson.sentences, time);
        return prev === next ? prev : next;
      });

      const effectiveDuration =
        audio.duration && Number.isFinite(audio.duration)
          ? audio.duration
          : lesson.duration;
      const now = Date.now();
      if (now - lastProgressSaveRef.current >= 3000) {
        lastProgressSaveRef.current = now;
        updateListeningProgress(lesson.id, time, effectiveDuration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      if (completedRef.current) return;
      completedRef.current = true;
      const effectiveDuration =
        audio.duration && Number.isFinite(audio.duration)
          ? audio.duration
          : lesson.duration;
      markLessonCompleted(lesson.id, effectiveDuration);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoadedMetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      audio.playbackRate = isSlowPlayback ? SLOW_PLAYBACK_RATE : NORMAL_PLAYBACK_RATE;
    };
    const onError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
    };
  }, [lesson, isSlowPlayback, updateListeningProgress, markLessonCompleted]);

  useEffect(() => {
    if (!lesson) navigate('/', { replace: true });
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
        audio.playbackRate = isSlowPlayback ? SLOW_PLAYBACK_RATE : NORMAL_PLAYBACK_RATE;
        await audio.play();
      } catch {
        speakSentence(lesson?.sentences[activeIndex]?.english ?? '', isSlowPlayback);
      }
    }
  };

  const seekToSentence = (index: number) => {
    const audio = audioRef.current;
    const sentence = lesson?.sentences[index];
    if (!audio || !sentence) return;
    setActiveIndex(index);
    audio.currentTime = sentence.time_start;
    setCurrentTime(sentence.time_start);
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

    if (wasPaused) {
      audio.playbackRate = isSlowPlayback ? SLOW_PLAYBACK_RATE : NORMAL_PLAYBACK_RATE;
      void audio.play().catch(() => {
        speakSentence(sentence.english, isSlowPlayback);
      });
    }
  };

  const toggleSlowPlayback = () => {
    setIsSlowPlayback((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.playbackRate = next ? SLOW_PLAYBACK_RATE : NORMAL_PLAYBACK_RATE;
      }
      return next;
    });
  };

  const toggleLoop = async () => {
    const next = !isLooping;
    setIsLooping(next);
    const audio = audioRef.current;
    if (next && audio?.paused) {
      try {
        await audio.play();
      } catch {
        /* autoplay blocked */
      }
    }
  };

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  if (!lesson) return null;

  if (!accessLoading && locked && !canAccess) {
    return (
      <div className="min-h-screen max-w-lg mx-auto flex flex-col bg-gray-50">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100 bg-white">
          <button type="button" onClick={handleBack} className="p-1 text-gray-600" aria-label="Quay lại">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 truncate flex-1">{lesson.title}</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Lock size={28} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Bài học Pro</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-xs">
            Bài này đã bị khóa. Nâng cấp gói Pro để mở khóa và nghe không giới hạn.
          </p>
          <button
            type="button"
            onClick={() => navigate('/nang-cap', { state: { from: `/bai-hoc/${lesson.id}` } })}
            className="mt-6 inline-flex items-center gap-2 gradient-btn text-white font-semibold px-6 py-3 rounded-xl"
          >
            <Crown size={18} />
            Nâng cấp Pro
          </button>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const activeSentence = lesson.sentences[activeIndex]?.english ?? '';

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
  const shadowingSubtextClass = isRecording ? 'text-red-100' : 'text-white/80';
  const shadowingHint = isRecording
    ? 'Đang ghi âm — bấm để dừng'
    : isFetching
      ? 'Đang chấm điểm...'
      : 'Luyện nói theo audio';

  return (
    <div className="h-screen max-w-lg mx-auto flex flex-col bg-gray-50 overflow-hidden">
      <audio ref={audioRef} src={lesson.audioUrl} preload="auto" loop={isLooping} />

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
        <div className="flex gap-3 flex-shrink-0 justify-end">
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="p-0.5"
            aria-label={saved ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích'}
            title={saved ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích'}
          >
            <Bookmark
              size={20}
              className={saved ? 'text-primary fill-primary' : 'text-gray-500'}
            />
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 z-10 bg-gray-50 px-0 mb-3">
        <div className="bg-black aspect-[20/11] relative overflow-hidden w-full">
          <img
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            className="absolute inset-0 w-full h-full object-cover opacity-75 scale-105"
          />
          <div
            className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-b from-black/25 via-black/35 to-black/55"
            aria-hidden
          />
          <div className="absolute inset-0 flex flex-col justify-between p-3.5">
            <div className="flex justify-between items-start gap-2">
              <span className="text-white text-[11px] font-medium bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-full">
                {formatLevelLabel(lesson.level)}
              </span>
              <span className="text-white text-[11px] font-medium bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-full max-w-[60%] truncate">
                {lesson.topic}
              </span>
            </div>

            <div className="text-center px-3">
              <p className="text-white text-[15px] font-semibold leading-snug drop-shadow-sm">
                {lesson.sentences[activeIndex]?.english}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-5 mb-2.5">
                <button
                  type="button"
                  className="text-white disabled:opacity-40"
                  disabled={activeIndex === 0}
                  onClick={() => goToAdjacentSentence(-1)}
                  aria-label="Câu trước"
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40"
                  aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                >
                  {isPlaying ? (
                    <Pause size={26} className="text-white" />
                  ) : (
                    <Play size={26} className="text-white ml-0.5" fill="white" />
                  )}
                </button>
                <button
                  type="button"
                  className="text-white disabled:opacity-40"
                  disabled={activeIndex >= lesson.sentences.length - 1}
                  onClick={() => goToAdjacentSentence(1)}
                  aria-label="Câu sau"
                >
                  <RotateCw size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/90 text-[11px] tabular-nums w-9">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <span className="text-white/90 text-[11px] tabular-nums w-9 text-right">
                  {formatTime(duration)}
                </span>
                <Maximize size={14} className="text-white/90" />
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
            return (
              <div
                key={item.id}
                ref={(el) => {
                  sentenceRefs.current[index] = el;
                }}
                onClick={() => seekToSentence(index)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-out ${
                  isActive
                    ? 'bg-primary/5 border-primary shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="min-w-0">
                  {shadowingResultIndex === index && shadowingResult ? (
                    <p className="text-sm font-semibold leading-relaxed flex flex-wrap gap-x-1 gap-y-0.5">
                      {shadowingResult.words.map((word, wordIndex) => {
                        const displayWord =
                          item.english.split(/\s+/)[wordIndex] ?? word.word;
                        return (
                          <span
                            key={`${word.word}-${wordIndex}`}
                            className={word.correct ? 'text-emerald-600' : 'text-red-500'}
                          >
                            {displayWord}
                          </span>
                        );
                      })}
                    </p>
                  ) : (
                    <p
                      className={`text-sm font-semibold leading-relaxed ${
                        isActive
                          ? 'text-slate-900 dark:text-white'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.english}
                    </p>
                  )}
                  {shadowingResultIndex === index && shadowingResult && (
                    <p className="text-xs text-gray-500 mt-2">
                      Bạn nói:{' '}
                      <span className="italic">{shadowingResult.transcript || '—'}</span>
                    </p>
                  )}
                  {shadowingResultIndex === index && shadowingError && (
                    <p className="text-xs text-red-500 mt-2">{shadowingError}</p>
                  )}
                  {shadowingResultIndex === index && isProcessing && (
                    <p className="text-xs text-gray-400 mt-2">Đang chấm điểm...</p>
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
                    {formatTime(item.time_start)} – {formatTime(item.time_end)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur border-t border-gray-100 dark:border-neutral-800 z-50">
        <div className="max-w-lg mx-auto px-4 pt-2.5 pb-3">
          <div className="flex items-center justify-around mb-3 rounded-2xl bg-slate-50 dark:bg-neutral-950 px-1 py-2">
            {[
              {
                icon: Languages,
                label: 'Dịch',
                active: showTranslation,
                action: () => setShowTranslation((prev) => !prev),
              },
              {
                icon: BookOpen,
                label: 'Phiên âm',
                active: showPhonetic,
                action: () => setShowPhonetic((prev) => !prev),
              },
              {
                icon: Repeat,
                label: 'Lặp lại',
                active: isLooping,
                action: () => void toggleLoop(),
              },
              {
                icon: Turtle,
                label: 'Nghe chậm',
                active: isSlowPlayback,
                action: toggleSlowPlayback,
              },
            ].map(({ icon: Icon, label, action, active }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                aria-pressed={!!active}
                className={`flex flex-col items-center gap-1 min-w-[4.25rem] px-2 py-1 rounded-xl transition-colors ${
                  active ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span
                  className={`text-[10px] font-medium ${
                    active ? 'border-b-2 border-primary pb-0.5' : ''
                  }`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleShadowingToggle}
            disabled={isFetching}
            className={`w-full py-3.5 text-white font-semibold rounded-full flex items-center justify-center gap-2.5 transition-all ${shadowingButtonClass}`}
          >
            {isFetching ? (
              <div className="loader" aria-hidden />
            ) : (
              <Mic size={20} />
            )}
            <div className="text-left">
              <p className="text-sm font-bold leading-none">
                {isRecording ? 'Đang ghi âm...' : isFetching ? 'Đang xử lý...' : 'Shadowing'}
              </p>
              <p className={`text-[10px] mt-0.5 ${shadowingSubtextClass}`}>{shadowingHint}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
