import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, ChevronLeft } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên');
      return;
    }
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!agreed) {
      setError('Vui lòng đồng ý với chính sách bảo mật');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/dang-nhap" className="text-gray-600">
            <ChevronLeft size={24} />
          </Link>
          <Logo />
        </div>

        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h1 className="text-2xl font-bold text-gray-900">Đăng ký tài khoản</h1>
            <p className="text-gray-500 text-sm mt-1">
              Tạo tài khoản để bắt đầu hành trình nghe tiếng Anh mỗi ngày!
            </p>
          </div>
          <div className="w-24 h-24 flex-shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-200 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>

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
                autoComplete="new-password"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Tôi đồng ý với các{' '}
                <span className="text-blue-500">chính sách bảo mật</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 gradient-btn text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-sm">hoặc</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              disabled
              className="w-full py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-3 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c3.42-3.15 5.392-7.784 5.392-13.32z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Đăng ký bằng Google (sắp ra mắt)
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Đã có tài khoản?{' '}
          <Link to="/dang-nhap" className="text-blue-500 font-medium hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
