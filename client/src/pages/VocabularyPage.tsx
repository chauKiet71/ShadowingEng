import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppWindow,
  ArrowLeft,
  BookOpen,
  BookmarkCheck,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Cloud,
  Code2,
  Cpu,
  Gamepad2,
  Globe,
  GraduationCap,
  HardDrive,
  Languages,
  Landmark,
  Layers,
  MessageCircle,
  Plane,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  TrendingUp,
  Volume2,
  Wallet,
  Wifi,
  X,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  api,
  type VocabularyOverview,
  type VocabularyProgress,
  type VocabularySetDetail,
  type VocabularySetSummary,
  type VocabularyWord,
} from '../lib/api';
import { peekCache, setCache } from '../lib/prefetchCache';
import {
  PrefetchKeys,
  fetchVocabularyOverview,
  fetchVocabularySet,
} from '../lib/prefetchFeatures';
import { playAnswerFeedback } from '../lib/profileSettings';
import { speakEnglishText } from '../lib/speech';

const iconMap = {
  plane: Plane,
  'message-circle': MessageCircle,
  briefcase: Briefcase,
  clapperboard: Clapperboard,
  cpu: Cpu,
  'hard-drive': HardDrive,
  'app-window': AppWindow,
  wifi: Wifi,
  'code-2': Code2,
  bot: Bot,
  shield: Shield,
  cloud: Cloud,
  smartphone: Smartphone,
  globe: Globe,
  'graduation-cap': GraduationCap,
  'gamepad-2': Gamepad2,
  sparkles: Sparkles,
  'trending-up': TrendingUp,
  'building-2': Building2,
  landmark: Landmark,
  wallet: Wallet,
  'book-open': BookOpen,
} as const;

const colorMap: Record<string, { bg: string; text: string; soft: string }> = {
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    soft: 'bg-blue-50 dark:bg-blue-950/40',
  },
  purple: {
    bg: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    soft: 'bg-purple-50 dark:bg-purple-950/40',
  },
  teal: {
    bg: 'bg-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    soft: 'bg-teal-50 dark:bg-teal-950/40',
  },
  pink: {
    bg: 'bg-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    soft: 'bg-pink-50 dark:bg-pink-950/40',
  },
  sky: {
    bg: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    soft: 'bg-sky-50 dark:bg-sky-950/40',
  },
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    soft: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  violet: {
    bg: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    soft: 'bg-violet-50 dark:bg-violet-950/40',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    soft: 'bg-red-50 dark:bg-red-950/40',
  },
  cyan: {
    bg: 'bg-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    soft: 'bg-cyan-50 dark:bg-cyan-950/40',
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    soft: 'bg-green-50 dark:bg-green-950/40',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    soft: 'bg-orange-50 dark:bg-orange-950/40',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-50 dark:bg-amber-950/40',
  },
  slate: {
    bg: 'bg-slate-500',
    text: 'text-slate-600 dark:text-slate-400',
    soft: 'bg-slate-50 dark:bg-slate-950/40',
  },
};

const vocabularyCoverMap: Record<string, string> = {
  '1000-tu-thong-dung': '/images/vocabulary/common-1000-cover.webp?v=1',
  'du-lich-co-ban': '/images/vocabulary/travel-basic-cover.webp?v=1',
  'giao-tiep-hang-ngay': '/images/vocabulary/daily-conversation-cover.webp?v=1',
  'cong-viec-van-phong': '/images/vocabulary/office-work-cover.webp?v=1',
  'phim-anh-giai-tri': '/images/vocabulary/movies-entertainment-cover.webp?v=1',
  'cong-nghe': '/images/vocabulary/technology-cover.webp?v=1',
  'giao-duc': '/images/vocabulary/education-cover.webp?v=1',
  'kinh-te': '/images/vocabulary/economics-cover.webp?v=1',
  'kinh-doanh': '/images/vocabulary/business-cover.webp?v=1',
  'ngan-hang': '/images/vocabulary/banking-cover.webp?v=1',
  'tai-chinh': '/images/vocabulary/finance-cover.webp?v=1',
};

function speak(text: string) {
  speakEnglishText(text, 0.85);
}

