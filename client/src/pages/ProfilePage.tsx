import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Moon, Sun, Crown, Star, Flame, Headphones, Clock,
  Target, Heart, Gauge, HelpCircle, ChevronRight, LogOut, Pencil, MessageCircle,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useListeningStats } from '../contexts/HistoryContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useTheme } from '../contexts/ThemeContext';
import { api, type LessonHistoryStats } from '../lib/api';

const menuItems = [
  { icon: Heart, label: 'Danh sách yêu thích', color: 'text-red-500', to: '/kham-pha?filter=fav' },
  { icon: Clock, label: 'Lịch sử học tập', color: 'text-blue-500', to: '/lich-su' },
  { icon: MessageCircle, label: 'Trò chuyện với AI', color: 'text-teal-500', to: '/tro-chuyen-ai' },
  { icon: Gauge, label: 'Trình độ', color: 'text-green-500', to: '/trinh-do' },
  { icon: HelpCircle, label: 'Hỗ trợ', color: 'text-purple-500', to: 'http://zalo.me/0327142982', external: true },
];

function getPremiumTimeLabel(
  expiresAt?: string | null,
  packageDuration?: string,
) {
  if (!expiresAt) {
    return packageDuration ? `Thời hạn ${packageDuration}` : 'Đang có hiệu lực';
  }

  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return 'Đang có hiệu lực';

  const remainingDays = Math.max(
    0,
    Math.ceil((expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );
  const date = expiry.toLocaleDateString('vi-VN');

  if (remainingDays === 0) return `Hết hạn hôm nay · ${date}`;
  return `Còn ${remainingDays} ngày · Hết hạn ${date}`;
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const localStats = useListeningStats();
  const { favoriteIds } = useFavorites();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [remoteStats, setRemoteStats] = useState<LessonHistoryStats | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setRemoteStats(null);
      return;
    }

    void api.getMyLessonStats()
      .then(setRemoteStats)
      .catch(() => setRemoteStats(null));
  }, [user?.id]);

  const streakDays = Math.max(
    localStats.streakDays,
    user?.streakDays ?? 0,
    remoteStats?.streakDays ?? 0,
  );
  const completedLessons =
    localStats.completedLessons || remoteStats?.completedLessons || 0;
  const hoursListened =
    localStats.hoursListened || remoteStats?.hoursListened || 0;

  const handleLogout = () => {
    logout();
    navigate('/dang-nhap', { replace: true });
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Vui lòng chọn file ảnh');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Ảnh không được lớn hơn 2MB');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError('');
    try {
      await api.updateAvatar(file);
      await refreshUser();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Không thể cập nhật ảnh');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <MobileLayout showPlayer={false}>
      <div className="px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Cá nhân</h1>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-gray-500 dark:text-gray-300"
              aria-label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
              title={theme === 'dark' ? 'Sáng' : 'Tối'}
            >
              {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <UserAvatar
              name={user?.fullName ?? 'User'}
              src={user?.avatarUrl}
              size="lg"
              bordered
              className={uploadingAvatar ? 'opacity-60' : ''}
            />
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm disabled:opacity-60"
              aria-label="Cập nhật ảnh đại diện"
            >
              <Pencil size={12} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-lg">{user?.fullName}</h2>
              {user?.isPremium && (
                <span className="flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Crown size={10} /> Premium
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {user?.isPremium ? (
                <>
                  <Crown size={14} className="text-primary" />
                  <span className="text-sm font-medium text-gray-700">
                    Gói Premium
                    {user.package?.name ? ` · ${user.package.name}` : ''}
                  </span>
                </>
              ) : (
                <>
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-sm text-gray-600">Gói miễn phí</span>
                </>
              )}
            </div>
            {user?.isPremium && (
              <p className="text-[11px] font-medium text-primary mt-0.5">
                {getPremiumTimeLabel(
                  user.premiumExpiresAt,
                  user.package?.duration,
                )}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            {avatarError && (
              <p className="text-xs text-red-500 mt-1">{avatarError}</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-900 rounded-2xl p-4 grid grid-cols-3 gap-2 mb-5">
          <div className="text-center">
            <Flame size={20} className="text-orange-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{streakDays}</p>
            <p className="text-gray-400 text-[9px]">Ngày streak</p>
          </div>
          <div className="text-center">
            <Headphones size={20} className="text-blue-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{completedLessons}</p>
            <p className="text-gray-400 text-[9px]">Bài hoàn thành</p>
          </div>
          <div className="text-center">
            <Clock size={20} className="text-green-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{hoursListened}</p>
            <p className="text-gray-400 text-[9px]">Giờ nghe</p>
          </div>
        </div>

        {/* Learning Stats */}
        <div className="mb-5">
          <h3 className="font-bold text-gray-900 mb-3">Thống kê học tập</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl card-shadow p-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-2">
                <Target size={16} />
              </div>
              <p className="font-bold text-gray-900">{localStats.avgHoursPerDay}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Giờ/ngày trung bình</p>
            </div>
            <div className="bg-white rounded-xl card-shadow p-3">
              <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-2">
                <Heart size={16} />
              </div>
              <p className="font-bold text-gray-900">{favoriteIds.length}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Yêu thích</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl card-shadow mb-4 overflow-hidden">
          {menuItems.map(({ icon: Icon, label, color, to, external }, i) => {
            const className = `flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 ${i > 0 ? 'border-t border-gray-50' : ''}`;
            const content = (
              <>
                <Icon size={20} className={color} />
                <span className="flex-1 text-sm text-gray-800">{label}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </>
            );
            if (external) {
              return (
                <a
                  key={label}
                  href={to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {content}
                </a>
              );
            }
            return (
              <Link key={label} to={to} className={className}>
                {content}
              </Link>
            );
          })}
        </div>

        {/* Premium Banner */}
        {!user?.isPremium && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Crown size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm">Nâng cấp lên Premium</p>
            <p className="text-xs text-gray-500">Mở khóa tất cả tính năng</p>
          </div>
          <Link to="/nang-cap" className="bg-primary text-white text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap">
            Nâng cấp ngay
          </Link>
        </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 text-red-500 border border-red-100 bg-red-50 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors mb-4"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </MobileLayout>
  );
}
