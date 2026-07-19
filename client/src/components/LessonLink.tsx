import { Link } from 'react-router-dom';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLessonAccess } from '../contexts/LessonAccessContext';
import { lessonPath } from '../lib/authMessages';

const LESSON_PREMIUM_MESSAGE =
  'Bài học này dành cho thành viên Pro. Nâng cấp để mở khóa.';

interface LessonLinkProps {
  lessonId: string;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  draggable?: boolean;
  style?: CSSProperties;
  'data-carousel-item'?: boolean;
}

export default function LessonLink({
  lessonId,
  className,
  children,
  onClick,
  ...rest
}: LessonLinkProps) {
  const { isAuthenticated, user } = useAuth();
  const { isLessonLocked } = useLessonAccess();
  const path = lessonPath(lessonId);
  const needsPremium =
    isAuthenticated && isLessonLocked(lessonId) && !user?.isPremium;

  if (needsPremium) {
    return (
      <Link
        to="/nang-cap"
        state={{ from: path, message: LESSON_PREMIUM_MESSAGE }}
        className={className}
        onClick={onClick}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link to={path} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}

export { LESSON_PREMIUM_MESSAGE };
