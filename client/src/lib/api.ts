import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

const TOKEN_KEY = 'accessToken';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const rawMessage = data.message;
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : Array.isArray(rawMessage)
          ? rawMessage.join(', ')
          : typeof rawMessage?.message === 'string'
            ? rawMessage.message
            : 'Đã xảy ra lỗi. Vui lòng thử lại.';
    const code =
      typeof data.code === 'string'
        ? data.code
        : typeof rawMessage?.code === 'string'
          ? rawMessage.code
          : undefined;
    throw new ApiError(message, code, res.status);
  }

  return data as T;
}

export class ApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const api = {
  login(payload: LoginPayload) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  register(payload: RegisterPayload) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe() {
    return request<User>('/auth/me');
  },

  async updateAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = getToken();
    const res = await fetch('/api/auth/avatar', {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || 'Không thể cập nhật ảnh đại diện';
      throw new Error(message);
    }
    return data as User;
  },

  forgotPassword(email: string) {
    return request<{ message: string; email: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resendResetCode(email: string) {
    return request<{ message: string }>('/auth/resend-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyResetCode(email: string, code: string) {
    return request<{ resetToken: string; message: string }>(
      '/auth/verify-reset-code',
      { method: 'POST', body: JSON.stringify({ email, code }) },
    );
  },

  resetPassword(resetToken: string, password: string) {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, password }),
    });
  },

  getUserStats() {
    return request<{
      total: number;
      newUsers: number;
      proUsers: number;
      activeUsers: number;
    }>('/users/stats');
  },

  getUsers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    isPremium?: boolean;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.isPremium !== undefined) {
      query.set('isPremium', String(params.isPremium));
    }
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<{
      users: AdminUserRow[];
      total: number;
      page: number;
      limit: number;
    }>(`/users${qs ? `?${qs}` : ''}`);
  },

  getPackages(params?: { status?: string; visible?: boolean }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.visible !== undefined) {
      query.set('visible', String(params.visible));
    }
    const qs = query.toString();
    return request<PackageRow[]>(`/packages${qs ? `?${qs}` : ''}`);
  },

  getPackage(id: string) {
    return request<PackageRow>(`/packages/${id}`);
  },

  createPaymentOrder(packageId: string) {
    return request<PaymentOrder>('/payments/orders', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    });
  },

  getPaymentOrder(id: string) {
    return request<PaymentOrder>(`/payments/orders/${id}`);
  },

  createPackage(payload: PackagePayload) {
    return request<PackageRow>('/packages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updatePackage(id: string, payload: Partial<PackagePayload>) {
    return request<PackageRow>(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deletePackage(id: string) {
    return request<PackageRow>(`/packages/${id}`, { method: 'DELETE' });
  },

  getMyLessonStats() {
    return request<LessonHistoryStats>('/lessons/me/stats');
  },

  getLessonAccessMap() {
    return request<Record<string, boolean>>('/lessons/access');
  },

  setLessonAccess(lessonId: string, isLocked: boolean) {
    return request<{ lessonId: string; isLocked: boolean; updatedAt: string }>(
      `/lessons/access/${encodeURIComponent(lessonId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ isLocked }),
      },
    );
  },

  getVocabularyOverview() {
    return request<VocabularyOverview>('/vocabulary/overview');
  },

  getVocabularySet(id: string) {
    return request<VocabularySetDetail>(
      `/vocabulary/sets/${encodeURIComponent(id)}`,
    );
  },

  saveVocabularySet(id: string) {
    return request<{ saved: boolean }>(
      `/vocabulary/sets/${encodeURIComponent(id)}/save`,
      { method: 'POST' },
    );
  },

  removeVocabularySet(id: string) {
    return request<{ saved: boolean }>(
      `/vocabulary/sets/${encodeURIComponent(id)}/save`,
      { method: 'DELETE' },
    );
  },

  learnVocabularyWord(wordId: string) {
    return request<VocabularyProgress>('/vocabulary/words/learn', {
      method: 'POST',
      body: JSON.stringify({ wordId }),
    });
  },

  reviewVocabularyWord(wordId: string, correct: boolean) {
    return request<VocabularyProgress>(
      `/vocabulary/words/${encodeURIComponent(wordId)}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ correct }),
      },
    );
  },

  getSpeakingScenarios() {
    return request<SpeakingScenario[]>('/speaking/scenarios');
  },

  getSpeakingQuota() {
    return request<SpeakingQuota>('/speaking/quota');
  },

  translateSpeakingText(text: string) {
    return request<{ translation: string }>('/speaking/translate', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  createSpeakingSession(payload: {
    scenarioId: string;
    level: CefrLevel;
    dialect: SpeakingDialect;
  }) {
    return request<CreateSpeakingSessionResponse>('/speaking/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getSpeakingSession(id: string) {
    return request<SpeakingSessionDetail>(
      `/speaking/sessions/${encodeURIComponent(id)}`,
    );
  },

  async submitSpeakingTurn(
    sessionId: string,
    audio: Blob,
    durationMs?: number,
  ) {
    const token = getToken();
    const form = new FormData();
    form.append('audio', audio, 'speaking.webm');
    if (typeof durationMs === 'number') {
      form.append('durationMs', String(Math.round(durationMs)));
    }

    const res = await fetch(
      `/api/speaking/sessions/${encodeURIComponent(sessionId)}/turns`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const rawMessage = data.message;
      const message =
        typeof rawMessage === 'string'
          ? rawMessage
          : Array.isArray(rawMessage)
            ? rawMessage.join(', ')
            : typeof rawMessage?.message === 'string'
              ? rawMessage.message
              : 'Không gửi được bản ghi âm';
      const code =
        typeof data.code === 'string'
          ? data.code
          : typeof rawMessage?.code === 'string'
            ? rawMessage.code
            : undefined;
      throw new ApiError(message, code, res.status);
    }
    return data as SubmitSpeakingTurnResponse;
  },

  completeSpeakingSession(id: string) {
    return request<CompleteSpeakingSessionResponse>(
      `/speaking/sessions/${encodeURIComponent(id)}/complete`,
      { method: 'POST' },
    );
  },

  getVideoTranslateQuota() {
    return request<VideoTranslateQuota>('/video-translate/quota');
  },

  listVideoTranslateJobs() {
    return request<VideoTranslateListResponse>('/video-translate/jobs');
  },

  getVideoTranslateJob(id: string) {
    return request<VideoTranslateJobResponse>(
      `/video-translate/jobs/${encodeURIComponent(id)}`,
    );
  },

  createVideoTranslateJob(url: string) {
    return request<CreateVideoTranslateResponse>('/video-translate/jobs', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  deleteVideoTranslateJob(id: string) {
    return request<{ deleted: boolean }>(
      `/video-translate/jobs/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
  },
};

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  isPremium: boolean;
  package: { name: string } | null;
  createdAt: string;
  lastActivity: string | null;
}

export interface PackageRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: string;
  durationUnit: 'DAY' | 'MONTH';
  days: number;
  months: number;
  monthlyPrice: number;
  originalPrice: number | null;
  badge: string | null;
  sortOrder: number;
  icon: string;
  status: 'ACTIVE' | 'PAUSED';
  isVisible: boolean;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackagePayload {
  name: string;
  description?: string;
  price: number;
  duration: string;
  durationUnit?: 'DAY' | 'MONTH';
  days?: number;
  months?: number;
  monthlyPrice?: number;
  originalPrice?: number | null;
  badge?: string | null;
  sortOrder?: number;
  icon?: string;
  status?: 'ACTIVE' | 'PAUSED';
  isVisible?: boolean;
}

export interface PaymentOrder {
  id: string;
  paymentCode: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  paidAt: string | null;
  package: {
    id: string;
    name: string;
    durationUnit: 'DAY' | 'MONTH';
    days: number;
    months: number;
  };
  bank: {
    bank: string;
    accountNumber: string;
    accountHolder: string;
  };
  qrUrl: string;
}

export interface LessonHistoryStats {
  streakDays: number;
  completedLessons: number;
  hoursListened: number;
  lessonsListened: number;
}

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VocabularyProgress {
  id: string;
  status: 'LEARNING' | 'MASTERED';
  reviewCount: number;
  correctCount: number;
  intervalDays: number;
  nextReviewAt: string;
}

export interface VocabularyWord {
  id: string;
  word: string;
  phonetic: string | null;
  meaning: string;
  example: string;
  exampleTranslation: string;
  audioUrl: string | null;
  setTitle?: string;
  progress: VocabularyProgress | null;
}

export interface VocabularySetSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  cefrLevel: CefrLevel;
  topic: string;
  isFeatured?: boolean;
  wordCount: number;
  learnedCount?: number;
  saved: boolean;
}

export interface VocabularySetDetail
  extends Omit<VocabularySetSummary, 'wordCount'> {
  words: VocabularyWord[];
}

export interface VocabularyOverview {
  stats: {
    totalLearned: number;
    mastered: number;
    learning: number;
    dueCount: number;
    learnedToday: number;
  };
  sets: VocabularySetSummary[];
  mySets: VocabularySetSummary[];
  dueWords: VocabularyWord[];
}

export type SpeakingDialect = 'EN_US' | 'EN_GB';

export interface SpeakingQuota {
  used: number;
  limit: number;
  remaining: number | null;
  isPremium: boolean;
  resetsAt: string;
}

export interface SpeakingScenario {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  learnerRole: string;
  aiRole: string;
  objective: string;
  minLevel: CefrLevel;
  maxLevel: CefrLevel;
  sortOrder: number;
}

export interface SpeakingScores {
  pronunciation: number | null;
  fluency: number | null;
  grammar: number | null;
  vocabulary: number | null;
  coherence: number | null;
  overall: number | null;
  relevance: string | null;
  cefrOverall: string | null;
}

export interface SpeakingTurn {
  id: string;
  turnIndex: number;
  promptText: string;
  transcript: string | null;
  suggestion: string | null;
  feedback: string | null;
  aiReply: string | null;
  scores: SpeakingScores;
  durationMs: number | null;
  createdAt: string;
}

export interface SpeakingSession {
  id: string;
  level: CefrLevel;
  dialect: SpeakingDialect;
  status: 'ACTIVE' | 'COMPLETED';
  turnCount: number;
  createdAt: string;
  completedAt: string | null;
  scenario: {
    id: string;
    slug: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    learnerRole: string;
    aiRole: string;
    objective: string;
  };
}

export interface CreateSpeakingSessionResponse {
  session: SpeakingSession;
  turn: SpeakingTurn;
  quota: SpeakingQuota;
}

export interface SpeakingSessionDetail {
  session: SpeakingSession;
  turns: SpeakingTurn[];
  quota: SpeakingQuota;
}

export interface SubmitSpeakingTurnResponse {
  turn: SpeakingTurn;
  quota: SpeakingQuota;
}

export interface CompleteSpeakingSessionResponse {
  session: SpeakingSession;
  turns: SpeakingTurn[];
  summary: {
    turnsSpoken: number;
    averageOverall: number | null;
    averagePronunciation: number | null;
    averageFluency: number | null;
    averageGrammar: number | null;
    averageVocabulary: number | null;
    averageCoherence: number | null;
  };
  quota: SpeakingQuota;
}

export interface VideoTranslateQuota {
  used: number;
  limit: number;
  remaining: number | null;
  isPremium: boolean;
  resetsAt: string;
  maxSeconds: number;
}

export interface VideoTranslateSegment {
  start: number;
  end: number;
  en: string;
  vi: string;
}

export type VideoTranslateStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED';

export interface VideoTranslateJob {
  id: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  status: VideoTranslateStatus;
  source: string | null;
  errorMessage: string | null;
  segments: VideoTranslateSegment[];
  dubbedAudioUrl: string | null;
  pipelineVersion?: number;
  fromCache: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface VideoTranslateJobResponse {
  job: VideoTranslateJob;
  quota: VideoTranslateQuota;
}

export interface VideoTranslateListResponse {
  jobs: VideoTranslateJob[];
  quota: VideoTranslateQuota;
}

export interface CreateVideoTranslateResponse {
  job: VideoTranslateJob;
  quota: VideoTranslateQuota;
  fromCache: boolean;
}
