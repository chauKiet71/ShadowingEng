import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import Logo from './Logo';

const DESKTOP_QUERY = '(min-width: 768px)';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    window.matchMedia(DESKTOP_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}

export default function DesktopGate() {
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();
  const isAdmin = pathname.startsWith('/admin');
  const blocked = isDesktop && !isAdmin;

  useEffect(() => {
    document.documentElement.classList.toggle('allow-desktop', isAdmin);
    document.documentElement.classList.toggle('desktop-blocked', blocked);
    document.body.style.overflow = blocked ? 'hidden' : '';

    return () => {
      document.documentElement.classList.remove('allow-desktop');
      document.documentElement.classList.remove('desktop-blocked');
      document.body.style.overflow = '';
    };
  }, [blocked, isAdmin]);

  if (!blocked) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-6 gradient-bg"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="desktop-unsupported-title"
    >
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-primary/10 text-primary-dark dark:bg-primary/20 dark:text-primary-light">
          <Smartphone size={40} strokeWidth={1.8} />
        </div>
        <h1
          id="desktop-unsupported-title"
          className="mb-2.5 text-[1.375rem] font-bold leading-snug text-gray-900"
        >
          Ứng dụng chỉ hỗ trợ ở thiết bị di động
        </h1>
        <p className="text-[0.95rem] leading-relaxed text-gray-600">
          Vui lòng mở trang này trên điện thoại để tiếp tục sử dụng.
        </p>
      </div>
    </div>
  );
}
