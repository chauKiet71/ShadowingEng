import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import AccountAuthLayout from '../components/AccountAuthLayout';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useAuth } from '../contexts/AuthContext';
import { LESSON_LOGIN_MESSAGE } from '../lib/authMessages';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string; message?: string })?.from || '/';
  const redirectMessage = (location.state as { message?: string })?.message;
  const isLessonRedirect = from.startsWith('/bai-hoc/');
  const lessonHint = isLessonRedirect
    ? redirectMessage ?? LESSON_LOGIN_MESSAGE
    : undefined;
  const successMessage =
    redirectMessage && !isLessonRedirect ? redirectMessage : undefined;

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      navigate(user.role === 'ADMIN' ? '/admin/users' : from, { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Đăng nhập thất bại',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountAuthLayout
      variant="login"
      backTo="/"
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay trở lại!"
      footerText="Chưa có tài khoản?"
      footerLinkText="Đăng ký ngay"
      footerLinkTo="/dang-ky"
    >
      {lessonHint && (
        <div className="account-auth-alert account-auth-alert--info">
          {lessonHint}
        </div>
      )}

      {successMessage && (
        <div className="account-auth-alert account-auth-alert--success">
          {successMessage}
        </div>
      )}

      {error && <div className="account-auth-alert">{error}</div>}

      <form className="account-auth-form" onSubmit={handleSubmit}>
        <div className="account-auth-fields">
          <div className="account-auth-field">
            <Mail
              size={23}
              strokeWidth={1.8}
              className="account-auth-field-icon"
            />
            <input
              type="email"
              aria-label="Email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="account-auth-field">
            <Lock
              size={23}
              strokeWidth={1.8}
              className="account-auth-field-icon"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              aria-label="Mật khẩu"
              placeholder="Mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="account-auth-eye"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>

        <Link to="/quen-mat-khau" className="account-auth-forgot">
          Quên mật khẩu?
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="account-auth-primary"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <div className="account-auth-divider">hoặc</div>

        <GoogleSignInButton
          label="Đăng nhập bằng Google"
          redirectTo={from}
          disabled={loading}
          className="account-auth-google"
        />
      </form>
    </AccountAuthLayout>
  );
}
