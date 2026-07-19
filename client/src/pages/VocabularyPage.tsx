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
  ChevronRight,
  Clapperboard,
  Cloud,
  Code2,
  Cpu,
  Flame,
  Gamepad2,
  Globe,
  GraduationCap,
  HardDrive,
  Languages,
  Landmark,
  Loader2,
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
} as const;

const colorMap: Record<string, { bg: string; text: string; soft: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', soft: 'bg-blue-50' },
  purple: {
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    soft: 'bg-purple-50',
  },
  teal: { bg: 'bg-teal-500', text: 'text-teal-600', soft: 'bg-teal-50' },
  pink: { bg: 'bg-pink-500', text: 'text-pink-600', soft: 'bg-pink-50' },
  sky: { bg: 'bg-sky-500', text: 'text-sky-600', soft: 'bg-sky-50' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', soft: 'bg-indigo-50' },
  violet: {
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    soft: 'bg-violet-50',
  },
  red: { bg: 'bg-red-500', text: 'text-red-600', soft: 'bg-red-50' },
  cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', soft: 'bg-cyan-50' },
  green: { bg: 'bg-green-500', text: 'text-green-600', soft: 'bg-green-50' },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600',
    soft: 'bg-orange-50',
  },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', soft: 'bg-amber-50' },
  slate: { bg: 'bg-slate-500', text: 'text-slate-600', soft: 'bg-slate-50' },
};

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
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
  const progress =
    set.wordCount > 0
      ? Math.round(((set.learnedCount ?? 0) / set.wordCount) * 100)
      : 0;

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="min-w-[210px] text-left bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 disabled:opacity-80"
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-11 h-11 ${colors.soft} ${colors.text} rounded-2xl flex items-center justify-center`}
        >
          {loading ? (
            <RotateCcw size={21} className="animate-spin" />
          ) : (
            <Icon size={21} />
          )}
        </div>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded-full">
          {set.cefrLevel}
        </span>
      </div>
      <p className="font-bold text-gray-900 mt-3">{set.title}</p>
      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
        {set.description}
      </p>
      <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
        <span>{set.wordCount} từ</span>
        {(set.learnedCount ?? 0) > 0 && (
          <span>{set.learnedCount}/{set.wordCount} đã học</span>
        )}
      </div>
      {(set.learnedCount ?? 0) > 0 && (
        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full ${colors.bg} rounded-full`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  );
}

