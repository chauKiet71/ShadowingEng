import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import Logo from '../components/Logo';
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      navigate(user.role === 'ADMIN' ? '/admin/users' : from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col px-6 py-8">
        <Link to="/" className="text-gray-600 mb-4 inline-flex self-start">
          <ChevronLeft size={24} />
        </Link>

        <div className="mb-8">
          <Logo size="lg" />
          <div className="mt-6 flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                Nghe mỗi ngày,<br />Tiến bộ mỗi ngày
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                Phương pháp Shadowing giúp bạn nói tiếng Anh tự nhiên như người bản xứ.
              </p>
            </div>
            <div className="w-28 h-28 flex-shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center">
                <span className="text-5xl">🎧</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow p-6 flex-1">
          <h2 className="text-xl font-bold text-gray-900">Đăng nhập</h2>
          <p className="text-gray-500 text-sm mb-6">Chào mừng bạn quay trở lại!</p>

          {lessonHint && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-xl">
              {lessonHint}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="text-right">
              <Link to="/quen-mat-khau" className="text-sm text-blue-500 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 gradient-btn text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-sm">hoặc</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <GoogleSignInButton
              label="Đăng nhập bằng Google"
              redirectTo={from}
              disabled={loading}
            />
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6 mb-4">
          Chưa có tài khoản?{' '}
          <Link to="/dang-ky" className="text-blue-500 font-medium hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
