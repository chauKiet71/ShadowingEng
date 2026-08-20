import {
  getGuestToken,
  type CefrLevel,
  type SpeakingDialect,
  type SpeakingSession,
  type SpeakingTurn,
} from './api';

const STORAGE_PREFIX = 'shadowing_speaking_conversations:';
const MAX_CONVERSATIONS = 50;

export interface SpeakingConversationRecord {
  id: string;
  level: CefrLevel;
  dialect: SpeakingDialect;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  completedAt: string | null;
  durationMs: number;
  turnsSpoken: number;
  averageOverall: number | null;
  scenario: SpeakingSession['scenario'];
  turns: SpeakingTurn[];
  updatedAt: string;
}

export function getSpeakingConversationOwnerId(userId?: string | null) {
  return userId ? `user:${userId}` : `guest:${getGuestToken()}`;
}

function storageKey(ownerId: string) {
  return `${STORAGE_PREFIX}${ownerId}`;
}

function loadAll(ownerId: string): SpeakingConversationRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(ownerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SpeakingConversationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(ownerId: string, records: SpeakingConversationRecord[]) {
  localStorage.setItem(
    storageKey(ownerId),
    JSON.stringify(records.slice(0, MAX_CONVERSATIONS)),
  );
}

export function listSpeakingConversations(ownerId: string) {
  return loadAll(ownerId).sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime(),
  );
}

export function getSpeakingConversation(ownerId: string, sessionId: string) {
  return loadAll(ownerId).find((item) => item.id === sessionId) ?? null;
}

export function upsertSpeakingConversation(
  ownerId: string,
  record: SpeakingConversationRecord,
) {
  const current = loadAll(ownerId).filter((item) => item.id !== record.id);
  saveAll(ownerId, [{ ...record, updatedAt: new Date().toISOString() }, ...current]);
}

export function buildSpeakingConversationRecord(
  session: SpeakingSession,
  turns: SpeakingTurn[],
  extras?: {
    durationMs?: number;
    averageOverall?: number | null;
  },
): SpeakingConversationRecord {
  const spokenTurns = turns.filter((turn) => Boolean(turn.transcript));
  const scores = spokenTurns
    .map((turn) => turn.scores.overall)
    .filter((score): score is number => typeof score === 'number');

  return {
    id: session.id,
    level: session.level,
    dialect: session.dialect,
    status: session.status,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    durationMs:
      extras?.durationMs ??
      spokenTurns.reduce((total, turn) => total + (turn.durationMs ?? 0), 0),
    turnsSpoken: spokenTurns.length,
    averageOverall:
      extras?.averageOverall !== undefined
        ? extras.averageOverall
        : scores.length
          ? Math.round(
              scores.reduce((total, score) => total + score, 0) / scores.length,
            )
          : null,
    scenario: session.scenario,
    turns,
    updatedAt: new Date().toISOString(),
  };
}
