import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Mic } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import SpeakingConversationThread from '../components/SpeakingConversationThread';
import { useAuth } from '../contexts/AuthContext';
import { api, type SpeakingTurn } from '../lib/api';
import {
  getSpeakingConversation,
  getSpeakingConversationOwnerId,
  upsertSpeakingConversation,
  type SpeakingConversationRecord,
} from '../lib/speakingConversationStorage';

export default function SpeakingConversationHistoryPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const ownerId = getSpeakingConversationOwnerId(user?.id);
  const [record, setRecord] = useState<SpeakingConversationRecord | null>(
    () => (sessionId ? getSpeakingConversation(ownerId, sessionId) : null),
  );
  const [loading, setLoading] = useState(() => !record);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError('Không tìm thấy buổi luyện nói');
      setLoading(false);
      return;
    }

    const local = getSpeakingConversation(ownerId, sessionId);
    if (local?.turns.length) {
      setRecord(local);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void api
      .getSpeakingSession(sessionId)
      .then((result) => {
        if (cancelled) return;
        const saved: SpeakingConversationRecord = {
          id: result.session.id,
          level: result.session.level,
          dialect: result.session.dialect,
          status: result.session.status,
          createdAt: result.session.createdAt,
          completedAt: result.session.completedAt,
          durationMs: result.turns.reduce(
            (total, turn) => total + (turn.durationMs ?? 0),
            0,
          ),
          turnsSpoken: result.turns.filter((turn) => turn.transcript).length,
          averageOverall: averageScore(result.turns),
          scenario: result.session.scenario,
          turns: result.turns,
          updatedAt: new Date().toISOString(),
        };
        upsertSpeakingConversation(ownerId, saved);
        setRecord(saved);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        if (local) {
          setRecord(local);
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Không tải được cuộc trò chuyện',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId, sessionId]);

  return (
    <MobileLayout showPlayer={false} showNav={false}>
      <div className="flex min-h-screen flex-col bg-[#F8F9FB] text-gray-900 dark:bg-[#1A1A1A] dark:text-white">
        <div className="sticky top-0 z-40 border-b border-[#ECECF2] bg-[#F8F9FB]/95 px-4 pb-3 pt-4 backdrop-blur dark:border-white/10 dark:bg-[#1A1A1A]/95">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/luyen-noi/lich-su')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-sm dark:bg-[#2C2C2E] dark:text-white"
              aria-label="Quay lại lịch sử"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-center">
              <p className="font-bold text-gray-900 dark:text-white">
                {record?.scenario.title ?? 'Lịch sử hội thoại'}
              </p>
            </div>
            <span className="w-10" />
          </div>
        </div>

        <div className="flex-1 px-4 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#888888]">
              <Loader2 size={17} className="animate-spin text-[#5C7CFA]" />
              Đang tải cuộc trò chuyện...
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-8 text-center text-sm text-red-600 dark:bg-red-950/70 dark:text-red-300">
              {error}
            </div>
          ) : record ? (
            <SpeakingConversationThread
              turns={record.turns}
              userName={user?.fullName}
              userAvatarUrl={user?.avatarUrl}
            />
          ) : (
            <div className="rounded-2xl bg-[#F0F0FA] px-5 py-10 text-center dark:bg-[#2C2C2E]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#5C7CFA]/15 text-[#5C7CFA]">
                <Mic size={22} />
              </span>
              <p className="mt-3 text-sm font-semibold">
                Chưa lưu được cuộc trò chuyện này
              </p>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

function averageScore(turns: SpeakingTurn[]) {
  const scores = turns
    .map((turn) => turn.scores.overall)
    .filter((score): score is number => typeof score === 'number');
  if (!scores.length) return null;
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}