function CircleReload({
  size = 22,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full animate-spin ${className}`}
      style={{
        width: size,
        height: size,
        borderWidth: 2.5,
        borderStyle: 'solid',
        borderColor: 'color-mix(in srgb, currentColor 22%, transparent)',
        borderTopColor: 'currentColor',
      }}
      aria-hidden="true"
    />
  );
}

function playWordAudio(word: VocabularyWord) {
  if (!word.audioUrl) {
    speak(word.word);
    return;
  }

  const audio = new Audio(word.audioUrl);
  void audio.play().catch(() => speak(word.word));
}

function createWordHint(value: string): string {
  return value
    .split(' ')
    .map((part) => {
      const letters = [...part];
      if (letters.length <= 2) {
        return letters.map((letter, index) => (index === 0 ? letter : '_')).join(' ');
      }

      const middleIndex = Math.floor(letters.length / 2);
      return letters
        .map((letter, index) => {
          const isLetter = /[a-z]/i.test(letter);
          if (!isLetter) return letter;
          const visible =
            index === 0 ||
            index === letters.length - 1 ||
            (letters.length >= 7 && index === middleIndex);
          return visible ? letter : '_';
        })
        .join(' ');
    })
    .join('   ');
}

function hideWordInExample(example: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return example.replace(new RegExp(escaped, 'gi'), '_____');
}

function normalizeAnswer(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

const DAILY_WORD_GOAL = 10;

function isProgressDue(progress: VocabularyProgress | null | undefined) {
  if (!progress?.nextReviewAt) return false;
  return new Date(progress.nextReviewAt).getTime() <= Date.now();
}

function SetCard({
  set,
  onClick,
  loading = false,
}: {
  set: VocabularySetSummary;
  onClick: () => void;
  loading?: boolean;
}) {
  const Icon = iconMap[set.icon as keyof typeof iconMap] ?? BookOpen;
  const colors = colorMap[set.color] ?? colorMap.blue;
  const coverImage = vocabularyCoverMap[set.slug];

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="group flex min-w-[146px] w-[146px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-[0_3px_12px_rgba(15,23,42,0.12)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_8px_20px_rgba(15,23,42,0.16)] disabled:opacity-80 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-indigo-700"
      aria-label={`${set.title}, ${set.wordCount} từ, trình độ ${set.cefrLevel}`}
    >
      <div className={`relative h-[132px] w-full overflow-hidden ${colors.bg}`}>
        {coverImage ? (
          <img
            src={coverImage}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-full w-full select-none object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
              <Icon size={20} strokeWidth={2.2} />
            </div>
            <span className="mt-2 text-[22px] font-black leading-none tabular-nums">
              {set.wordCount}
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/85">
              {set.cefrLevel} · CEFR
            </span>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-white backdrop-blur-[1px]">
            <CircleReload size={22} />
          </div>
        )}
      </div>

      <div className="flex min-h-[86px] w-full flex-col bg-white px-2.5 py-2.5 dark:bg-neutral-900">
        <p className="line-clamp-2 min-h-8 text-[12px] font-bold leading-4 text-slate-900 dark:text-white">
          {set.title}
        </p>
        <div className="mt-auto flex items-center gap-3 text-[9px] font-medium text-slate-500 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1">
            <BookOpen size={10} strokeWidth={2} />
            {set.wordCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 size={10} strokeWidth={2} />
            {set.learnedCount ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
}

function PracticeModeCard({
  icon: Icon,
  label,
  colorClass,
  onClick,
}: {
  icon: typeof Layers;
  label: string;
  colorClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-0 bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.06)] px-2 py-4 flex flex-col items-center gap-2.5 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors"
    >
      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colorClass}`}
      >
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

export default function VocabularyPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const cachedOverview = peekCache<VocabularyOverview>(
    PrefetchKeys.vocabularyOverview,
  );
  const [overview, setOverview] = useState<VocabularyOverview | null>(
    () => cachedOverview ?? null,
  );
  const [selectedSet, setSelectedSet] =
    useState<VocabularySetDetail | null>(null);
  const [selectedSetView, setSelectedSetView] = useState<
    'detail' | 'dashboard'
  >('detail');
  const [learningQueue, setLearningQueue] = useState<VocabularyWord[]>([]);
  const [learningIndex, setLearningIndex] = useState(0);
  const [learningMode, setLearningMode] = useState<'learn' | 'review'>('learn');
  const [learningAnswer, setLearningAnswer] = useState('');
  const [learningResult, setLearningResult] = useState<
    'idle' | 'incorrect' | 'correct'
  >('idle');
  const [showExtraHint, setShowExtraHint] = useState(false);
  const [showExampleTranslation, setShowExampleTranslation] = useState(false);
  const learningWord = learningQueue[learningIndex] ?? null;
  const [loading, setLoading] = useState(() => !cachedOverview);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [continueLoading, setContinueLoading] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showAllSets, setShowAllSets] = useState(false);

  async function loadOverview(force = false) {
    const data = await fetchVocabularyOverview(force);
    setOverview(data);
  }

  useEffect(() => {
    // Hiện overview từ cache nếu có. Chi tiết từng bộ chỉ fetch khi người dùng mở chủ đề.
    const cached = peekCache<VocabularyOverview>(
      PrefetchKeys.vocabularyOverview,
    );
    if (cached) {
      setOverview(cached);
      setLoading(false);
      return;
    }

    void loadOverview()
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không tải được từ vựng'),
      )
      .finally(() => setLoading(false));
  }, []);

  async function openSet(
    set: VocabularySetSummary,
    view: 'detail' | 'dashboard' = 'detail',
  ) {
    setBusyId(set.id);
    setError('');
    setSelectedSetView(view);
    try {
      const cached = peekCache<VocabularySetDetail>(
        PrefetchKeys.vocabularySet(set.id),
      );
      if (cached) {
        setSelectedSet(cached);
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }

      const detail = await fetchVocabularySet(set.id);
      setSelectedSet(detail);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không mở được bộ từ');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSave() {
    if (!selectedSet) return;
    if (!isAuthenticated) {
      navigate('/dang-nhap', {
        state: {
          from: '/tu-vung',
          message: 'Vui lòng đăng nhập để lưu bộ từ vựng.',
        },
      });
      return;
    }
    setBusyId(selectedSet.id);
    try {
      if (selectedSet.saved) {
        await api.removeVocabularySet(selectedSet.id);
      } else {
        await api.saveVocabularySet(selectedSet.id);
      }
      const next = { ...selectedSet, saved: !selectedSet.saved };
      setSelectedSet(next);
      setCache(PrefetchKeys.vocabularySet(selectedSet.id), next);
      await loadOverview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được bộ từ');
    } finally {
      setBusyId(null);
    }
  }

  function resetLearningForm() {
    setLearningAnswer('');
    setLearningResult('idle');
    setShowExtraHint(false);
    setShowExampleTranslation(false);
  }

  function exitLearning() {
    setLearningQueue([]);
    setLearningIndex(0);
    setLearningMode('learn');
    resetLearningForm();
  }

  function requireAuth(message: string) {
    if (isAuthenticated) return true;
    navigate('/dang-nhap', {
      state: {
        from: '/tu-vung',
        message,
      },
    });
    return false;
  }

  async function startReviewSession(setId?: string) {
    if (!requireAuth('Vui lòng đăng nhập để ôn từ vựng.')) return;
    setSessionBusy(true);
    setError('');
    try {
      const session = await api.getVocabularyReviewSession({
        setId,
        limit: 20,
      });
      if (session.words.length === 0) {
        setError(
          setId
            ? 'Chưa có từ đến hạn trong bộ này. Hãy học thêm từ mới.'
            : 'Bạn đã ôn tập xong',
        );
        await loadOverview(true);
        return;
      }
      startLearningQueue(session.words, 'review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được bài ôn');
    } finally {
      setSessionBusy(false);
    }
  }

  async function startLearnSession(setId: string) {
    if (!requireAuth('Vui lòng đăng nhập để học từ vựng.')) return;
    setSessionBusy(true);
    setError('');
    try {
      const session = await api.getVocabularyLearnSession({
        setId,
        limit: 5,
      });
      if (session.words.length === 0) {
        setError('Bạn đã học hết bộ từ này');
        return;
      }
      startLearningQueue(session.words, 'learn');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được bài học');
    } finally {
      setSessionBusy(false);
    }
  }

  function startLearningQueue(
    words: VocabularyWord[],
    mode: 'learn' | 'review' = 'learn',
  ) {
    if (words.length === 0) return;
    setLearningQueue(words);
    setLearningIndex(0);
    setLearningMode(mode);
    resetLearningForm();
    setError('');
    playWordAudio(words[0]);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function saveLearnedWord(word: VocabularyWord, correct: boolean) {
    if (!isAuthenticated) return;
    void api
      .learnVocabularyWord(word.id, correct)
      .then((progress) => {
        setSelectedSet((current) => {
          if (!current) return current;
          const next = {
            ...current,
            words: current.words.map((item) =>
              item.id === word.id ? { ...item, progress } : item,
            ),
          };
          setCache(PrefetchKeys.vocabularySet(current.id), next);
          return next;
        });
        void loadOverview(true);
      })
      .catch(() => {
        // Lưu nền, không chặn thao tác học tiếp theo của người dùng.
      });
  }

  function saveReviewedWord(word: VocabularyWord, correct: boolean) {
    if (!isAuthenticated) return;
    void api
      .reviewVocabularyWord(word.id, correct)
      .then((progress) => {
        setSelectedSet((current) => {
          if (!current) return current;
          const next = {
            ...current,
            words: current.words.map((item) =>
              item.id === word.id ? { ...item, progress } : item,
            ),
          };
          setCache(PrefetchKeys.vocabularySet(current.id), next);
          return next;
        });
        void loadOverview(true);
      })
      .catch(() => {
        // Lưu nền, không chặn thao tác ôn tiếp theo của người dùng.
      });
  }

  function submitLearning(event: FormEvent) {
    event.preventDefault();
    if (
      !learningWord ||
      !learningAnswer.trim() ||
      learningResult !== 'idle'
    ) {
      return;
    }

    const isCorrect =
      normalizeAnswer(learningAnswer) === normalizeAnswer(learningWord.word);

    setLearningResult(isCorrect ? 'correct' : 'incorrect');
    playAnswerFeedback(isCorrect);

    if (learningMode === 'review') {
      saveReviewedWord(learningWord, isCorrect);
      return;
    }

    saveLearnedWord(learningWord, isCorrect);
  }

  function continueLearning() {
    if (learningIndex + 1 >= learningQueue.length) {
      exitLearning();
      return;
    }

    const nextWord = learningQueue[learningIndex + 1];
    setLearningIndex((value) => value + 1);
    resetLearningForm();
    playWordAudio(nextWord);
  }

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-8 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <CircleReload size={16} />
          Đang tải từ vựng...
        </div>
      </MobileLayout>
    );
  }

  if (learningWord) {
    const exampleHint = hideWordInExample(
      learningWord.example,
      learningWord.word,
    );
    const checked = learningResult !== 'idle';
    const isLastWord = learningIndex + 1 >= learningQueue.length;

    return (
      <MobileLayout showPlayer={false} showNav={false}>
        <div className="px-4 pt-5 min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-white">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={exitLearning}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 card-shadow text-gray-900 dark:text-white"
              aria-label="Quay lại bộ từ"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-center">
              <p className="font-bold text-gray-900 dark:text-white">
                {learningMode === 'review' ? 'Ôn tập từ vựng' : 'Học từ mới'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {learningIndex + 1}/{learningQueue.length} · Nghe và nhập từ
              </p>
            </div>
            <div className="w-9" />
          </div>

          <div className="mt-5 h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-neutral-800">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${((learningIndex + 1) / learningQueue.length) * 100}%`,
              }}
            />
          </div>

          {!checked ? (
          <div className="mt-7 bg-white dark:bg-neutral-900 rounded-3xl card-shadow p-6 text-center">
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => playWordAudio(learningWord)}
                    className="w-full h-full flex items-center justify-center"
                    aria-label="Nghe phát âm"
                  >
                    <Volume2 size={27} />
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Nhấn để nghe lại cách phát âm
                </p>

                <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Gợi ý ký tự
                </p>
                <p className="mt-2 text-2xl font-bold tracking-[0.14em] text-gray-900 dark:text-white break-words">
                  {createWordHint(learningWord.word)}
                </p>

                <div className="mt-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 text-left">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold">Gợi ý</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {learningWord.meaning}
                  </p>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{exampleHint}</p>
                  {showExtraHint && (
                    <p className="mt-2 text-xs text-primary">
                      Phiên âm: {learningWord.phonetic || 'Chưa có phiên âm'}
                    </p>
                  )}
                  {!showExtraHint && (
                    <button
                      type="button"
                      onClick={() => setShowExtraHint(true)}
                      className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-400"
                    >
                      Xem thêm gợi ý
                    </button>
                  )}
                </div>

                <form onSubmit={submitLearning} className="mt-6">
                  <input
                    autoFocus
                    autoComplete="off"
                    value={learningAnswer}
                    onChange={(event) => setLearningAnswer(event.target.value)}
                    placeholder="Câu trả lời"
                    className="w-full rounded-2xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-4 py-3 text-center text-lg font-semibold text-gray-900 dark:text-white outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={!learningAnswer.trim()}
                    className="mt-5 w-full rounded-2xl bg-primary py-3.5 font-semibold text-white disabled:bg-gray-200 dark:disabled:bg-neutral-700 disabled:text-gray-400"
                  >
                    Kiểm tra
                  </button>
                </form>
              </>
          </div>
          ) : (
            <div
              className="mt-4 origin-top pb-6"
              style={{ zoom: 0.7 }}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    learningResult === 'correct'
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {learningResult === 'correct' ? (
                    <Check size={32} strokeWidth={3} />
                  ) : (
                    <X size={32} strokeWidth={3} />
                  )}
                </div>
                <p
                  className={`mt-4 text-3xl font-extrabold ${
                    learningResult === 'correct'
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                >
                  {learningResult === 'correct'
                    ? 'Chính xác!'
                    : 'Chưa chính xác'}
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-white dark:bg-neutral-900 card-shadow px-4 py-4 text-left">
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold ${
                    learningResult === 'correct'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {learningResult === 'correct' ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <X size={14} strokeWidth={3} />
                  )}
                  Đáp án đúng
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    {learningWord.word}
                  </p>
                  <button
                    type="button"
                    onClick={() => playWordAudio(learningWord)}
                    className="w-9 h-9 rounded-full bg-violet-500/15 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center"
                    aria-label="Nghe phát âm"
                  >
                    <Volume2 size={17} />
                  </button>
                </div>

                {learningWord.phonetic && (
                  <p className="mt-1 text-sm text-violet-600 dark:text-violet-300">
                    {learningWord.phonetic}
                  </p>
                )}
                <p className="mt-2 text-lg text-gray-800 dark:text-white">
                  {learningWord.meaning}
                </p>

                <div className="mt-4 border-t border-gray-100 dark:border-white/10 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Ví dụ
                  </p>
                  <div className="mt-2 flex items-start gap-2">
                    <p className="flex-1 text-sm leading-relaxed text-gray-800 dark:text-white">
                      {learningWord.example}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setShowExampleTranslation((value) => !value)
                      }
                      className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        showExampleTranslation
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                      }`}
                      aria-label={
                        showExampleTranslation
                          ? 'Ẩn nghĩa tiếng Việt'
                          : 'Hiện nghĩa tiếng Việt'
                      }
                    >
                      <Languages size={15} />
                    </button>
                  </div>
                  {showExampleTranslation && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                      {learningWord.exampleTranslation}
                    </p>
                  )}
                </div>
              </div>

              {learningResult === 'correct' ? (
                <div className="mt-4 rounded-2xl bg-white dark:bg-neutral-900 card-shadow px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                    <BookmarkCheck size={18} />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    {learningMode === 'review'
                      ? 'Đã cập nhật lịch ôn tập của bạn'
                      : 'Đã thêm vào danh sách học. Sẽ ôn lại trong hôm nay'}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  {learningMode === 'review'
                    ? 'Từ này sẽ được ôn lại sau 10 phút.'
                    : 'Đã lưu từ này. Bạn sẽ ôn lại sau vài phút.'}
                </p>
              )}

              <button
                type="button"
                onClick={continueLearning}
                className={`mt-6 w-full rounded-2xl py-3.5 font-semibold text-white ${
                  learningResult === 'correct' ? 'bg-green-500' : 'bg-primary'
                }`}
              >
                {isLastWord ? 'Hoàn thành' : 'Tiếp tục'}
              </button>
            </div>
          )}
        </div>
      </MobileLayout>
    );
  }

  if (selectedSet && selectedSetView === 'dashboard') {
    const learnedWords = selectedSet.words.filter((word) => word.progress);
    const masteredWords = learnedWords.filter(
      (word) => word.progress?.status === 'MASTERED',
    );
    const learningWords = learnedWords.filter(
      (word) => word.progress?.status === 'LEARNING',
    );
    const newWords = selectedSet.words.filter((word) => !word.progress);
    const dueWords = learnedWords.filter((word) =>
      isProgressDue(word.progress),
    );
    const nextFiveWords = newWords.slice(0, 5);
    const learnedPercent =
      selectedSet.words.length > 0
        ? Math.round((learnedWords.length / selectedSet.words.length) * 100)
        : 0;

    return (
      <MobileLayout>
        <div className="sticky top-0 z-40 bg-gray-50 dark:bg-neutral-950 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedSet(null);
                setSelectedSetView('detail');
              }}
              className="w-9 h-9 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center card-shadow"
              aria-label="Quay lại"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 dark:text-white truncate">
                {selectedSet.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bộ từ của bạn</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs px-3 py-2">
            {error}
          </div>
        )}

        <div className="px-4 py-5">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Thống kê từ vựng của bạn
              </h2>
              <Sparkles size={17} className="text-primary" />
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-3xl p-5 shadow-lg">
              <p className="text-xs text-white/75">Tổng số từ đã học</p>
              <div className="mt-1 flex items-end gap-2">
                <p className="text-4xl font-bold">{learnedWords.length}</p>
                <p className="text-sm text-white/75 pb-1">
                  / {selectedSet.words.length} từ
                </p>
              </div>

              <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${learnedPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/75">
                Hoàn thành {learnedPercent}% bộ từ
              </p>

              <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                <div className="rounded-2xl bg-white/15 px-2 py-3">
                  <p className="text-xl font-bold">{learningWords.length}</p>
                  <p className="text-[10px] text-white/75">Đang học</p>
                </div>
                <div className="rounded-2xl bg-white/15 px-2 py-3">
                  <p className="text-xl font-bold">{masteredWords.length}</p>
                  <p className="text-[10px] text-white/75">Đã thuộc</p>
                </div>
                <div className="rounded-2xl bg-white/15 px-2 py-3">
                  <p className="text-xl font-bold">{newWords.length}</p>
                  <p className="text-[10px] text-white/75">Chưa học</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5 space-y-3">
            <button
              type="button"
              disabled={dueWords.length === 0 || sessionBusy}
              onClick={() => void startReviewSession(selectedSet.id)}
              className="w-full bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 flex items-center gap-4 text-left disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 dark:text-orange-400 flex items-center justify-center shrink-0">
                {sessionBusy ? (
                  <CircleReload size={21} />
                ) : (
                  <RotateCcw size={21} />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white">Ôn tập ngay</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {dueWords.length > 0
                    ? `Ôn lại ${dueWords.length} từ đến hạn trong bộ này`
                    : 'Chưa có từ đến hạn. Học thêm từ mới rồi ôn sau'}
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
            </button>

            <button
              type="button"
              disabled={nextFiveWords.length === 0 || sessionBusy}
              onClick={() => void startLearnSession(selectedSet.id)}
              className="w-full bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 flex items-center gap-4 text-left disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Plus size={22} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white">Học thêm 5 từ mới</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {nextFiveWords.length > 0
                    ? `Bắt đầu học ${nextFiveWords.length} từ tiếp theo`
                    : 'Bạn đã học hết bộ từ này'}
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
            </button>
          </section>
        </div>
      </MobileLayout>
    );
  }

  if (selectedSet) {
    const colors = colorMap[selectedSet.color] ?? colorMap.blue;
    return (
      <MobileLayout>
        <div className="sticky top-0 z-40 bg-gray-50 dark:bg-neutral-950 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedSet(null)}
              className="w-9 h-9 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center card-shadow"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 dark:text-white truncate">
                {selectedSet.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedSet.words.length} từ · {selectedSet.cefrLevel}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === selectedSet.id}
              onClick={() => void toggleSave()}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                selectedSet.saved
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-neutral-900 text-primary card-shadow'
              }`}
            >
              {selectedSet.saved ? 'Đã lưu' : 'Lưu'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs px-3 py-2">
            {error}
          </div>
        )}

        <div className="px-4 py-4 space-y-3">
          {selectedSet.words.map((word, index) => (
            <div
              key={word.id}
              className="bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-8 h-8 ${colors.soft} ${colors.text} rounded-xl flex items-center justify-center text-xs font-bold shrink-0`}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white">{word.word}</p>
                    <button
                      type="button"
                      onClick={() => speak(word.word)}
                      className="text-primary"
                    >
                      <Volume2 size={15} />
                    </button>
                    {word.progress && (
                      <Check size={15} className="text-green-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{word.phonetic}</p>
                  <p className="text-sm text-primary font-medium mt-1">
                    {word.meaning}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{word.example}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {word.exampleTranslation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </MobileLayout>
    );
  }

  const filteredSets = Array.isArray(overview?.sets)
    ? overview.sets.filter((set) =>
        `${set.title} ${set.description} ${set.topic}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : [];

  if (showAllSets) {
    return (
      <MobileLayout>
        <div className="sticky top-0 z-40 bg-gray-50 dark:bg-neutral-950 px-4 pt-4 pb-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAllSets(false);
                setSearch('');
              }}
              className="w-9 h-9 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center card-shadow"
              aria-label="Quay lại"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 dark:text-white">Tất cả bộ từ vựng</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {overview?.sets.length ?? 0} chủ đề
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm chủ đề bộ từ..."
              className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 card-shadow pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>

          {error && (
            <div className="mb-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-3 pb-6">
            {filteredSets.map((set) => {
              const Icon =
                iconMap[set.icon as keyof typeof iconMap] ?? BookOpen;
              const colors = colorMap[set.color] ?? colorMap.blue;
              const coverImage = vocabularyCoverMap[set.slug];
              return (
                <button
                  key={set.id}
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => void openSet(set)}
                  className="w-full bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 flex items-center gap-3 text-left disabled:opacity-80"
                >
                  <div
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl ${colors.soft} ${colors.text}`}
                  >
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="h-full w-full select-none object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon size={21} />
                      </div>
                    )}
                    {busyId === set.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-white backdrop-blur-[1px]">
                        <CircleReload size={21} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white truncate">
                        {set.title}
                      </p>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-neutral-800 px-2 py-0.5 rounded-full shrink-0">
                        {set.cefrLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {set.description}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      {set.topic} · {set.wordCount} từ
                      {(set.learnedCount ?? 0) > 0
                        ? ` · đã học ${set.learnedCount}`
                        : ''}
                    </p>
                  </div>
                  <ChevronRight size={17} className="text-gray-400 dark:text-gray-500 shrink-0" />
                </button>
              );
            })}

            {filteredSets.length === 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-6 text-center">
                <BookOpen size={28} className="text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  Không tìm thấy bộ từ phù hợp
                </p>
              </div>
            )}
          </div>
        </div>
      </MobileLayout>
    );
  }

  const stats = overview?.stats;
  const totalLearned = stats?.totalLearned ?? 0;
  const mastered = stats?.mastered ?? 0;
  const learning = stats?.learning ?? 0;
  const learnedToday = stats?.learnedToday ?? 0;
  const dueCount = stats?.dueCount ?? 0;
  const dailyGoalPct = Math.min(
    100,
    Math.round((learnedToday / DAILY_WORD_GOAL) * 100),
  );
  const memoryBarPct =
    totalLearned > 0
      ? Math.max(
          learning > 0 ? 12 : 0,
          Math.round(((mastered + learning * 0.55) / totalLearned) * 100),
        )
      : 0;
  const dailyGoalHint =
    learnedToday >= DAILY_WORD_GOAL
      ? 'Đã hoàn thành mục tiêu hôm nay!'
      : `${learnedToday}/${DAILY_WORD_GOAL} từ mới — cố lên, sắp đạt rồi!`;

  async function continueTodayLearning() {
    if (!isAuthenticated) {
      navigate('/dang-nhap', {
        state: {
          from: '/tu-vung',
          message: 'Vui lòng đăng nhập để học từ vựng.',
        },
      });
      return;
    }
    const target = overview?.mySets[0] ?? overview?.sets[0];
    if (!target) return;

    const needsFetch = !peekCache(PrefetchKeys.vocabularySet(target.id));
    if (needsFetch) setContinueLoading(true);
    try {
      await openSet(target, 'dashboard');
    } finally {
      setContinueLoading(false);
    }
  }

  function startPracticeMode(mode: 'flashcard' | 'quiz' | 'listen') {
    if (!requireAuth('Vui lòng đăng nhập để luyện từ vựng.')) return;

    if (mode === 'listen' || mode === 'quiz' || mode === 'flashcard') {
      if (dueCount > 0) {
        void startReviewSession();
        return;
      }
      const target = overview?.mySets[0] ?? overview?.sets[0];
      if (target) void startLearnSession(target.id);
    }
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-[linear-gradient(180deg,#eef1ff_0%,#f7f8fc_42%,#f7f8fc_100%)] dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#171717_40%,#0a0a0a_100%)]">
        <div className="px-4 pt-5 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-[0_10px_24px_rgba(99,102,241,0.35)] shrink-0">
                <BookOpen size={20} strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white leading-tight">
                  Từ vựng
                </h1>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Học đều mỗi ngày, ghi nhớ lâu hơn
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setShowAllSets(true);
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-neutral-900 border border-white dark:border-neutral-800 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400"
                aria-label="Tìm bộ từ"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs px-3 py-2">
              {error}
            </div>
          )}

          <section className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Thống kê từ vựng của bạn
              </h2>
              <Sparkles size={16} className="text-indigo-400" />
            </div>

            <div className="rounded-[28px] bg-gradient-to-br from-[#6d5efc] via-[#5b6cf8] to-[#4f7df5] text-white p-5 shadow-[0_18px_40px_rgba(79,100,245,0.35)]">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[28px] font-bold leading-none">
                    {totalLearned}
                  </p>
                  <p className="text-[11px] text-white/75 mt-1.5">Đã học</p>
                </div>
                <div>
                  <p className="text-[28px] font-bold leading-none">
                    {mastered}
                  </p>
                  <p className="text-[11px] text-white/75 mt-1.5">Đã thuộc</p>
                </div>
                <div>
                  <p className="text-[28px] font-bold leading-none">
                    {learnedToday}
                  </p>
                  <p className="text-[11px] text-white/75 mt-1.5">Hôm nay</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2 text-[12px] text-white/90 mb-2">
                  <span className="w-2 h-2 rounded-full bg-orange-300 shadow-[0_0_0_3px_rgba(253,186,116,0.35)]" />
                  <span>
                    {learning} từ đang trong quá trình ghi nhớ
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-300 via-amber-200 to-white"
                    style={{ width: `${memoryBarPct}%` }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    Mới học
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />
                    Đang nhớ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    Đã thuộc
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.08)] p-3.5 flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0">
                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-indigo-50 dark:text-neutral-800"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="url(#dailyGoalGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(dailyGoalPct / 100) * 94.2} 94.2`}
                    className="text-indigo-500"
                  />
                  <defs>
                    <linearGradient
                      id="dailyGoalGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {dailyGoalPct}%
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  Mục tiêu hôm nay
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                  {dailyGoalHint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void continueTodayLearning()}
                disabled={continueLoading}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors disabled:opacity-70"
              >
                {continueLoading && (
                  <CircleReload size={13} />
                )}
                Học tiếp
              </button>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3">
              Ôn tập từ vựng đã học
            </h2>
            <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.08)] p-3.5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 dark:text-orange-400 flex items-center justify-center shrink-0">
                <RotateCcw size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  {dueCount > 0
                    ? `${dueCount} từ cần ôn hôm nay`
                    : 'Bạn đã ôn tập xong'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                  Lịch ôn được tự động sắp xếp để ghi nhớ lâu
                </p>
              </div>
              <button
                type="button"
                disabled={!dueCount || sessionBusy}
                onClick={() => void startReviewSession()}
                className="shrink-0 px-4 py-2.5 rounded-full bg-indigo-500 text-white text-xs font-bold shadow-[0_8px_18px_rgba(99,102,241,0.35)] disabled:bg-gray-200 dark:disabled:bg-neutral-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:shadow-none"
              >
                {sessionBusy ? 'Đang tải' : 'Ôn tập'}
              </button>
            </div>
          </section>

          {/* Tạm ẩn — bật lại khi làm xong chế độ luyện tập
          <section className="mt-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3">
              Chế độ luyện tập
            </h2>
            <div className="flex gap-2.5">
              <PracticeModeCard
                icon={Layers}
                label="Flashcard"
                colorClass="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400"
                onClick={() => startPracticeMode('flashcard')}
              />
              <PracticeModeCard
                icon={CheckCircle2}
                label="Trắc nghiệm"
                colorClass="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400"
                onClick={() => startPracticeMode('quiz')}
              />
              <PracticeModeCard
                icon={Volume2}
                label="Nghe & viết"
                colorClass="bg-orange-50 dark:bg-orange-950/40 text-orange-500 dark:text-orange-400"
                onClick={() => startPracticeMode('listen')}
              />
            </div>
          </section>
          */}

          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Khám phá bộ từ vựng
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setShowAllSets(true);
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className="text-xs font-semibold text-indigo-500 dark:text-indigo-400"
              >
                Xem tất cả
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {(overview?.sets ?? []).slice(0, 8).map((set) => (
                <SetCard
                  key={set.id}
                  set={set}
                  loading={busyId === set.id}
                  onClick={() => void openSet(set)}
                />
              ))}
            </div>
          </section>

          <section className="mt-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Bộ từ của bạn
              </h2>
              <Brain size={17} className="text-indigo-400" />
            </div>
            {(overview?.mySets.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {overview?.mySets.map((set) => {
                  const Icon =
                    iconMap[set.icon as keyof typeof iconMap] ?? BookOpen;
                  const colors = colorMap[set.color] ?? colorMap.blue;
                  const coverImage = vocabularyCoverMap[set.slug];
                  return (
                    <button
                      key={set.id}
                      type="button"
                      disabled={busyId === set.id}
                      onClick={() => void openSet(set, 'dashboard')}
                      className="w-full bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.08)] p-4 flex items-center gap-3 text-left"
                    >
                      <div
                        className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl ${colors.soft} ${colors.text}`}
                      >
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="h-full w-full select-none object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon size={20} />
                          </div>
                        )}
                        {busyId === set.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-white backdrop-blur-[1px]">
                            <CircleReload size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {set.title}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {set.wordCount} từ · {set.cefrLevel}
                          {(set.learnedCount ?? 0) > 0
                            ? ` · đã học ${set.learnedCount}`
                            : ''}
                        </p>
                      </div>
                      <ChevronRight size={17} className="text-gray-400 dark:text-gray-500" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.08)] p-6 text-center">
                <BookOpen size={28} className="text-indigo-200 dark:text-indigo-800 mx-auto" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-2">
                  Chưa có bộ từ nào
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Mở một bộ từ ở trên và bấm “Lưu”
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </MobileLayout>
  );
}
