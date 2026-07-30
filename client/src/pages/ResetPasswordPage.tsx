import { useState, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, CheckCircle2, Circle } from 'lucide-react';
import PasswordResetLayout from '../components/PasswordResetLayout';
import { api } from '../lib/api';

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const rules: PasswordRule[] = [
  { label: 'Ít nhất 8 ký tự', test: (pw) => pw.length >= 8 },
  {
    label: 'Một chữ hoa, chữ thường và một số',
    test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw),
  },
  { label: 'Một ký tự đặc biệt (VD: !@#%...)', test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
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
      navigate('/dang-nhap', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PasswordResetLayout
      step={3}
      backTo="/quen-mat-khau/xac-nhan"
      illustration="/images/auth/reset-password-illustration.png"
      illustrationAlt="Ổ khóa xanh đã được xác nhận bảo mật"
      title="Đặt mật khẩu mới"
      description={<>Mật khẩu mới phải khác mật khẩu<br />đã dùng trước đây.</>}
      compact
      footer={
        <>
          <ShieldCheck aria-hidden="true" size={19} />
          An toàn và bảo mật
        </>
      }
    >
      {error && <div className="password-reset-alert" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="password-reset-form">
        <div className="password-reset-field-group">
          <label className="password-reset-label" htmlFor="new-password">
            Mật khẩu mới
          </label>
          <div className="password-reset-input-wrap">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              className="password-reset-input password-reset-input--with-action"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-reset-eye"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff aria-hidden="true" size={21} /> : <Eye aria-hidden="true" size={21} />}
            </button>
          </div>
        </div>

        <div className="password-reset-field-group">
          <label className="password-reset-label" htmlFor="confirm-password">
            Xác nhận mật khẩu
          </label>
          <div className="password-reset-input-wrap">
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              className={`password-reset-input password-reset-input--with-action${
                confirmPassword && !passwordsMatch ? ' is-invalid' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="password-reset-eye"
              aria-label={showConfirm ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
            >
              {showConfirm ? <EyeOff aria-hidden="true" size={21} /> : <Eye aria-hidden="true" size={21} />}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="password-reset-field-error">Mật khẩu xác nhận không khớp</p>
          )}
        </div>

        <ul className="password-reset-rules">
          <li className="password-reset-rules-title">Mật khẩu cần có</li>
          {rules.map((rule, i) => (
            <li key={rule.label} className={`password-reset-rule${passedRules[i] ? ' is-passed' : ''}`}>
              {passedRules[i] ? (
                <CheckCircle2 aria-hidden="true" size={15} fill="currentColor" stroke="white" />
              ) : (
                <Circle aria-hidden="true" size={15} />
              )}
              {rule.label}
            </li>
          ))}
          <li className={`password-reset-rule${passwordsMatch ? ' is-passed' : ''}`}>
            {passwordsMatch ? (
              <CheckCircle2 aria-hidden="true" size={15} fill="currentColor" stroke="white" />
            ) : (
              <Circle aria-hidden="true" size={15} />
            )}
            Hai mật khẩu trùng khớp
          </li>
        </ul>

        <button
          type="submit"
          disabled={loading || !allRulesPassed || !passwordsMatch}
          className="password-reset-primary"
        >
          {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
        </button>
      </form>
    </PasswordResetLayout>
  );
}