export default function VocabularyPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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

  function saveLearnedWord(word: VocabularyWord) {
    if (!isAuthenticated) return;
    void api
      .learnVocabularyWord(word.id)
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

    if (learningMode === 'review') {
      saveReviewedWord(learningWord, isCorrect);
      return;
    }

    if (isCorrect) {
      saveLearnedWord(learningWord);
    }
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
        <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
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
        <div
          className={`px-4 pt-5 min-h-screen ${
            checked ? 'bg-neutral-950 text-white' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={exitLearning}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                checked
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white dark:bg-neutral-900 card-shadow'
              }`}
              aria-label="Quay lại bộ từ"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-center">
              <p
                className={`font-bold ${
                  checked ? 'text-white' : 'text-gray-900'
                }`}
              >
                {learningMode === 'review' ? 'Ôn tập từ vựng' : 'Học từ mới'}
              </p>
              <p
                className={`text-[11px] ${
                  checked ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {learningIndex + 1}/{learningQueue.length} · Nghe và nhập từ
              </p>
            </div>
            <div className="w-9" />
          </div>

          <div
            className={`mt-5 h-2 rounded-full overflow-hidden ${
              checked ? 'bg-neutral-800' : 'bg-gray-100'
            }`}
          >
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
                <p className="text-xs text-gray-500 mt-2">
                  Nhấn để nghe lại cách phát âm
                </p>

                <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Gợi ý ký tự
                </p>
                <p className="mt-2 text-2xl font-bold tracking-[0.14em] text-gray-900 break-words">
                  {createWordHint(learningWord.word)}
                </p>

                <div className="mt-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 text-left">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold">Gợi ý</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {learningWord.meaning}
                  </p>
                  <p className="mt-2 text-xs text-gray-600">{exampleHint}</p>
                  {showExtraHint && (
                    <p className="mt-2 text-xs text-primary">
                      Phiên âm: {learningWord.phonetic || 'Chưa có phiên âm'}
                    </p>
                  )}
                  {!showExtraHint && (
                    <button
                      type="button"
                      onClick={() => setShowExtraHint(true)}
                      className="mt-3 text-xs font-semibold text-amber-700"
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
                    placeholder="Nhập từ tiếng Anh..."
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-lg font-semibold text-gray-900 outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={!learningAnswer.trim()}
                    className="mt-5 w-full rounded-2xl bg-primary py-3.5 font-semibold text-white disabled:bg-gray-200 disabled:text-gray-400"
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

              <div className="mt-5 rounded-2xl bg-neutral-900 px-4 py-4 text-left">
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold ${
                    learningResult === 'correct'
                      ? 'text-green-400'
                      : 'text-red-400'
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
                  <p className="text-3xl font-extrabold text-white">
                    {learningWord.word}
                  </p>
                  <button
                    type="button"
                    onClick={() => playWordAudio(learningWord)}
                    className="w-9 h-9 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center"
                    aria-label="Nghe phát âm"
                  >
                    <Volume2 size={17} />
                  </button>
                </div>

                {learningWord.phonetic && (
                  <p className="mt-1 text-sm text-violet-300">
                    {learningWord.phonetic}
                  </p>
                )}
                <p className="mt-2 text-lg text-white">
                  {learningWord.meaning}
                </p>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Ví dụ
                  </p>
                  <div className="mt-2 flex items-start gap-2">
                    <p className="flex-1 text-sm leading-relaxed text-white">
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
                          : 'bg-white/10 text-gray-300'
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
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">
                      {learningWord.exampleTranslation}
                    </p>
                  )}
                </div>
              </div>

              {learningResult === 'correct' ? (
                <div className="mt-4 rounded-2xl bg-neutral-900 px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center shrink-0">
                    <BookmarkCheck size={18} />
                  </div>
                  <p className="text-sm text-gray-200">
                    {learningMode === 'review'
                      ? 'Đã cập nhật lịch ôn tập của bạn'
                      : 'Đã thêm vào danh sách học của bạn'}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-center text-xs text-gray-400">
                  Hãy nhớ đáp án rồi sang từ tiếp theo.
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
              <h1 className="font-bold text-gray-900 truncate">
                {selectedSet.title}
              </h1>
              <p className="text-xs text-gray-500">Bộ từ của bạn</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-5">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900">
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
              disabled={learnedWords.length === 0}
              onClick={() => startLearningQueue(learnedWords, 'review')}
              className="w-full bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 flex items-center gap-4 text-left disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <RotateCcw size={21} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">Ôn tập ngay</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {learnedWords.length > 0
                    ? `Ôn lại ${learnedWords.length} từ đã học trong bộ này`
                    : 'Hãy học từ mới trước khi ôn tập'}
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>

            <button
              type="button"
              disabled={nextFiveWords.length === 0}
              onClick={() => startLearningQueue(nextFiveWords)}
              className="w-full bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 flex items-center gap-4 text-left disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Plus size={22} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">Học thêm 5 từ mới</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {nextFiveWords.length > 0
                    ? `Bắt đầu học ${nextFiveWords.length} từ tiếp theo`
                    : 'Bạn đã học hết bộ từ này'}
                </p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
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
              <h1 className="font-bold text-gray-900 truncate">
                {selectedSet.title}
              </h1>
              <p className="text-xs text-gray-500">
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
          <div className="mx-4 mt-3 rounded-xl bg-red-50 text-red-600 text-xs px-3 py-2">
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
                    <p className="font-bold text-gray-900">{word.word}</p>
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
                  <p className="text-xs text-gray-400">{word.phonetic}</p>
                  <p className="text-sm text-primary font-medium mt-1">
                    {word.meaning}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">{word.example}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
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

  const filteredSets =
    overview?.sets.filter((set) =>
      `${set.title} ${set.description} ${set.topic}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    ) ?? [];

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
              <h1 className="font-bold text-gray-900">Tất cả bộ từ vựng</h1>
              <p className="text-xs text-gray-500">
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
              className="w-full rounded-xl bg-white dark:bg-neutral-900 card-shadow pl-9 pr-3 py-2.5 text-sm text-gray-900 outline-none"
            />
          </div>

          {error && (
            <div className="mb-3 rounded-xl bg-red-50 text-red-600 text-xs px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-3 pb-6">
            {filteredSets.map((set) => {
              const Icon =
                iconMap[set.icon as keyof typeof iconMap] ?? BookOpen;
              const colors = colorMap[set.color] ?? colorMap.blue;
              return (
                <button
                  key={set.id}
                  type="button"
                  disabled={busyId === set.id}
                  onClick={() => void openSet(set)}
                  className="w-full bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 flex items-center gap-3 text-left disabled:opacity-80"
                >
                  <div
                    className={`w-12 h-12 ${colors.soft} ${colors.text} rounded-2xl flex items-center justify-center shrink-0`}
                  >
                    {busyId === set.id ? (
                      <RotateCcw size={21} className="animate-spin" />
                    ) : (
                      <Icon size={21} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate">
                        {set.title}
                      </p>
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 dark:bg-neutral-800 px-2 py-0.5 rounded-full shrink-0">
                        {set.cefrLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                      {set.description}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {set.topic} · {set.wordCount} từ
                      {(set.learnedCount ?? 0) > 0
                        ? ` · đã học ${set.learnedCount}`
                        : ''}
                    </p>
                  </div>
                  <ChevronRight size={17} className="text-gray-400 shrink-0" />
                </button>
              );
            })}

            {filteredSets.length === 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-6 text-center">
                <BookOpen size={28} className="text-gray-300 mx-auto" />
                <p className="text-sm text-gray-500 mt-3">
                  Không tìm thấy bộ từ phù hợp
                </p>
              </div>
            )}
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 pt-5">
        <div className="flex items-center gap-2">
          <BookOpen size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-gray-900">Từ vựng</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Học đều mỗi ngày, ghi nhớ lâu hơn
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 text-red-600 text-xs px-3 py-2">
            {error}
          </div>
        )}

        <section className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">
              Thống kê từ vựng của bạn
            </h2>
            <Sparkles size={17} className="text-primary" />
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-3xl p-5 shadow-lg">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {overview?.stats.totalLearned ?? 0}
                </p>
                <p className="text-[10px] text-white/75">Đã học</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overview?.stats.mastered ?? 0}
                </p>
                <p className="text-[10px] text-white/75">Đã thuộc</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overview?.stats.learnedToday ?? 0}
                </p>
                <p className="text-[10px] text-white/75">Hôm nay</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 text-xs">
              <Flame size={15} />
              <span>
                {overview?.stats.learning ?? 0} từ đang trong quá trình ghi nhớ
              </span>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="font-bold text-gray-900 mb-3">
            Ôn tập từ vựng đã học
          </h2>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <RotateCcw size={21} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {overview?.stats.dueCount
                  ? `${overview.stats.dueCount} từ cần ôn hôm nay`
                  : 'Bạn đã ôn tập xong'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Lịch ôn được tự động sắp xếp để ghi nhớ lâu
              </p>
            </div>
            <button
              type="button"
              disabled={!overview?.stats.dueCount}
              onClick={() =>
                startLearningQueue(overview?.dueWords ?? [], 'review')
              }
              className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold disabled:bg-gray-200 disabled:text-gray-400"
            >
              Ôn tập
            </button>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Khám phá bộ từ vựng</h2>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setShowAllSets(true);
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
              className="text-xs font-semibold text-primary"
            >
              Xem tất cả
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {(overview?.sets ?? []).slice(0, 5).map((set) => (
              <SetCard
                key={set.id}
                set={set}
                loading={busyId === set.id}
                onClick={() => void openSet(set)}
              />
            ))}
          </div>
        </section>

        <section className="mt-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Bộ từ của bạn</h2>
            <Brain size={17} className="text-primary" />
          </div>
          {(overview?.mySets.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {overview?.mySets.map((set) => {
                const Icon =
                  iconMap[set.icon as keyof typeof iconMap] ?? BookOpen;
                const colors = colorMap[set.color] ?? colorMap.blue;
                return (
                  <button
                    key={set.id}
                    type="button"
                    disabled={busyId === set.id}
                    onClick={() => void openSet(set, 'dashboard')}
                    className="w-full bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-4 flex items-center gap-3 text-left"
                  >
                    <div
                      className={`w-11 h-11 ${colors.soft} ${colors.text} rounded-2xl flex items-center justify-center`}
                    >
                      {busyId === set.id ? (
                        <RotateCcw size={20} className="animate-spin" />
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{set.title}</p>
                      <p className="text-[11px] text-gray-500">
                        {set.wordCount} từ · {set.cefrLevel}
                      </p>
                    </div>
                    <ChevronRight size={17} className="text-gray-400" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl card-shadow p-6 text-center">
              <BookOpen size={28} className="text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700 mt-2">
                Chưa có bộ từ nào
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Mở một bộ từ ở trên và bấm “Lưu bộ”
              </p>
            </div>
          )}
        </section>
      </div>
    </MobileLayout>
  );
}
