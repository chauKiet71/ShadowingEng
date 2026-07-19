import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, removeToken, setToken } from '../lib/api';
import { clearAuthenticatedPrefetch } from '../lib/prefetchFeatures';
import type { LoginPayload, RegisterPayload, User } from '../types/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  loginWithToken: (accessToken: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const profile = await api.getMe();
    setUser(profile);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (getToken()) {
          await refreshUser();
        }
      } catch {
        removeToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const { user: loggedInUser, accessToken } = await api.login(payload);
    clearAuthenticatedPrefetch();
    setToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { user: newUser, accessToken } = await api.register(payload);
    clearAuthenticatedPrefetch();
    setToken(accessToken);
    setUser(newUser);
    return newUser;
  }, []);

  const loginWithToken = useCallback(async (accessToken: string) => {
    clearAuthenticatedPrefetch();
    setToken(accessToken);
    const profile = await api.getMe();
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    clearAuthenticatedPrefetch();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      loginWithToken,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, loginWithToken, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
