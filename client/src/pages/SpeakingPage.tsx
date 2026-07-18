import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Hotel,
  Languages,
  Loader2,
  MapPin,
  Mic,
  Phone,
  Plane,
  ShoppingBag,
  Smile,
  Stethoscope,
  Users,
  Utensils,
  UserRound,
  Volume2,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
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
import { SpeakingRecorder, speakEnglish } from '../lib/speaking';
import { peekCache, setCache } from '../lib/prefetchCache';
import {
  PrefetchKeys,
  fetchSpeakingQuota,
  fetchSpeakingScenarios,
} from '../lib/prefetchFeatures';

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const iconMap = {
  plane: Plane,
  utensils: Utensils,
  hotel: Hotel,
  briefcase: Briefcase,
  'shopping-bag': ShoppingBag,
  'map-pin': MapPin,
  stethoscope: Stethoscope,
  users: Users,
  smile: Smile,
  phone: Phone,
} as const;

const colorMap: Record<string, string> = {
  sky: 'bg-sky-50 text-sky-600',
  orange: 'bg-orange-50 text-orange-600',
  violet: 'bg-violet-50 text-violet-600',
  teal: 'bg-teal-50 text-teal-600',
  pink: 'bg-pink-50 text-pink-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
};

function ScorePill({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-neutral-800 px-2.5 py-2 text-center">
      <p className="text-sm font-bold text-gray-900">{Math.round(value)}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

export default function SpeakingPage() {
  const navigate = useNavigate();
  const cachedScenarios = peekCache<SpeakingScenario[]>(
    PrefetchKeys.speakingScenarios,
  );
  const cachedQuota = peekCache<SpeakingQuota>(PrefetchKeys.speakingQuota);

  const [step, setStep] = useState<'select' | 'session' | 'summary'>('select');
  const [scenarios, setScenarios] = useState<SpeakingScenario[]>(
    () => cachedScenarios ?? [],
  );
  const [quota, setQuota] = useState<SpeakingQuota | null>(
    () => cachedQuota ?? null,
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );
  const [level, setLevel] = useState<CefrLevel>('A2');
  const dialect: SpeakingDialect = 'EN_US';
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [turns, setTurns] = useState<SpeakingTurn[]>([]);
  const [summary, setSummary] =
    useState<CompleteSpeakingSessionResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(() => !cachedScenarios);
  const [starting, setStarting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingKey, setTranslatingKey] = useState<string | null>(null);
  const [recorder] = useState(() => new SpeakingRecorder());
  const audioUrlsRef = useRef<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  const latestTurn = turns.at(-1) ?? null;
  const supportedLevels = CEFR_LEVELS.filter((item) =>
    scenarios.some(
      (scenario) =>
        CEFR_LEVELS.indexOf(item) >=
          CEFR_LEVELS.indexOf(scenario.minLevel) &&
        CEFR_LEVELS.indexOf(item) <=
          CEFR_LEVELS.indexOf(scenario.maxLevel),
    ),
  );
  const visibleScenarios = scenarios.filter(
    (scenario) =>
      CEFR_LEVELS.indexOf(level) >= CEFR_LEVELS.indexOf(scenario.minLevel) &&
      CEFR_LEVELS.indexOf(level) <= CEFR_LEVELS.indexOf(scenario.maxLevel),
  );

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
      recorder.cancel();
      Object.values(audioUrlsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, [recorder]);

  useEffect(() => {
    if (step !== 'session') return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [step, turns, processing]);

  function goToSpeakingUpgrade() {
    navigate('/nang-cap', {
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
    try {
      const result = await api.createSpeakingSession({
        scenarioId,
        level,
        dialect,
      });
      setSession(result.session);
      setTurns([result.turn]);
      setQuota(result.quota);
      setCache(PrefetchKeys.speakingQuota, result.quota);
      setStep('session');
      if (result.turn.aiReply) speakEnglish(result.turn.aiReply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không bắt đầu được phiên');
    } finally {
      setStarting(false);
      setSelectedScenarioId(null);
    }
  }

  async function toggleRecording() {
    if (processing) return;
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

  async function stopAndSubmit() {
    if (!session) return;
    setRecording(false);
    setProcessing(true);
    setError('');
    try {
      const { blob, durationMs } = await recorder.stop();
      const result = await api.submitSpeakingTurn(session.id, blob, durationMs);
      audioUrlsRef.current[result.turn.id] = URL.createObjectURL(blob);
      setTurns((prev) => [...prev, result.turn]);
      setQuota(result.quota);
      setCache(PrefetchKeys.speakingQuota, result.quota);
      if (result.turn.aiReply) speakEnglish(result.turn.aiReply);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SPEAKING_QUOTA_EXCEEDED') {
        goToSpeakingUpgrade();
        return;
      }
      setError(err instanceof Error ? err.message : 'Không chấm được bản ghi');
    } finally {
      setProcessing(false);
    }
  }

  function clearSessionAudio() {
    Object.values(audioUrlsRef.current).forEach((url) =>
      URL.revokeObjectURL(url),
    );
    audioUrlsRef.current = {};
  }

  function playUserMessage(turn: SpeakingTurn) {
    const audioUrl = audioUrlsRef.current[turn.id];
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      void audio.play().catch(() => speakEnglish(turn.transcript ?? ''));
      return;
    }
    speakEnglish(turn.transcript ?? '');
  }

  async function toggleTranslation(key: string, text: string) {
    if (translations[key]) {
      setTranslations((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }

    setTranslatingKey(key);
    try {
      const result = await api.translateSpeakingText(text);
      setTranslations((current) => ({
        ...current,
        [key]: result.translation,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không dịch được nội dung');
    } finally {
      setTranslatingKey(null);
    }
  }

  async function finishSession() {
    if (!session) return;
    setProcessing(true);
    setError('');
    try {
      const result = await api.completeSpeakingSession(session.id);
      setSession(result.session);
      setTurns(result.turns);
      setSummary(result.summary);
      setQuota(result.quota);
      setCache(PrefetchKeys.speakingQuota, result.quota);
      setStep('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết thúc được phiên');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Đang tải luyện nói...
        </div>
      </MobileLayout>
    );
  }

  if (step === 'summary' && summary && session) {
    return (
      <MobileLayout showPlayer={false}>
        <div className="px-4 pt-5 pb-8">
          <button
            type="button"
            onClick={() => {
              clearSessionAudio();
              setTranslations({});
              setStep('select');
              setSession(null);
              setTurns([]);
              setSummary(null);
            }}
            className="w-9 h-9 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center card-shadow"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="mt-4 text-2xl font-bold text-gray-900">Tổng kết</h1>
          <p className="text-sm text-gray-500 mt-1">
            {session.scenario.title} · {session.level}
          </p>

          <div className="mt-5 bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-3xl p-5">
            <p className="text-xs text-white/75">Điểm trung bình</p>
            <p className="text-4xl font-bold mt-1">
              {summary.averageOverall ?? '—'}
            </p>
            <p className="text-xs text-white/75 mt-2">
              {summary.turnsSpoken} lượt nói đã hoàn thành
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <ScorePill label="Phát âm" value={summary.averagePronunciation} />
            <ScorePill label="Lưu loát" value={summary.averageFluency} />
            <ScorePill label="Ngữ pháp" value={summary.averageGrammar} />
            <ScorePill label="Từ vựng" value={summary.averageVocabulary} />
          </div>

          <button
            type="button"
            onClick={() => {
              clearSessionAudio();
              setTranslations({});
              setStep('select');
              setSession(null);
              setTurns([]);
              setSummary(null);
            }}
            className="mt-6 w-full rounded-2xl bg-primary py-3.5 font-semibold text-white"
          >
            Chọn tình huống khác
          </button>
        </div>
      </MobileLayout>
    );
  }

  if (step === 'session' && session && latestTurn) {
    return (
      <MobileLayout showPlayer={false} showNav={false}>
        <div className="min-h-screen bg-black text-white flex flex-col">
          <div className="sticky top-0 z-40 bg-black/95 backdrop-blur px-4 pt-4 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                recorder.cancel();
                setRecording(false);
                clearSessionAudio();
                setTranslations({});
                setStep('select');
              }}
              className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-center">
              <p className="font-bold text-white">{session.scenario.title}</p>
              <p className="text-[11px] text-gray-400">
                {session.scenario.aiRole} · {session.level}
              </p>
            </div>
            <button
              type="button"
              disabled={processing}
              onClick={() => void finishSession()}
              className="text-xs font-semibold text-violet-400"
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
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-[20px] rounded-br-md bg-violet-600 px-4 py-2.5">
                        <p className="text-[15px] leading-snug text-white">
                          {turn.transcript}
                        </p>
                        {translations[`user-${turn.id}`] && (
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
                    </div>
                    {(turn.feedback || turn.suggestion) && (
                      <div className="ml-auto max-w-[84%] rounded-2xl bg-violet-950/35 px-3 py-2 text-xs">
                        {turn.feedback && (
                          <p className="text-gray-300">{turn.feedback}</p>
                        )}
                        {turn.suggestion && (
                          <p className="mt-1.5 text-violet-300">
                            Gợi ý: {turn.suggestion}
                          </p>
                        )}
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
                    <div className="w-7 h-7 rounded-full bg-white text-gray-600 flex items-center justify-center shrink-0 mb-1">
                      <UserRound size={17} />
                    </div>
                    <div className="max-w-[80%] rounded-[20px] rounded-bl-md bg-neutral-800 px-4 py-2.5">
                      <p className="text-[15px] leading-snug text-white">
                        {turn.aiReply}
                      </p>
                      {translations[`ai-${turn.id}`] && (
                        <p className="mt-2 pt-2 border-t border-white/10 text-xs leading-relaxed text-gray-300">
                          {translations[`ai-${turn.id}`]}
                        </p>
                      )}
                      <div className="mt-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => speakEnglish(turn.aiReply ?? '')}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/10"
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
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/10 disabled:opacity-50"
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
              </div>
            ))}

            {processing && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-white text-gray-600 flex items-center justify-center shrink-0">
                  <UserRound size={17} />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-neutral-800 px-4 py-3">
                  <Loader2 size={17} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="sticky bottom-0 bg-black/95 backdrop-blur border-t border-white/10 px-4 pt-3 pb-5 flex flex-col items-center">
            <div className="relative">
              {!processing && (
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
                disabled={processing}
                onClick={() => void toggleRecording()}
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg ${
                  recording
                    ? 'bg-red-500'
                    : processing
                      ? 'bg-gray-400'
                      : 'gradient-btn'
                }`}
              >
                {processing ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : (
                  <Mic size={28} />
                )}
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-white">
              {processing
                ? 'Đang nhận diện và phản hồi...'
                : recording
                  ? 'Đang ghi âm · bấm để gửi'
                  : 'Bấm để nói (tối đa 60 giây)'}
            </p>
            {error && (
              <div className="mt-2 w-full rounded-xl bg-red-950/70 px-3 py-2 text-center text-xs text-red-300">
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
      <div className="px-4 pt-5 pb-8">
        <div className="flex items-center gap-2">
          <Mic size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-gray-900">Luyện nói</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Chọn trình độ, sau đó chọn chủ đề để bắt đầu ngay
        </p>

        <section className="mt-5">
          <h2 className="font-bold text-gray-900 mb-3">Trình độ</h2>
          <div className="flex flex-wrap gap-2">
            {supportedLevels.map((item) => (
              <button
                key={item}
                type="button"
                disabled={starting}
                onClick={() => setLevel(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  level === item
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-neutral-900 text-gray-600 card-shadow'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 text-red-600 text-xs px-3 py-2">
            {error}
          </div>
        )}

        <section className="mt-5">
          <h2 className="font-bold text-gray-900 mb-3">Chủ đề luyện nói</h2>
          <div className="space-y-3">
            {visibleScenarios.map((scenario) => {
              const Icon =
                iconMap[scenario.icon as keyof typeof iconMap] ?? Mic;
              const colors = colorMap[scenario.color] ?? colorMap.indigo;
              const active = selectedScenarioId === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  disabled={starting}
                  onClick={() => void startSession(scenario.id)}
                  className={`w-full text-left rounded-2xl p-4 card-shadow ${
                    active
                      ? 'bg-primary/5 ring-2 ring-primary'
                      : 'bg-white dark:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colors}`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{scenario.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {scenario.description}
                      </p>
                      <p className="text-[11px] text-primary mt-1">
                        Bạn: {scenario.learnerRole} · AI: {scenario.aiRole}
                      </p>
                      {active && (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Loader2 size={13} className="animate-spin" />
                          Đang bắt đầu...
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {visibleScenarios.length === 0 && (
              <p className="rounded-2xl bg-white dark:bg-neutral-900 p-4 text-sm text-gray-500 card-shadow">
                Chưa có chủ đề phù hợp với trình độ {level}.
              </p>
            )}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
