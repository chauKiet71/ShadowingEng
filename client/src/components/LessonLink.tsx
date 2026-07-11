import { Link } from 'react-router-dom';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LESSON_LOGIN_MESSAGE, lessonPath } from '../lib/authMessages';

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
  const { isAuthenticated } = useAuth();
  const path = lessonPath(lessonId);

  if (isAuthenticated) {
    return (
      <Link to={path} className={className} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/dang-nhap"
      state={{ from: path, message: LESSON_LOGIN_MESSAGE }}
      className={className}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Link>
  );
}
