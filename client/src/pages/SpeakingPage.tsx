import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  Grid3X3,
  History,
  Languages,
  Lightbulb,
  Loader2,
  Mic,
  Plane,
  Sun,
  UserRound,
  Volume2,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import SpeakingSummaryView from '../components/SpeakingSummaryView';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import {
  ApiError,
  api,
  type CefrLevel,
  type CompleteSpeakingSessionResponse,
  type SpeakingDialect,
  type SpeakingQuota,
  type SpeakingScenario,
  type SpeakingSession,
  type SpeakingTurn,
} from '../lib/api';
import {
  playSpeakingAudio,
  SpeakingRecorder,
  speakEnglish,
  stopSpeakingAudio,
} from '../lib/speaking';
import { peekCache, setCache } from '../lib/prefetchCache';
import {
  PrefetchKeys,
  fetchSpeakingHistory,
  fetchSpeakingQuota,
  fetchSpeakingScenarios,
} from '../lib/prefetchFeatures';

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const AI_REPLY_DELAY_MS = 2_000;
const MAX_VISIBLE_SCENARIOS = 18;

function prefetchSpeakingHistorySilently(force = false) {
  void fetchSpeakingHistory(force).catch(() => undefined);
}

export type SpeakingCategory = 'all' | 'daily' | 'travel' | 'work' | 'study';

type SessionActivity =
  'idle' | 'submitting-turn' | 'waiting-ai' | 'finishing-session';

const SPEAKING_CATEGORIES = [
  { id: 'all' as const, label: 'Tất cả', icon: Grid3X3 },
  { id: 'daily' as const, label: 'Hằng ngày', icon: Sun },
  { id: 'travel' as const, label: 'Du lịch', icon: Plane },
  { id: 'work' as const, label: 'Công việc', icon: BriefcaseBusiness },
  { id: 'study' as const, label: 'Học tập', icon: BookOpen },
];

const SCENARIO_ORDER = [
  'lam-quen',
  'nha-hang',
  'san-bay',
  'khach-san',
  'mua-sam',
  'phong-van',
  'hoi-duong',
  'kham-benh',
  'goi-dien',
];

const SCENARIO_PRESENTATION: Record<
  string,
  {
    image: string;
    category: Exclude<SpeakingCategory, 'all'>;
    tint: string;
    accent: string;
  }
> = {
  'lam-quen': {
    image: '/images/speaking/redesign/intro.webp',
    category: 'daily',
    tint: '#f4efff',
    accent: '#7c4dff',
  },
  'nha-hang': {
    image: '/images/speaking/redesign/restaurant.webp',
    category: 'daily',
    tint: '#eef8ff',
    accent: '#168ff7',
  },
  'san-bay': {
    image: '/images/speaking/redesign/airport.webp',
    category: 'travel',
    tint: '#edfbf8',
    accent: '#16b6a2',
  },
  'khach-san': {
    image: '/images/speaking/redesign/hotel.webp',
    category: 'travel',
    tint: '#fff7e8',
    accent: '#ff980f',
  },
  'mua-sam': {
    image: '/images/speaking/redesign/shopping.webp',
    category: 'daily',
    tint: '#fff0f6',
    accent: '#f65b98',
  },
  'phong-van': {
    image: '/images/speaking/redesign/interview.webp',
    category: 'work',
    tint: '#f5f0ff',
    accent: '#7752e8',
  },
  'hoi-duong': {
    image: '/images/speaking/redesign/directions.webp',
    category: 'travel',
    tint: '#eef6ff',
    accent: '#397be8',
  },
  'kham-benh': {
    image: '/images/speaking/redesign/doctor.webp',
    category: 'daily',
    tint: '#eefbf6',
    accent: '#27aa7a',
  },
  'goi-dien': {
    image: '/images/speaking/redesign/phone-call.webp',
    category: 'daily',
    tint: '#fff1ec',
    accent: '#ef735e',
  },
};

export type ScenarioPresentation = (typeof SCENARIO_PRESENTATION)[string];

type SpeakingScenarioVisual = Pick<SpeakingScenario, 'slug' | 'icon' | 'color'>;

const SCENARIO_COLOR_PALETTE: Record<
  string,
  Pick<ScenarioPresentation, 'tint' | 'accent'>
> = {
  violet: { tint: '#f3efff', accent: '#7c4dff' },
  purple: { tint: '#f5f0ff', accent: '#8b5cf6' },
  indigo: { tint: '#f0f1ff', accent: '#5b5fef' },
  blue: { tint: '#edf6ff', accent: '#168ff7' },
  sky: { tint: '#ecf9ff', accent: '#38bdf8' },
  cyan: { tint: '#eafbf8', accent: '#16b6a2' },
  teal: { tint: '#ecfbf7', accent: '#14b8a6' },
  green: { tint: '#effbf5', accent: '#27b27c' },
  orange: { tint: '#fff5e9', accent: '#ff8a1f' },
  amber: { tint: '#fff8e8', accent: '#f59e0b' },
  pink: { tint: '#fff0f6', accent: '#f65b98' },
  red: { tint: '#fff0f0', accent: '#ef5350' },
};

