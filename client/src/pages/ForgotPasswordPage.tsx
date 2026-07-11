import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, ShieldCheck, LogIn } from 'lucide-react';
import { api } from '../lib/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      const { email: confirmedEmail } = await api.forgotPassword(email.trim());
      navigate('/quen-mat-khau/xac-nhan', {
        state: { email: confirmedEmail },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể gửi mã xác nhận. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col px-6 py-6">
        <Link to="/dang-nhap" className="text-gray-600 mb-6 inline-flex">
          <ChevronLeft size={24} />
        </Link>

        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-indigo-200 rounded-3xl flex items-center justify-center relative">
            <span className="text-5xl">🔐</span>
            <span className="absolute -right-1 top-4 text-2xl">✉️</span>
            <span className="absolute -left-2 bottom-6 text-xl bg-white rounded-full w-8 h-8 flex items-center justify-center shadow">?</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Quên mật khẩu?
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8 px-2">
          Đừng lo lắng! Nhập email của bạn bên dưới, chúng tôi sẽ gửi hướng dẫn để đặt lại mật khẩu.
        </p>

        <div className="bg-white rounded-2xl card-shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-primary mb-1.5 block">
                Email của bạn
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="Nhập email đã đăng ký"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 border-2 border-primary/40 rounded-xl text-sm focus:outline-none focus:border-primary disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {loading ? 'Đang gửi...' : 'Gửi hướng dẫn đặt lại'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs">Hoặc quay lại đăng nhập</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link
            to="/dang-nhap"
            className="w-full py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogIn size={18} />
            Quay lại đăng nhập
          </Link>
        </div>

        <div className="mt-6 bg-purple-50 border border-purple-100 rounded-2xl p-4 flex gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Bảo mật thông tin của bạn</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Chúng tôi sẽ không chia sẻ email của bạn với bất kỳ bên thứ ba nào.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6 mb-4">
          Vẫn gặp vấn đề?{' '}
          <a href="mailto:support@shadowing.com" className="text-primary font-medium">
            Liên hệ hỗ trợ
          </a>
        </p>
      </div>
    </div>
  );
}
