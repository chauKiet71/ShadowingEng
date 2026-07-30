import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import '../styles/account-auth.css';

interface AccountAuthLayoutProps {
  variant: 'login' | 'register';
  backTo: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkTo: string;
}

export default function AccountAuthLayout({
  variant,
  backTo,
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AccountAuthLayoutProps) {
  return (
    <main className="account-auth-page">
      <section
        className={`account-auth-card account-auth-card--${variant}`}
        aria-labelledby={`${variant}-title`}
      >
        <header className="account-auth-header">
          <Link
            to={backTo}
            className="account-auth-back"
            aria-label="Quay lại"
          >
            <ChevronLeft size={30} strokeWidth={2.25} />
          </Link>

          <img
            src="/brand/hihi-wordmark.png"
            alt="HiHiEnglish"
            className="account-auth-wordmark"
          />

          <span aria-hidden="true" />
        </header>

        <div className="account-auth-intro">
          <h1 id={`${variant}-title`}>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="account-auth-content">{children}</div>

        <p className="account-auth-footer">
          <span>{footerText}</span>{' '}
          <Link to={footerLinkTo}>{footerLinkText}</Link>
        </p>
      </section>
    </main>
  );
}
