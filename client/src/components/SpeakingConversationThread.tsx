import { useEffect, useRef, useState } from 'react';
import { Languages, Lightbulb, Loader2, UserRound, Volume2 } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { api, type SpeakingTurn } from '../lib/api';
import { speakEnglish } from '../lib/speaking';

export function formatSpeakingSuggestion(text: string) {
  return text
    .replace(
      /\[\s*your\s+name\s*\]|\(\s*your\s+name\s*\)|<\s*your\s+name\s*>|\byour\s+name\b/gi,
      'Nam',
    )
    .replace(/^["“”']+|["“”']+$/g, '');
}

function formatTurnTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AiAvatar() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ECECF2] bg-white shadow-sm dark:border-white/15 dark:bg-[#2C2C2E]"
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
        className="!h-8 !w-8 ring-1 ring-white/20 dark:ring-white/10"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C2C2E] text-gray-300 ring-1 ring-white/10"
      aria-label="Khách"
    >
      <UserRound size={17} />
    </div>
  );
}

interface SpeakingConversationThreadProps {
  turns: SpeakingTurn[];
  userName?: string | null;
  userAvatarUrl?: string | null;
  showLiveSuggestion?: boolean;
  sessionBusy?: boolean;
  playUserMessage?: (turn: SpeakingTurn) => void;
}

