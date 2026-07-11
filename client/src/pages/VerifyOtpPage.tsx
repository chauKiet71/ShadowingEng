import { useState, useEffect, useRef } from 'react';
import type { FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';
import { api } from '../lib/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate('/quen-mat-khau', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const code = digits.join('');

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length !== OTP_LENGTH) {
      setError('Vui lòng nhập đủ 6 số');
      return;
    }

    setLoading(true);
    try {
      const { resetToken } = await api.verifyResetCode(email, code);
      navigate('/quen-mat-khau/dat-lai', { state: { resetToken } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mã xác nhận không đúng');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await api.resendResetCode(email);
      setCountdown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi lại mã');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col px-6 py-6">
        <Link to="/quen-mat-khau" className="text-gray-600 mb-6 inline-flex">
          <ChevronLeft size={24} />
        </Link>

        <div className="flex justify-center mb-6">
          <div className="w-36 h-28 bg-gradient-to-br from-purple-100 to-violet-200 rounded-2xl flex items-center justify-center relative">
            <span className="text-5xl">✉️</span>
            <span className="absolute bottom-2 right-2 text-xs bg-white px-2 py-1 rounded-lg shadow font-mono">******</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
          Nhập mã xác nhận
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Chúng tôi đã gửi mã 6 số đến email{' '}
          <span className="text-primary font-medium">{maskedEmail}</span>
        </p>

        <div className="bg-white rounded-2xl card-shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-600 text-center mb-5">
            Vui lòng nhập mã xác nhận 6 số để đặt lại mật khẩu
          </p>

          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                  className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-xl focus:outline-none transition-colors ${
                    digit ? 'border-primary bg-primary/5' : 'border-gray-200'
                  } focus:border-primary disabled:opacity-60`}
                />
              ))}
            </div>

            <p className="text-center text-sm text-gray-500 mb-5">
              Chưa nhận được mã?{' '}
              {countdown > 0 ? (
                <span className="text-gray-400">
                  Gửi lại mã ({String(Math.floor(countdown / 60)).padStart(2, '0')}:
                  {String(countdown % 60).padStart(2, '0')})
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-primary font-medium hover:underline"
                >
                  {resending ? 'Đang gửi...' : 'Gửi lại mã'}
                </button>
              )}
            </p>

            <button
              type="submit"
              disabled={loading || code.length !== OTP_LENGTH}
              className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {loading ? 'Đang xác nhận...' : 'Xác nhận'}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
          <Shield size={14} className="text-primary" />
          Mã xác nhận có hiệu lực trong 10 phút
        </div>
      </div>
    </div>
  );
}