const LEVEL_SCENARIO_SLUG = /^(a1|a2|b1|b2|c1)-/;

const TRAVEL_SCENARIO_ICONS = new Set([
  'bike',
  'bus',
  'globe',
  'hotel',
  'luggage',
  'map-pin',
  'plane',
  'train',
]);

const STUDY_SCENARIO_ICONS = new Set([
  'book',
  'book-open',
  'brain-circuit',
  'flask-conical',
  'graduation-cap',
  'school',
]);

const WORK_SCENARIO_KEYWORDS = [
  'bai-phat-bieu',
  'chien-luoc',
  'cong-viec',
  'dich-vu',
  'doanh-nghiep',
  'du-an',
  'goi-von',
  'hop-dong',
  'hoi-nghi',
  'khach-hang',
  'khung-hoang',
  'lam-viec',
  'ngan-sach',
  'phan-tich-thi-truong',
  'phong-van',
  'thay-doi',
  'tranh-chap',
  'truyen-thong',
  'xung-dot',
];

export function getScenarioCategory(
  scenario: SpeakingScenarioVisual,
): Exclude<SpeakingCategory, 'all'> {
  const configured = SCENARIO_PRESENTATION[scenario.slug];
  if (configured) return configured.category;

  if (TRAVEL_SCENARIO_ICONS.has(scenario.icon)) return 'travel';
  if (STUDY_SCENARIO_ICONS.has(scenario.icon)) return 'study';
  if (
    WORK_SCENARIO_KEYWORDS.some((keyword) => scenario.slug.includes(keyword))
  ) {
    return 'work';
  }
  return 'daily';
}

export function getScenarioPresentation(
  scenario: SpeakingScenarioVisual,
): ScenarioPresentation {
  const configured = SCENARIO_PRESENTATION[scenario.slug];
  if (configured) return configured;

  const category = getScenarioCategory(scenario);
  const scenarioPalette = SCENARIO_COLOR_PALETTE[scenario.color];
  const categoryPalette: Record<
    Exclude<SpeakingCategory, 'all'>,
    Pick<ScenarioPresentation, 'tint' | 'accent'>
  > = {
    daily: { tint: '#f4efff', accent: '#7c4dff' },
    travel: { tint: '#eef8ff', accent: '#168ff7' },
    work: { tint: '#f5f0ff', accent: '#7752e8' },
    study: { tint: '#effbf5', accent: '#27aa7a' },
  };
  const palette = scenarioPalette ?? categoryPalette[category];

  if (LEVEL_SCENARIO_SLUG.test(scenario.slug)) {
    return {
      image: `/images/speaking/scenarios/${scenario.slug}.webp`,
      category,
      ...palette,
    };
  }

  const image = (() => {
    if (['coffee', 'utensils', 'cake-slice'].includes(scenario.icon)) {
      return '/images/speaking/redesign/restaurant.webp';
    }
    if (scenario.icon === 'hotel') {
      return '/images/speaking/redesign/hotel.webp';
    }
    if (TRAVEL_SCENARIO_ICONS.has(scenario.icon)) {
      return scenario.icon === 'map-pin'
        ? '/images/speaking/redesign/directions.webp'
        : '/images/speaking/redesign/airport.webp';
    }
    if (['shopping-bag', 'shopping-basket', 'store'].includes(scenario.icon)) {
      return '/images/speaking/redesign/shopping.webp';
    }
    if (['stethoscope', 'pill', 'hospital'].includes(scenario.icon)) {
      return '/images/speaking/redesign/doctor.webp';
    }
    if (['phone', 'phone-call'].includes(scenario.icon)) {
      return '/images/speaking/redesign/phone-call.webp';
    }
    if (category === 'work') {
      return '/images/speaking/redesign/interview.webp';
    }
    return '/images/speaking/redesign/intro.webp';
  })();

  return { image, category, ...palette };
}

function getScenarioOrder(slug: string) {
  const index = SCENARIO_ORDER.indexOf(slug);
  return index === -1 ? SCENARIO_ORDER.length : index;
}

function formatSpeakingSuggestion(text: string) {
  return text.replace(
    /\[\s*your\s+name\s*\]|\(\s*your\s+name\s*\)|<\s*your\s+name\s*>|\byour\s+name\b/gi,
    'Nam',
  );
}

function AiAvatar() {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/15 dark:bg-neutral-900"
      aria-label="Trợ lý AI"
    >
      <img
        src="/images/speaking/ai-robot-avatar.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full scale-[1.65] select-none object-cover object-center"
      />
    </div>
  );
}

function LearnerAvatar({
  name,
  src,
}: {
  name?: string | null;
  src?: string | null;
}) {
  if (name) {
    return (
      <UserAvatar
        name={name}
        src={src}
        size="xs"
        className="!h-7 !w-7 ring-1 ring-white/10"
      />
    );
  }

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-gray-300 ring-1 ring-white/10"
      aria-label="Khách"
    >
      <UserRound size={17} />
    </div>
  );
}

