import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import PasswordResetLayout from '../components/PasswordResetLayout';
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
    <PasswordResetLayout
      step={1}
      backTo="/dang-nhap"
      illustration="/images/auth/forgot-password-illustration.png"
      illustrationAlt="Phong bì email được bảo vệ bằng ổ khóa"
      title="Quên mật khẩu"
      description={<>Đừng lo, chúng tôi sẽ giúp bạn<br />lấy lại tài khoản.</>}
      footer={
        <>
          <ShieldCheck aria-hidden="true" size={19} />
          Thông tin của bạn luôn được bảo mật
        </>
      }
    >
      {error && <div className="password-reset-alert" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="password-reset-form password-reset-form--email">
        <div className="password-reset-field-group">
          <label className="password-reset-label" htmlFor="forgot-password-email">
            Email của bạn
          </label>
          <div className="password-reset-input-wrap">
            <Mail className="password-reset-input-icon" aria-hidden="true" size={23} strokeWidth={2} />
            <input
              id="forgot-password-email"
              type="email"
              placeholder="Nhập email đã đăng ký"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              className="password-reset-input password-reset-input--with-icon"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="password-reset-primary">
          {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
        </button>
      </form>

      <Link to="/dang-nhap" className="password-reset-login-link">
        Quay lại đăng nhập
      </Link>
    </PasswordResetLayout>
  );
}
