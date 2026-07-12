import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { consumeOAuthRedirect } from '../components/GoogleSignInButton';

export default function GoogleCallbackPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const errorMessage = params.get('error');

    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      return;
    }

    if (!token) {
      setError('Không nhận được token đăng nhập từ Google');
      return;
    }

    const finish = async () => {
      try {
        const user = await loginWithToken(token);
        const redirectTo = consumeOAuthRedirect();
        navigate(user.role === 'ADMIN' ? '/admin/users' : redirectTo, {
          replace: true,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Đăng nhập Google thất bại',
        );
      }
    };

    void finish();
  }, [loginWithToken, navigate]);

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center px-6">
      <Logo size="lg" />
      {error ? (
        <div className="mt-8 w-full max-w-sm bg-white rounded-2xl card-shadow p-6 text-center">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <Link
            to="/dang-nhap"
            className="inline-block text-sm text-blue-500 font-medium hover:underline"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <p className="mt-8 text-gray-600 text-sm">Đang hoàn tất đăng nhập Google...</p>
      )}
    </div>
  );
}