export default function SpeakingConversationThread({
  turns,
  userName,
  userAvatarUrl,
  showLiveSuggestion = false,
  sessionBusy = false,
  playUserMessage,
}: SpeakingConversationThreadProps) {
  const latestTurn = turns.at(-1);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [visibleTranslationKeys, setVisibleTranslationKeys] = useState<
    Set<string>
  >(new Set());
  const [translatingKey, setTranslatingKey] = useState<string | null>(null);
  const translationRequestsRef = useRef<Record<string, Promise<string>>>({});

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
    } finally {
      setTranslatingKey(null);
    }
  }

  useEffect(() => {
    turns.forEach((turn) => {
      const key = `ai-${turn.id}`;
      if (turn.aiReply && !translations[key]) {
        void requestTranslation(key, turn.aiReply).catch(() => undefined);
      }
    });

    if (!showLiveSuggestion || sessionBusy) return;
    const latestTurnWithSuggestion = turns.at(-1);
    if (!latestTurnWithSuggestion?.suggestion) return;
    const suggestionKey = `suggestion-${latestTurnWithSuggestion.id}`;
    if (!translations[suggestionKey]) {
      void requestTranslation(
        suggestionKey,
        formatSpeakingSuggestion(latestTurnWithSuggestion.suggestion),
      ).catch(() => undefined);
    }
  }, [sessionBusy, showLiveSuggestion, translations, turns]);

  return (
    <div className="space-y-4">
      {turns.map((turn) => (
        <div key={turn.id} className="space-y-4">
          {turn.transcript && (
            <div className="flex flex-col items-end">
              <div className="flex max-w-full items-end justify-end gap-2">
                <div className="max-w-[calc(80%-2.5rem)] rounded-2xl bg-[#5C7CFA] px-4 py-2.5 dark:bg-[#4C6EF5]">
                  <p className="text-[15px] leading-snug text-white">
                    {turn.transcript}
                  </p>
                  {turn.correction && (
                    <p className="mt-2 text-[15px] leading-snug text-white/95">
                      <span className="font-semibold text-[#FFE08A]">
                        Câu đúng:{' '}
                      </span>
                      {turn.correction}
                    </p>
                  )}
                  {visibleTranslationKeys.has(
                    turn.correction
                      ? `correction-${turn.id}`
                      : `user-${turn.id}`,
                  ) &&
                    translations[
                      turn.correction
                        ? `correction-${turn.id}`
                        : `user-${turn.id}`
                    ] && (
                      <p className="mt-2 text-xs leading-relaxed text-white/80">
                        {
                          translations[
                            turn.correction
                              ? `correction-${turn.id}`
                              : `user-${turn.id}`
                          ]
                        }
                      </p>
                    )}
                  <div className="mt-1.5 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        turn.correction
                          ? speakEnglish(turn.correction)
                          : playUserMessage
                            ? playUserMessage(turn)
                            : speakEnglish(turn.transcript ?? '')
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
                      aria-label={
                        turn.correction
                          ? 'Nghe câu đúng'
                          : 'Nghe lại lời của bạn'
                      }
                    >
                      <Volume2 size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={
                        translatingKey ===
                        (turn.correction
                          ? `correction-${turn.id}`
                          : `user-${turn.id}`)
                      }
                      onClick={() =>
                        void toggleTranslation(
                          turn.correction
                            ? `correction-${turn.id}`
                            : `user-${turn.id}`,
                          turn.correction ?? turn.transcript ?? '',
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full text-white/90 hover:bg-white/10 disabled:opacity-50"
                      aria-label="Dịch sang tiếng Việt"
                    >
                      {translatingKey ===
                      (turn.correction
                        ? `correction-${turn.id}`
                        : `user-${turn.id}`) ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Languages size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <LearnerAvatar name={userName} src={userAvatarUrl} />
              </div>
              <p className="mt-1 pr-10 text-[11px] text-[#888888] dark:text-[#8E8E93]">
                {formatTurnTime(turn.createdAt)}
              </p>
            </div>
          )}

          {turn.aiReply && (
            <div className="flex flex-col items-start">
              <div className="flex max-w-full items-end gap-2">
                <AiAvatar />
                <div className="max-w-[calc(80%-2.5rem)] rounded-2xl bg-[#F0F0FA] px-4 py-2.5 dark:bg-[#2C2C2E]">
                  <p className="text-[15px] leading-snug text-[#333333] dark:text-gray-100">
                    {turn.aiReply}
                  </p>
                  {visibleTranslationKeys.has(`ai-${turn.id}`) &&
                    translations[`ai-${turn.id}`] && (
                      <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-gray-400">
                        {translations[`ai-${turn.id}`]}
                      </p>
                    )}
                  <div className="mt-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => speakEnglish(turn.aiReply ?? '')}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] hover:bg-black/5 dark:text-[#8E8E93] dark:hover:bg-white/10"
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
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#888888] hover:bg-black/5 disabled:opacity-50 dark:text-[#8E8E93] dark:hover:bg-white/10"
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
              <p className="mt-1 pl-10 text-[11px] text-[#888888] dark:text-[#8E8E93]">
                {formatTurnTime(turn.createdAt)}
              </p>
            </div>
          )}

          {showLiveSuggestion &&
            turn.suggestion &&
            turn.id === latestTurn?.id &&
            !sessionBusy && (
              <div className="ml-auto max-w-[80%] rounded-2xl bg-[#EEF1FF] px-3.5 py-3 dark:bg-[#252536]">
                <div className="flex items-center gap-1.5 text-[#5C7CFA]">
                  <Lightbulb size={15} />
                  <p className="text-xs font-semibold">Gợi ý bạn có thể nói</p>
                </div>
                <p className="mt-2 text-[15px] leading-snug text-[#333333] dark:text-gray-100">
                  {formatSpeakingSuggestion(turn.suggestion)}
                </p>
                {visibleTranslationKeys.has(`suggestion-${turn.id}`) &&
                  translations[`suggestion-${turn.id}`] && (
                    <p className="mt-2 text-xs leading-relaxed text-[#666666] dark:text-gray-400">
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#333333] shadow-sm hover:bg-[#F0F0FA] dark:bg-white/10 dark:text-gray-200 dark:shadow-none dark:hover:bg-white/15"
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#333333] shadow-sm hover:bg-[#F0F0FA] disabled:opacity-50 dark:bg-white/10 dark:text-gray-200 dark:shadow-none dark:hover:bg-white/15"
                  >
                    {translatingKey === `suggestion-${turn.id}` ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Languages size={13} />
                    )}
                    Dịch nghĩa
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[#888888] dark:text-[#8E8E93]">
                  Bấm micro để đọc câu này hoặc tự trả lời theo cách của bạn.
                </p>
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
