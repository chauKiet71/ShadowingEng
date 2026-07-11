export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  isPremium: boolean;
  avatarUrl?: string | null;
  xp?: number;
  level?: number;
  streakDays?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}
