import type { ReactNode } from 'react';
import { ChevronLeft, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import '../styles/password-reset.css';

interface PasswordResetLayoutProps {
  step: 1 | 2 | 3;
  backTo: string;
  illustration: string;
  illustrationAlt: string;
  title: string;
  description: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  compact?: boolean;
}

export default function PasswordResetLayout({
  step,
  backTo,
  illustration,
  illustrationAlt,
  title,
  description,
  footer,
  children,
  compact = false,
}: PasswordResetLayoutProps) {
  return (
    <div className="password-reset-page">
      <main
        className={`password-reset-card${compact ? ' password-reset-card--compact' : ''}`}
        tabIndex={-1}
      >
        <header className="password-reset-header">
          <Link className="password-reset-back" to={backTo} aria-label="Quay lại">
            <ChevronLeft aria-hidden="true" size={30} strokeWidth={2.25} />
          </Link>
          <Logo size="sm" />
          <span aria-hidden="true" />
        </header>

        <div className="password-reset-steps" aria-label={`Bước ${step} trên 3`}>
          {[1, 2, 3].map((item) => (
            <Circle
              key={item}
              aria-hidden="true"
              className={item === step ? 'is-active' : undefined}
              size={13}
              strokeWidth={0}
              fill="currentColor"
            />
          ))}
        </div>

        <img
          className="password-reset-illustration"
          src={illustration}
          alt={illustrationAlt}
        />

        <div className="password-reset-intro">
          <h1>{title}</h1>
          <div className="password-reset-description">{description}</div>
        </div>

        <div className="password-reset-content">{children}</div>

        <footer className="password-reset-footer">{footer}</footer>
      </main>
    </div>
  );
}
