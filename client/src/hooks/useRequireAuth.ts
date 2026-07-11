import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LESSON_LOGIN_MESSAGE, lessonPath } from '../lib/authMessages';

export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const requireAuth = useCallback(
    (targetPath: string, message?: string) => {
      if (loading) return false;
      if (!isAuthenticated) {
        navigate('/dang-nhap', {
          state: { from: targetPath, message: message ?? LESSON_LOGIN_MESSAGE },
        });
        return false;
      }
      return true;
    },
    [isAuthenticated, loading, navigate],
  );

  const goToLesson = useCallback(
    (lessonId: string) => {
      const path = lessonPath(lessonId);
      if (requireAuth(path)) {
        navigate(path);
      }
    },
    [requireAuth, navigate],
  );

  return { requireAuth, goToLesson, isAuthenticated, loading };
}
