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
    const message =
      Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    throw new Error(message);
  }

  return data as T;
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

export interface LessonHistoryStats {
  streakDays: number;
  completedLessons: number;
  hoursListened: number;
  lessonsListened: number;
}
