import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLessonAccess } from '../contexts/LessonAccessContext';
import { LESSON_LOGIN_MESSAGE, lessonPath } from '../lib/authMessages';

export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const { canAccessLesson } = useLessonAccess();
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
      if (!requireAuth(path)) return;
      if (!canAccessLesson(lessonId)) {
        navigate('/nang-cap', {
          state: {
            from: path,
            message: 'Bài học này dành cho thành viên Pro. Nâng cấp để mở khóa.',
          },
        });
        return;
      }
      navigate(path);
    },
    [requireAuth, navigate, canAccessLesson],
  );

  return { requireAuth, goToLesson, isAuthenticated, loading };
}
