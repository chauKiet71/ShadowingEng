export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  isPremium: boolean;
  premiumExpiresAt?: string | null;
  packageId?: string | null;
  package?: {
    id: string;
    name: string;
    duration: string;
    durationUnit: 'DAY' | 'MONTH';
    days: number;
    months: number;
  } | null;
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