export default function SpeakingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cachedScenarios = peekCache<SpeakingScenario[]>(
    PrefetchKeys.speakingScenarios,
  );
  const cachedQuota = peekCache<SpeakingQuota>(PrefetchKeys.speakingQuota);

  const [step, setStep] = useState<
    'select' | 'starting' | 'session' | 'finalizing' | 'summary'
  >('select');
  const [scenarios, setScenarios] = useState<SpeakingScenario[]>(
    () => cachedScenarios ?? [],
  );
  const [quota, setQuota] = useState<SpeakingQuota | null>(
    () => cachedQuota ?? null,
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const level: CefrLevel = 'A2';
  const [selectedCategory, setSelectedCategory] =
    useState<SpeakingCategory>('all');
  const dialect: SpeakingDialect = 'EN_US';
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [turns, setTurns] = useState<SpeakingTurn[]>([]);
  const [summary, setSummary] = useState<
    CompleteSpeakingSessionResponse['summary'] | null
  >(null);
  const [loading, setLoading] = useState(() => !cachedScenarios);
  const [starting, setStarting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sessionActivity, setSessionActivity] =
    useState<SessionActivity>('idle');
  const [error, setError] = useState('');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [visibleTranslationKeys, setVisibleTranslationKeys] = useState<
    Set<string>
  >(() => new Set());
  const [translatingKey, setTranslatingKey] = useState<string | null>(null);
  const translationRequestsRef = useRef<
    Partial<Record<string, Promise<string>>>
  >({});
  const [recorder] = useState(() => new SpeakingRecorder());
  const audioUrlsRef = useRef<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const startAbortControllerRef = useRef<AbortController | null>(null);
  const submitPromiseRef = useRef<Promise<boolean> | null>(null);
  const pendingAiRevealRef = useRef<{
    sessionId: string;
    turn: SpeakingTurn;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const finishPromiseRef = useRef<{
    sessionId: string;
    promise: Promise<void>;
  } | null>(null);
  const finishDestinationRef = useRef<Record<string, 'summary' | 'selection'>>(
    {},
  );

  const processing = sessionActivity === 'submitting-turn';
  const waitingForAi = sessionActivity === 'waiting-ai';
  const sessionBusy = processing || waitingForAi;

  const latestTurn = turns.at(-1) ?? null;
  const startingScenario = scenarios.find(
    (scenario) => scenario.id === selectedScenarioId,
  );
  const visibleScenarios = scenarios.filter(
    (scenario) =>
      CEFR_LEVELS.indexOf(level) >= CEFR_LEVELS.indexOf(scenario.minLevel) &&
      CEFR_LEVELS.indexOf(level) <= CEFR_LEVELS.indexOf(scenario.maxLevel),
  );
  const orderedScenarios = [...visibleScenarios].sort(
    (left, right) => getScenarioOrder(left.slug) - getScenarioOrder(right.slug),
  );
  const filteredScenarios = orderedScenarios.filter((scenario) => {
    if (selectedCategory === 'all') return true;
    return getScenarioCategory(scenario) === selectedCategory;
  });
  const displayedScenarios = filteredScenarios.slice(0, MAX_VISIBLE_SCENARIOS);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [nextScenarios, nextQuota] = await Promise.all([
          fetchSpeakingScenarios(),
          fetchSpeakingQuota(),
        ]);
        if (cancelled) return;
        setScenarios(nextScenarios);
        setQuota(nextQuota);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Không tải được luyện nói',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      startAbortControllerRef.current?.abort();
      if (pendingAiRevealRef.current) {
        clearTimeout(pendingAiRevealRef.current.timeoutId);
        pendingAiRevealRef.current = null;
      }
      recorder.cancel();
      stopSpeakingAudio();
      Object.values(audioUrlsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, [recorder]);

  useEffect(() => {
    prefetchSpeakingHistorySilently();
  }, []);

  useEffect(() => {
    if (step !== 'session') return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [step, turns, processing]);

  useEffect(() => {
    if (step !== 'session') return;

    turns.forEach((turn) => {
      const key = `ai-${turn.id}`;
      if (turn.aiReply && !translations[key]) {
        void requestTranslation(key, turn.aiReply).catch(() => undefined);
      }
    });

    const latestTurnWithSuggestion = turns.at(-1);
    const suggestionKey = latestTurnWithSuggestion
      ? `suggestion-${latestTurnWithSuggestion.id}`
      : null;
    if (
      !processing &&
      suggestionKey &&
      latestTurnWithSuggestion?.suggestion &&
      !translations[suggestionKey]
    ) {
      void requestTranslation(
        suggestionKey,
        formatSpeakingSuggestion(latestTurnWithSuggestion.suggestion),
      ).catch(() => undefined);
    }
  }, [processing, step, translations, turns]);

  function goToSpeakingUpgrade() {
    void navigate('/nang-cap', {
      state: {
        from: '/luyen-noi',
        message:
          'Bạn đã hết 3 lượt luyện nói miễn phí hôm nay. Nâng cấp Premium để tiếp tục.',
      },
    });
  }

  async function startSession(scenarioId: string) {
    if (quota && !quota.isPremium && (quota.remaining ?? 0) <= 0) {
      goToSpeakingUpgrade();
      return;
    }

    setSelectedScenarioId(scenarioId);
    setStarting(true);
    setError('');
    setTranslations({});
    setVisibleTranslationKeys(new Set());
    setStep('starting');
    startAbortControllerRef.current?.abort();
    const controller = new AbortController();
    startAbortControllerRef.current = controller;
    try {
      const result = await api.createSpeakingSession(
        {
          scenarioId,
          level,
          dialect,
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setSession(result.session);
      setTurns([result.turn]);
      setQuota(result.quota);
      setCache(PrefetchKeys.speakingQuota, result.quota);
      setStep('session');
      if (result.turn.aiReply) speakEnglish(result.turn.aiReply);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Không bắt đầu được phiên');
      setStep('select');
    } finally {
      if (startAbortControllerRef.current === controller) {
        startAbortControllerRef.current = null;
        setStarting(false);
        setSelectedScenarioId(null);
      }
    }
  }

  function cancelStartingSession() {
    startAbortControllerRef.current?.abort();
    startAbortControllerRef.current = null;
    setStarting(false);
    setSelectedScenarioId(null);
    setStep('select');
  }

  async function toggleRecording() {
    if (sessionBusy) return;
    setError('');

    if (
      !recording &&
      quota &&
      !quota.isPremium &&
      (quota.remaining ?? 0) <= 0
    ) {
      goToSpeakingUpgrade();
      return;
    }

    if (!recording) {
      try {
        stopSpeakingAudio();
        await recorder.start(() => {
          void stopAndSubmit();
        });
        setRecording(true);
      } catch {
        setError('Không mở được micro. Hãy cấp quyền microphone và thử lại.');
      }
      return;
    }

    await stopAndSubmit();
  }

  function revealPendingAiTurn(sessionId: string, speak = true) {
    const pending = pendingAiRevealRef.current;
    if (!pending || pending.sessionId !== sessionId) return null;

    clearTimeout(pending.timeoutId);
    pendingAiRevealRef.current = null;
    setTurns((current) =>
      current.map((turn) =>
        turn.id === pending.turn.id ? pending.turn : turn,
      ),
    );
    setSessionActivity((current) =>
      current === 'waiting-ai' ? 'idle' : current,
    );
    if (speak && pending.turn.aiReply) {
      speakEnglish(pending.turn.aiReply);
    }
    return pending.turn;
  }

  function cancelPendingAiTurn(sessionId: string) {
    const pending = pendingAiRevealRef.current;
    if (!pending || pending.sessionId !== sessionId) return null;

    clearTimeout(pending.timeoutId);
    pendingAiRevealRef.current = null;
    setSessionActivity((current) =>
      current === 'waiting-ai' ? 'idle' : current,
    );
    return pending.turn;
  }

  function stopAndSubmit(background = false): Promise<boolean> {
    if (submitPromiseRef.current !== null) return submitPromiseRef.current;
    if (!session) return Promise.resolve(false);

    const activeSessionId = session.id;
    const request = (async () => {
      setRecording(false);
      if (!background) {
        setSessionActivity('submitting-turn');
        setError('');
      }
      try {
        const { blob, durationMs } = await recorder.stop();
        const result = await api.submitSpeakingTurn(
          activeSessionId,
          blob,
          durationMs,
        );
        setQuota(result.quota);
        setCache(PrefetchKeys.speakingQuota, result.quota);
        const destination = finishDestinationRef.current[activeSessionId];
        if (destination === undefined) {
          audioUrlsRef.current[result.turn.id] = URL.createObjectURL(blob);
          if (result.turn.aiReply) {
            const waitingTurn: SpeakingTurn = {
              ...result.turn,
              aiReply: null,
              suggestion: null,
            };
            setTurns((current) => [...current, waitingTurn]);
            setSessionActivity('waiting-ai');
            const timeoutId = setTimeout(() => {
              revealPendingAiTurn(activeSessionId);
            }, AI_REPLY_DELAY_MS);
            pendingAiRevealRef.current = {
              sessionId: activeSessionId,
              turn: result.turn,
              timeoutId,
            };
          } else {
            setTurns((current) => [...current, result.turn]);
          }
        } else if (destination === 'summary') {
          setTurns((current) => [...current, result.turn]);
        }
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'SPEAKING_QUOTA_EXCEEDED') {
          if (finishDestinationRef.current[activeSessionId] !== 'selection') {
            goToSpeakingUpgrade();
          }
          return false;
        }
        if (finishDestinationRef.current[activeSessionId] !== 'selection') {
          setError(
            err instanceof Error ? err.message : 'Không chấm được bản ghi',
          );
        }
        return false;
      } finally {
        submitPromiseRef.current = null;
        if (!background) {
          setSessionActivity((current) =>
            current === 'submitting-turn' ? 'idle' : current,
          );
        }
      }
    })();

    submitPromiseRef.current = request;
    return request;
  }

  function clearSessionAudio() {
    stopSpeakingAudio();
    Object.values(audioUrlsRef.current).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    audioUrlsRef.current = {};
  }

  function resetSessionView() {
    if (session) {
      cancelPendingAiTurn(session.id);
    }
    clearSessionAudio();
    setTranslations({});
    setVisibleTranslationKeys(new Set());
    setStep('select');
    setSession(null);
    setTurns([]);
    setSummary(null);
    setRecording(false);
    setSessionActivity('idle');
  }

  function playUserMessage(turn: SpeakingTurn) {
    const audioUrl = audioUrlsRef.current[turn.id];
    if (audioUrl) {
      void playSpeakingAudio(audioUrl, turn.transcript ?? '');
      return;
    }
    speakEnglish(turn.transcript ?? '');
  }

  function requestTranslation(key: string, text: string) {
    const pending = translationRequestsRef.current[key];
    if (pending !== undefined) return pending;

    const request = api
      .translateSpeakingText(text)
      .then((result) => {
        setTranslations((current) => ({
          ...current,
          [key]: result.translation,
        }));
        return result.translation;
      })
      .finally(() => {
        delete translationRequestsRef.current[key];
      });

    translationRequestsRef.current[key] = request;
    return request;
  }

  async function toggleTranslation(key: string, text: string) {
    if (visibleTranslationKeys.has(key)) {
      setVisibleTranslationKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      return;
    }

    if (translations[key]) {
      setVisibleTranslationKeys((current) => new Set(current).add(key));
      return;
    }

    setTranslatingKey(key);
    try {
      await requestTranslation(key, text);
      setVisibleTranslationKeys((current) => new Set(current).add(key));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không dịch được nội dung');
    } finally {
      setTranslatingKey(null);
    }
  }

  function finishSession(returnToSelection = false) {
    if (!session) return;

    const activeSession = session;
    const delayedAiTurn = cancelPendingAiTurn(activeSession.id);
    const existingFinish = finishPromiseRef.current;
    finishDestinationRef.current[activeSession.id] = returnToSelection
      ? 'selection'
      : 'summary';

    if (returnToSelection) {
      resetSessionView();
    } else {
      stopSpeakingAudio();
      setError('');
      setSessionActivity('finishing-session');
      setStep('finalizing');
    }

    if (existingFinish?.sessionId === activeSession.id) return;

    const pendingSubmission = recording
      ? stopAndSubmit(returnToSelection)
      : submitPromiseRef.current;
    if (!returnToSelection) {
      setSessionActivity('finishing-session');
    }
    const finishRequest = (async () => {
      const submitted =
        pendingSubmission !== null ? await pendingSubmission : true;
      if (
        !submitted &&
        finishDestinationRef.current[activeSession.id] === 'summary'
      ) {
        setSessionActivity('idle');
        setStep('session');
        return;
      }

      try {
        const result = await api.completeSpeakingSession(activeSession.id);
        setQuota(result.quota);
        setCache(PrefetchKeys.speakingQuota, result.quota);
        prefetchSpeakingHistorySilently(true);

        if (finishDestinationRef.current[activeSession.id] === 'summary') {
          setSession(result.session);
          setTurns(result.turns);
          setSummary(result.summary);
          setStep('summary');
        }
      } catch (err) {
        if (finishDestinationRef.current[activeSession.id] === 'summary') {
          if (delayedAiTurn) {
            setTurns((current) =>
              current.map((turn) =>
                turn.id === delayedAiTurn.id ? delayedAiTurn : turn,
              ),
            );
          }
          setError(
            err instanceof Error ? err.message : 'Không kết thúc được phiên',
          );
          setStep('session');
        }
      } finally {
        if (finishPromiseRef.current?.sessionId === activeSession.id) {
          finishPromiseRef.current = null;
        }
        delete finishDestinationRef.current[activeSession.id];
        setSessionActivity((current) =>
          current === 'finishing-session' ? 'idle' : current,
        );
      }
    })();

    finishPromiseRef.current = {
      sessionId: activeSession.id,
      promise: finishRequest,
    };
  }

  function leaveFinalizing() {
    if (session) {
      finishDestinationRef.current[session.id] = 'selection';
    }
    resetSessionView();
  }

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center gap-2 p-8 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Đang tải luyện nói...
        </div>
      </MobileLayout>
    );
  }

  if (step === 'finalizing' && session) {
    return (
      <MobileLayout showPlayer={false} showNav={false}>
        <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-black dark:text-white">
          <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 pb-3 pt-4 backdrop-blur dark:border-white/10 dark:bg-black/95">
            <div className="grid grid-cols-[40px_1fr_40px] items-center">
              <button
                type="button"
                onClick={leaveFinalizing}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 dark:bg-neutral-900 dark:text-white"
                aria-label="Về danh sách tình huống"
              >
                <ArrowLeft size={18} />
              </button>
              <p className="truncate px-3 text-center font-bold">
                {session.scenario.title}
              </p>
              <span aria-hidden="true" />
            </div>
          </div>

          <main className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center">
            <Loader2
              size={38}
              className="animate-spin text-violet-600 dark:text-violet-400"
              aria-hidden="true"
            />
            <h1 className="mt-5 text-xl font-bold">Đang tổng hợp kết quả</h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500 dark:text-gray-400">
              Phản hồi đã được lưu. Điểm luyện nói sẽ hiển thị sau giây lát.
            </p>
          </main>
        </div>
      </MobileLayout>
    );
  }

  if (step === 'summary' && summary && session) {
    const retryScenarioId = session.scenario.id;

    function retryScenario() {
      resetSessionView();
      void startSession(retryScenarioId);
    }

    function returnToSpeakingPage() {
      resetSessionView();
      void navigate('/luyen-noi', { replace: true });
    }

    return (
      <MobileLayout showPlayer={false} showNav={false}>
        <SpeakingSummaryView
          summary={summary}
          onBack={returnToSpeakingPage}
          onChooseAnother={resetSessionView}
          onRetry={retryScenario}
          onHome={() => void navigate('/')}
        />
      </MobileLayout>
    );
  }

  if (step === 'starting' && startingScenario) {
    return (
      <MobileLayout showPlayer={false} showNav={false}>
        <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-black dark:text-white">
          <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 pb-3 pt-4 backdrop-blur dark:border-white/10 dark:bg-black/95">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={cancelStartingSession}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 dark:bg-neutral-900 dark:text-white"
                aria-label="Quay lại"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-white">
                  {startingScenario.title}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelStartingSession}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400"
              >
                Kết thúc
              </button>
            </div>
          </div>

          <div className="flex-1 px-3 py-5">
            <div className="flex items-end gap-2">
              <div className="mb-1">
                <AiAvatar />
              </div>
              <div className="flex items-center gap-2 rounded-[20px] rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm dark:border-transparent dark:bg-neutral-800 dark:text-gray-300">
                <Loader2 size={17} className="animate-spin text-violet-400" />
                Đang chuẩn bị cuộc trò chuyện...
              </div>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (step === 'session' && session && latestTurn) {
    return (
      <MobileLayout showPlayer={false} showNav={false}>
        <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-black dark:text-white">
          <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 pb-3 pt-4 backdrop-blur dark:border-white/10 dark:bg-black/95">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => void finishSession(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-900 dark:bg-neutral-900 dark:text-white"
                aria-label="Kết thúc, tính điểm và quay lại"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-white">
                  {session.scenario.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void finishSession()}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400"
              >
                Kết thúc
              </button>
            </div>
          </div>

          <div className="flex-1 px-3 py-5 space-y-3">
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                {turn.transcript && (
                  <>
                    <div className="flex items-end justify-end gap-2">
                      <div className="max-w-[80%] rounded-[20px] rounded-br-md bg-violet-600 px-4 py-2.5">
                        <p className="text-[15px] leading-snug text-white">
                          {turn.transcript}
                        </p>
                        {visibleTranslationKeys.has(`user-${turn.id}`) &&
                          translations[`user-${turn.id}`] && (
                            <p className="mt-2 pt-2 border-t border-white/20 text-xs leading-relaxed text-violet-100">
                              {translations[`user-${turn.id}`]}
                            </p>
                          )}
                        <div className="mt-1.5 flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => playUserMessage(turn)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-violet-100 hover:bg-white/10"
                            aria-label="Nghe lại lời của bạn"
                          >
                            <Volume2 size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={translatingKey === `user-${turn.id}`}
                            onClick={() =>
                              void toggleTranslation(
                                `user-${turn.id}`,
                                turn.transcript ?? '',
                              )
                            }
                            className="w-7 h-7 rounded-full flex items-center justify-center text-violet-100 hover:bg-white/10 disabled:opacity-50"
                            aria-label="Dịch sang tiếng Việt"
                          >
                            {translatingKey === `user-${turn.id}` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Languages size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="mb-1 shrink-0">
                        <LearnerAvatar
                          name={user?.fullName}
                          src={user?.avatarUrl}
                        />
                      </div>
                    </div>
                    {turn.feedback && (
                      <div className="ml-auto mr-9 max-w-[84%] rounded-2xl bg-violet-50 px-3 py-2 text-xs dark:bg-violet-950/35">
                        <p className="text-gray-700 dark:text-gray-300">
                          {turn.feedback}
                        </p>
                        {turn.scores.overall != null && (
                          <p className="mt-1.5 text-gray-500">
                            Điểm: {Math.round(turn.scores.overall)}/100
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {turn.aiReply && (
                  <div className="flex items-end gap-2">
                    <div className="mb-1">
                      <AiAvatar />
                    </div>
                    <div className="max-w-[80%] rounded-[20px] rounded-bl-md border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-transparent dark:bg-neutral-800 dark:shadow-none">
                      <p className="text-[15px] leading-snug text-gray-900 dark:text-white">
                        {turn.aiReply}
                      </p>
                      {visibleTranslationKeys.has(`ai-${turn.id}`) &&
                        translations[`ai-${turn.id}`] && (
                          <p className="mt-2 border-t border-gray-200 pt-2 text-xs leading-relaxed text-gray-600 dark:border-white/10 dark:text-gray-300">
                            {translations[`ai-${turn.id}`]}
                          </p>
                        )}
                      <div className="mt-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => speakEnglish(turn.aiReply ?? '')}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                          aria-label="Nghe lại lời AI"
                        >
                          <Volume2 size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={translatingKey === `ai-${turn.id}`}
                          onClick={() =>
                            void toggleTranslation(
                              `ai-${turn.id}`,
                              turn.aiReply ?? '',
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10"
                          aria-label="Dịch sang tiếng Việt"
                        >
                          {translatingKey === `ai-${turn.id}` ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Languages size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {turn.suggestion &&
                  turn.id === latestTurn.id &&
                  !sessionBusy && (
                    <div className="ml-auto max-w-[88%] rounded-2xl border border-violet-200 bg-violet-50 px-3.5 py-3 dark:border-violet-500/25 dark:bg-violet-950/25">
                      <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
                        <Lightbulb size={15} />
                        <p className="text-xs font-semibold">
                          Gợi ý bạn có thể nói
                        </p>
                      </div>
                      <p className="mt-2 text-[15px] leading-snug text-gray-900 dark:text-white">
                        “{formatSpeakingSuggestion(turn.suggestion)}”
                      </p>
                      {visibleTranslationKeys.has(`suggestion-${turn.id}`) &&
                        translations[`suggestion-${turn.id}`] && (
                          <p className="mt-2 border-t border-violet-200 pt-2 text-xs leading-relaxed text-gray-600 dark:border-white/10 dark:text-gray-300">
                            {translations[`suggestion-${turn.id}`]}
                          </p>
                        )}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            speakEnglish(
                              formatSpeakingSuggestion(turn.suggestion ?? ''),
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-violet-100 dark:border-transparent dark:bg-white/10 dark:text-gray-200 dark:shadow-none dark:hover:bg-white/15"
                        >
                          <Volume2 size={13} />
                          Nghe mẫu
                        </button>
                        <button
                          type="button"
                          disabled={translatingKey === `suggestion-${turn.id}`}
                          onClick={() =>
                            void toggleTranslation(
                              `suggestion-${turn.id}`,
                              formatSpeakingSuggestion(turn.suggestion ?? ''),
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-violet-100 disabled:opacity-50 dark:border-transparent dark:bg-white/10 dark:text-gray-200 dark:shadow-none dark:hover:bg-white/15"
                        >
                          {translatingKey === `suggestion-${turn.id}` ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Languages size={13} />
                          )}
                          Dịch nghĩa
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] text-gray-500">
                        Bấm micro để đọc câu này hoặc tự trả lời theo cách của
                        bạn.
                      </p>
                    </div>
                  )}
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>

          <div className="sticky bottom-0 flex flex-col items-center border-t border-gray-200 bg-white/95 px-4 pb-5 pt-3 backdrop-blur dark:border-white/10 dark:bg-black/95">
            <div className="relative">
              {!sessionBusy && (
                <>
                  <span
                    className={`pointer-events-none absolute inset-0 rounded-full animate-ping opacity-25 ${
                      recording ? 'bg-red-500' : 'bg-primary'
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute -inset-2 rounded-full animate-ping opacity-15 [animation-delay:500ms] [animation-duration:1.5s] ${
                      recording ? 'bg-red-500' : 'bg-primary'
                    }`}
                  />
                </>
              )}
              <button
                type="button"
                disabled={sessionBusy}
                onClick={() => void toggleRecording()}
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg ${
                  recording
                    ? 'bg-red-500'
                    : sessionBusy
                      ? 'bg-gray-400'
                      : 'gradient-btn'
                }`}
              >
                {processing ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : (
                  <Mic size={28} className={waitingForAi ? 'opacity-65' : ''} />
                )}
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {processing
                ? 'Đang nhận diện và phản hồi...'
                : waitingForAi
                  ? 'AI đang suy nghĩ...'
                  : recording
                    ? 'Đang ghi âm · bấm để gửi'
                    : 'Bấm để nói'}
            </p>
            {error && (
              <div className="mt-2 w-full rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-600 dark:bg-red-950/70 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-[calc(100vh-6rem)] bg-[#f8f9ff] text-[#111c54] dark:bg-neutral-950 dark:text-white">
        <header className="relative h-[230px] overflow-hidden bg-[#f5f4ff] dark:bg-neutral-950">
          <img
            src="/images/speaking/redesign/hero.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-cover dark:brightness-[0.52] dark:saturate-[0.8]"
          />

          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4">
            <button
              type="button"
              onClick={() => void navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff] text-[#15245d] shadow-[0_8px_22px_rgba(43,50,102,0.12)] transition active:scale-95 dark:bg-neutral-900/95 dark:text-white dark:shadow-[0_8px_22px_rgba(0,0,0,0.3)]"
              aria-label="Quay lại"
            >
              <ArrowLeft size={21} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onPointerEnter={() => prefetchSpeakingHistorySilently()}
              onFocus={() => prefetchSpeakingHistorySilently()}
              onTouchStart={() => prefetchSpeakingHistorySilently()}
              onClick={() => void navigate('/luyen-noi/lich-su')}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ffffff] px-3.5 text-[12px] font-bold text-[#17255f] shadow-[0_8px_22px_rgba(43,50,102,0.12)] transition active:scale-95 dark:bg-neutral-900/95 dark:text-white dark:shadow-[0_8px_22px_rgba(0,0,0,0.3)]"
            >
              <History size={17} className="text-[#6945e8]" />
              Lịch sử
            </button>
          </div>

          <div className="absolute bottom-7 left-5 z-10 max-w-[205px]">
            <div className="flex items-center gap-2">
              <h1 className="whitespace-nowrap text-[34px] font-black leading-none tracking-[-1.2px] text-[#101d59] dark:text-white">
                Luyện nói
              </h1>
              <Mic size={29} className="shrink-0 text-[#7648e8]" />
            </div>
            <p className="mt-3 max-w-[164px] text-[13px] font-medium leading-5 text-[#64709a] dark:text-gray-300">
              Thực hành giao tiếp, nói tiếng Anh tự tin mỗi ngày
            </p>
          </div>
        </header>

        <main className="relative z-20 -mt-5 rounded-t-[30px] bg-[#ffffff] px-4 pb-7 pt-6 shadow-[0_-8px_28px_rgba(57,62,116,0.05)] dark:bg-neutral-950 dark:shadow-[0_-8px_28px_rgba(0,0,0,0.35)]">
          {error && (
            <div className="mb-4 rounded-xl bg-[#fff1f2] px-3 py-2 text-xs text-[#e5485d] dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-extrabold text-[#111c54] dark:text-white">
                Chọn tình huống
              </h2>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-1">
                {SPEAKING_CATEGORIES.map((category) => {
                  const CategoryIcon = category.icon;
                  const selected = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`inline-flex h-9 items-center gap-1 rounded-full border px-1.5 text-[10px] font-bold transition active:scale-[0.97] ${
                        selected
                          ? 'border-[#7448ec] bg-[#7448ec] text-white shadow-[0_6px_15px_rgba(116,72,236,0.24)]'
                          : 'border-[#e5e8f2] bg-[#f8f9fd] text-[#586486] dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-300'
                      }`}
                      aria-pressed={selected}
                    >
                      <CategoryIcon size={15} />
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 min-[390px]:grid-cols-3">
              {displayedScenarios.map((scenario) => {
                const presentation = getScenarioPresentation(scenario);
                const active = selectedScenarioId === scenario.id;

                return (
                  <button
                    key={scenario.id}
                    data-scenario-slug={scenario.slug}
                    type="button"
                    disabled={starting}
                    onClick={() => void startSession(scenario.id)}
                    className="group relative flex min-h-[190px] w-full flex-col overflow-hidden rounded-[18px] border text-left shadow-[0_8px_22px_rgba(28,39,94,0.08)] transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 dark:!border-neutral-700 dark:!bg-neutral-900 dark:shadow-[0_8px_22px_rgba(0,0,0,0.28)]"
                    style={{
                      backgroundColor: presentation.tint,
                      borderColor: `${presentation.accent}24`,
                    }}
                    aria-label={scenario.title}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-[#f3f4fb] dark:bg-neutral-800">
                      <img
                        src={presentation.image}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="h-full w-full select-none object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-2.5">
                      <div className="flex items-start gap-1">
                        <p className="line-clamp-2 min-h-[20px] flex-1 text-[12px] font-extrabold leading-4 text-[#142158] dark:text-white">
                          {scenario.title}
                        </p>
                        <span
                          className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                          style={{ backgroundColor: presentation.accent }}
                        >
                          {active ? (
                            <Loader2 size={9} className="animate-spin" />
                          ) : (
                            <ChevronRight size={9} strokeWidth={2.7} />
                          )}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[9px] font-medium leading-[13px] text-[#6c7694] dark:text-gray-400">
                        {scenario.description}
                      </p>
                      <span className="sr-only">
                        Bạn: {scenario.learnerRole} · AI: {scenario.aiRole}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredScenarios.length === 0 && (
              <div className="mt-3 rounded-[20px] border border-[#e8eaf3] bg-[#f8f9fd] px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
                <p className="text-sm font-bold text-[#26325f] dark:text-white">
                  Chưa có tình huống phù hợp
                </p>
                <p className="mt-1 text-[11px] text-[#8a93ad] dark:text-gray-400">
                  Hãy chọn một nhóm chủ đề khác hoặc đổi cấp độ.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </MobileLayout>
  );
}
