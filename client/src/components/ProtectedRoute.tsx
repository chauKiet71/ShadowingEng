import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LESSON_LOGIN_MESSAGE } from '../lib/authMessages';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    const isLesson = location.pathname.startsWith('/bai-hoc/');

    return (
      <Navigate
        to="/dang-nhap"
        state={{
          from: returnTo,
          ...(isLesson ? { message: LESSON_LOGIN_MESSAGE } : {}),
        }}
        replace
      />
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
