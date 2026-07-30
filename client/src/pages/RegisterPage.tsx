import { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AccountAuthLayout from '../components/AccountAuthLayout';
import GoogleSignInButton from '../components/GoogleSignInButton';
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Đăng ký thất bại',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountAuthLayout
      variant="register"
      backTo="/dang-nhap"
      title="Tạo tài khoản"
      subtitle="Bắt đầu hành trình học tiếng Anh cùng HiHiEnglish."
      footerText="Đã có tài khoản?"
      footerLinkText="Đăng nhập ngay"
      footerLinkTo="/dang-nhap"
    >
      {error && <div className="account-auth-alert">{error}</div>}

      <form className="account-auth-form" onSubmit={handleSubmit}>
        <div className="account-auth-fields">
          <div className="account-auth-field">
            <User
              size={22}
              strokeWidth={1.8}
              className="account-auth-field-icon"
            />
            <input
              type="text"
              aria-label="Họ và tên"
              placeholder="Họ và tên"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="account-auth-field">
            <Mail
              size={22}
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
              size={22}
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
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="account-auth-eye"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
            </button>
          </div>

          <div className="account-auth-field">
            <Lock
              size={22}
              strokeWidth={1.8}
              className="account-auth-field-icon"
            />
            <input
              type={showConfirm ? 'text' : 'password'}
              aria-label="Nhập lại mật khẩu"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((visible) => !visible)}
              className="account-auth-eye"
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirm ? <EyeOff size={21} /> : <Eye size={21} />}
            </button>
          </div>
        </div>

        <label className="account-auth-agreement">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            disabled={loading}
          />
          <span>
            Tôi đồng ý với <span>chính sách bảo mật</span>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="account-auth-primary"
        >
          {loading ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
        </button>

        <div className="account-auth-divider">hoặc</div>

        <GoogleSignInButton
          label="Đăng ký bằng Google"
          disabled={loading}
          className="account-auth-google"
        />
      </form>
    </AccountAuthLayout>
  );
}
