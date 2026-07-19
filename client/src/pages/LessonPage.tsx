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

/** Cố định câu active ở đầu vùng transcript (ngay dưới video). */
const ACTIVE_SENTENCE_SLOT_TOP = 0;

function scrollSentenceIntoView(
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

    const behavior: ScrollBehavior =
      prev >= 0 && Math.abs(activeIndex - prev) === 1 ? 'smooth' : 'auto';
    prevActiveIndexRef.current = activeIndex;

    const frame = requestAnimationFrame(() => {
      scrollSentenceIntoView(container, el, behavior);
    });

    return () => cancelAnimationFrame(frame);
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
  const activePhonetic = phoneticTexts[activeIndex] ?? '';

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
      : 'bg-green-500 hover:bg-green-600';
  const shadowingSubtextClass = isRecording ? 'text-red-100' : 'text-green-100';
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
          className="flex-shrink-0 p-1 -ml-1 text-gray-600"
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

      <div className="flex-shrink-0 z-10 bg-gray-50 mb-[15px]">
        <div className="bg-black aspect-video relative overflow-hidden">
        <img
          src={lesson.thumbnailUrl}
          alt={lesson.title}
          className="absolute inset-0 w-full h-full object-cover opacity-70 scale-105"
        />
        <div
          className="absolute inset-0 backdrop-blur-[3px] bg-black/15"
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          <div className="flex justify-between items-start">
            <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">{formatLevelLabel(lesson.level)}</span>
            <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">{lesson.topic}</span>
          </div>
          <div className="text-center px-4">
            <p className="text-white text-sm font-medium leading-relaxed">
              {lesson.sentences[activeIndex]?.english}
            </p>
            {showPhonetic && activePhonetic && (
              <p className="text-white/70 text-xs mt-1 italic">
                {activePhonetic}
              </p>
            )}
            {showTranslation && (
              <p className="text-white/60 text-xs mt-1">
                {lesson.sentences[activeIndex]?.vietnamese}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-center gap-4 mb-2">
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
                className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause size={24} className="text-white" />
                ) : (
                  <Play size={24} className="text-white ml-1" fill="white" />
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
              <span className="text-white text-xs">{formatTime(currentTime)}</span>
              <div className="flex-1 h-1 bg-white/30 rounded-full">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-white text-xs">{formatTime(duration)}</span>
              <Maximize size={14} className="text-white" />
            </div>
          </div>
        </div>
        </div>
      </div>

      <div
        ref={transcriptRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 pb-4"
      >
        <div className="space-y-3 pb-[45vh]">
        {lesson.sentences.map((item, index) => {
          const phoneticText = phoneticTexts[index] ?? '';
          return (
          <div
            key={item.id}
            ref={(el) => {
              sentenceRefs.current[index] = el;
            }}
            onClick={() => seekToSentence(index)}
            className={`p-4 rounded-xl border cursor-pointer transition-colors duration-300 ease-out ${
              activeIndex === index
                ? 'bg-green-50 border-green-300 shadow-sm ring-1 ring-green-200'
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
                          className={word.correct ? 'text-green-600' : 'text-red-500'}
                        >
                          {displayWord}
                        </span>
                      );
                    })}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-gray-900 leading-relaxed">
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
                  <p className="text-xs text-indigo-500 mt-1 italic">{phoneticText}</p>
                )}
                {showTranslation && (
                  <p className="text-sm text-gray-400 mt-1">{item.vietnamese}</p>
                )}
                <p className="text-[10px] text-gray-300 mt-1.5">
                  {formatTime(item.time_start)} – {formatTime(item.time_end)}
                </p>
            </div>
          </div>
          );
        })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-around mb-3">
            {[
              {
                icon: Languages,
                label: 'Dịch',
                active: showTranslation,
                activeClass: 'text-green-600',
                action: () => setShowTranslation((prev) => !prev),
              },
              {
                icon: BookOpen,
                label: 'Phiên âm',
                active: showPhonetic,
                activeClass: 'text-indigo-600',
                action: () => setShowPhonetic((prev) => !prev),
              },
              {
                icon: Repeat,
                label: 'Lặp lại',
                active: isLooping,
                activeClass: 'text-green-600',
                action: () => void toggleLoop(),
              },
              {
                icon: Turtle,
                label: 'Nghe chậm',
                active: isSlowPlayback,
                activeClass: 'text-amber-600',
                action: toggleSlowPlayback,
              },
            ].map(({ icon: Icon, label, action, active, activeClass }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                aria-pressed={!!active}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  active && activeClass ? activeClass : 'text-gray-500'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleShadowingToggle}
            disabled={isFetching}
            className={`w-full py-3.5 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors ${shadowingButtonClass}`}
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
              <p className={`text-[10px] ${shadowingSubtextClass}`}>{shadowingHint}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
