import { useState, useEffect, useRef } from 'react';
import type { FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import PasswordResetLayout from '../components/PasswordResetLayout';
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
    <PasswordResetLayout
      step={2}
      backTo="/quen-mat-khau"
      illustration="/images/auth/verify-email-illustration.png"
      illustrationAlt="Phong bì chứa mã xác nhận và khiên bảo mật"
      title="Xác nhận email"
      description={
        <>
          Mã 6 số đã được gửi đến<br />
          <strong>{maskedEmail}</strong>
        </>
      }
      footer={
        <>
          <Clock3 aria-hidden="true" size={19} />
          Mã có hiệu lực trong 10 phút
        </>
      }
    >
      {error && <div className="password-reset-alert" role="alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        <p className="password-reset-otp-label">Nhập mã xác nhận</p>
        <div className="password-reset-otp-grid" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              aria-label={`Số thứ ${i + 1} trong mã xác nhận`}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className={`password-reset-otp-input${digit ? ' has-value' : ''}`}
            />
          ))}
        </div>

        <div className="password-reset-resend">
          <span>Chưa nhận được mã?</span>
          {countdown > 0 ? (
            <button type="button" className="password-reset-text-link" disabled>
              Gửi lại ({String(Math.floor(countdown / 60)).padStart(2, '0')}:
              {String(countdown % 60).padStart(2, '0')})
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="password-reset-text-link"
            >
              {resending ? 'Đang gửi...' : 'Gửi lại mã'}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== OTP_LENGTH}
          className="password-reset-primary"
        >
          {loading ? 'Đang xác nhận...' : 'Xác nhận'}
        </button>
      </form>
    </PasswordResetLayout>
  );
}
