import { useState, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, Circle } from 'lucide-react';
import { api } from '../lib/api';

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const rules: PasswordRule[] = [
  { label: 'Ít nhất 8 ký tự', test: (pw) => pw.length >= 8 },
  { label: 'Bao gồm chữ hoa và chữ thường', test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: 'Bao gồm số (0-9)', test: (pw) => /\d/.test(pw) },
  { label: 'Bao gồm ký tự đặc biệt (VD: !@#%...)', test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = (location.state as { resetToken?: string })?.resetToken || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!resetToken) navigate('/quen-mat-khau', { replace: true });
  }, [resetToken, navigate]);

  const passedRules = useMemo(
    () => rules.map((r) => r.test(password)),
    [password],
  );
  const allRulesPassed = passedRules.every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRulesPassed) {
      setError('Mật khẩu chưa đáp ứng đủ yêu cầu');
      return;
    }
    if (!passwordsMatch) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(resetToken, password);
      navigate('/dang-nhap', {
        replace: true,
        state: { message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col px-6 py-6">
        <Link to="/quen-mat-khau/xac-nhan" className="text-gray-600 mb-6 inline-flex">
          <ChevronLeft size={24} />
        </Link>

        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-violet-200 rounded-full flex items-center justify-center relative">
            <span className="text-5xl">🔒</span>
            <span className="absolute -right-1 bottom-4 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-lg shadow-lg">
              ✓
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Tạo mật khẩu mới
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8 px-2">
          Vui lòng tạo mật khẩu mới cho tài khoản để bảo mật và truy cập.
        </p>

        <div className="bg-white rounded-2xl card-shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-3 border-2 border-primary/40 rounded-xl text-sm focus:outline-none focus:border-primary disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm focus:outline-none disabled:opacity-60 ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-primary/40 focus:border-primary'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Mật khẩu xác nhận không khớp</p>
              )}
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={16} className="text-primary" />
                <span className="text-sm font-medium text-gray-800">Mật khẩu cần có:</span>
              </div>
              <ul className="space-y-2">
                {rules.map((rule, i) => (
                  <li key={rule.label} className="flex items-center gap-2 text-sm">
                    {passedRules[i] ? (
                      <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle size={16} className="text-gray-300 flex-shrink-0" />
                    )}
                    <span className={passedRules[i] ? 'text-green-700' : 'text-gray-500'}>
                      {rule.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || !allRulesPassed || !passwordsMatch}
              className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {loading ? 'Đang lưu...' : 'Đặt mật khẩu mới'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
