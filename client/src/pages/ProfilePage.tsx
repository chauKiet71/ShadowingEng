import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Clapperboard,
  Clock,
  Crown,
  Flame,
  Headphones,
  Heart,
  HelpCircle,
  LogOut,
  Mic,
  Moon,
  Pencil,
  RefreshCw,
  Sun,
  Target,
  Volume2,
} from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useHistory, useListeningStats } from '../contexts/HistoryContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useLevel } from '../contexts/LevelContext';
import { useTheme } from '../contexts/ThemeContext';
import { api, type LessonHistoryStats } from '../lib/api';
import { peekCache } from '../lib/prefetchCache';
import {
  PrefetchKeys,
  fetchLessonStats,
} from '../lib/prefetchFeatures';
import type { UserLevelId } from '../data/userLevels';
import {
  DEFAULT_PROFILE_SETTINGS,
  loadProfileSettings,
  saveProfileSettings,
  type ProfileSettings,
} from '../lib/profileSettings';

const LEVEL_CEFR: Record<UserLevelId, string> = {
  beginner: 'A1',
  intermediate: 'A2',
  good: 'B1',
  advanced: 'B2',
};

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

function formatDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-neutral-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function MenuRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  badge,
  to,
  external,
}: {
  icon: typeof Heart;
  iconBg: string;
  iconColor: string;
  label: string;
  badge?: string;
  to: string;
  external?: boolean;
}) {
  const content = (
    <>
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
      >
        <Icon size={17} />
      </div>
      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">
        {label}
      </span>
      {badge && (
        <span className="text-[11px] font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </>
  );

  const className =
    'flex items-center gap-3 px-3.5 py-3 hover:bg-gray-50/80 dark:hover:bg-neutral-800/60 transition-colors';

  if (external) {
    return (
      <a
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
    <Link to={to} className={className}>
      {content}
    </Link>
  );
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { level } = useLevel();
  const localStats = useListeningStats();
  const { entries, todayListeningSeconds } = useHistory();
  const { favoriteIds } = useFavorites();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [settings, setSettings] = useState<ProfileSettings>(loadProfileSettings);
  const [remoteStats, setRemoteStats] = useState<LessonHistoryStats | null>(
    () => peekCache<LessonHistoryStats>(PrefetchKeys.lessonStats) ?? null,
  );
  useEffect(() => {
    saveProfileSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!user?.id) {
      setRemoteStats(null);
      return;
    }

    void fetchLessonStats()
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
  const hoursListened = Math.floor(
    localStats.hoursListened || remoteStats?.hoursListened || 0,
  );
  const cefrBadge = LEVEL_CEFR[level] ?? 'A1';

  const weeklyActivity = useMemo(() => {
    const minutesByDay = new Map<string, number>();
    for (const entry of entries) {
      if (entry.listenedSeconds <= 0) continue;
      const key = formatDayKey(new Date(entry.lastListenedAt));
      minutesByDay.set(
        key,
        (minutesByDay.get(key) ?? 0) + entry.listenedSeconds / 60,
      );
    }

    const todayKey = formatDayKey(new Date());
    if (todayListeningSeconds > 0) {
      minutesByDay.set(
        todayKey,
        Math.max(minutesByDay.get(todayKey) ?? 0, todayListeningSeconds / 60),
      );
    }

    const days: Array<{ label: string; minutes: number; isToday: boolean }> =
      [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = formatDayKey(d);
      const jsDay = d.getDay(); // 0 Sun
      const labelIndex = jsDay === 0 ? 6 : jsDay - 1;
      days.push({
        label: WEEKDAY_LABELS[labelIndex],
        minutes: Math.round(minutesByDay.get(key) ?? 0),
        isToday: i === 0,
      });
    }
    return days;
  }, [entries, todayListeningSeconds]);

  const maxWeeklyMinutes = Math.max(
    1,
    ...weeklyActivity.map((d) => d.minutes),
  );

  const updateSetting = <K extends keyof ProfileSettings>(
    key: K,
    value: ProfileSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

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
      setAvatarError(
        err instanceof Error ? err.message : 'Không thể cập nhật ảnh',
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <MobileLayout showPlayer={false}>
      <div className="min-h-screen bg-[linear-gradient(180deg,#eef1ff_0%,#f7f8fc_40%,#f7f8fc_100%)] dark:bg-[linear-gradient(180deg,#0a0a0a_0%,#171717_40%,#0a0a0a_100%)]">
        <div className="px-4 pt-5 pb-6">
          {/* Profile header */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={uploadingAvatar}
                className="relative block rounded-full disabled:cursor-wait"
                aria-label="Cập nhật ảnh đại diện"
              >
                <UserAvatar
                  name={user?.fullName ?? 'User'}
                  src={user?.avatarUrl}
                  size="lg"
                  className={`!w-[62px] !h-[62px] !text-xl shadow-[0_10px_24px_rgba(99,102,241,0.28)] transition-opacity ${
                    uploadingAvatar ? 'opacity-60' : ''
                  }`}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white dark:bg-neutral-800 text-indigo-500 rounded-full flex items-center justify-center border border-indigo-100 dark:border-neutral-700 shadow-sm">
                  {uploadingAvatar ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <Pencil size={11} />
                  )}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate">
                  {user?.fullName ?? 'Người dùng'}
                </h1>
                {user?.isPremium && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    <Crown size={10} /> Premium
                  </span>
                )}
              </div>

              <p className="text-[12px] font-medium text-gray-600 dark:text-gray-300 mt-0.5">
                {user?.isPremium
                  ? `Gói Premium${user.package?.name ? ` · ${user.package.name}` : ''}`
                  : 'Gói miễn phí'}
              </p>

              {user?.isPremium && (
                <p className="text-[11px] text-indigo-500 font-medium mt-0.5">
                  {getPremiumTimeLabel(
                    user.premiumExpiresAt,
                    user.package?.duration,
                  )}
                </p>
              )}

              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                {user?.email}
              </p>
              {avatarError && (
                <p className="text-xs text-red-500 mt-1">{avatarError}</p>
              )}
            </div>
          </div>

          {/* Premium / Upgrade banner */}
          {user?.isPremium ? (
            <div className="mb-4 rounded-[22px] bg-gradient-to-r from-[#6d5efc] via-[#5b6cf8] to-[#4f7df5] text-white p-4 flex items-center gap-3 shadow-[0_14px_32px_rgba(79,100,245,0.28)]">
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Crown size={18} className="text-amber-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-snug">
                  Gia hạn sớm, thêm 20% thời gian
                </p>
                <p className="text-[11px] text-white/75 mt-0.5 leading-snug">
                  Ưu đãi dành riêng cho thành viên Premium
                </p>
              </div>
              <Link
                to="/nang-cap"
                className="shrink-0 bg-white text-indigo-600 text-xs font-bold px-3.5 py-2 rounded-full"
              >
                Gia hạn
              </Link>
            </div>
          ) : (
            <div className="mb-4 rounded-[22px] bg-gradient-to-r from-[#6d5efc] via-[#5b6cf8] to-[#4f7df5] text-white p-4 flex items-center gap-3 shadow-[0_14px_32px_rgba(79,100,245,0.28)]">
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Crown size={18} className="text-amber-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-snug">
                  Nâng cấp lên Premium
                </p>
                <p className="text-[11px] text-white/75 mt-0.5 leading-snug">
                  Mở khóa tất cả tính năng học tập
                </p>
              </div>
              <Link
                to="/nang-cap"
                className="shrink-0 bg-white text-indigo-600 text-xs font-bold px-3.5 py-2 rounded-full"
              >
                Nâng cấp
              </Link>
            </div>
          )}

          {/* Quick stats */}
          <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.08)] p-4 grid grid-cols-3 gap-2 mb-5">
            <div className="text-center">
              <Flame
                size={18}
                className="text-orange-400 mx-auto mb-1.5 fill-orange-300"
              />
              <p className="text-gray-900 dark:text-white font-bold text-base leading-none">
                {streakDays}
              </p>
              <p className="text-gray-400 text-[10px] mt-1">Ngày streak</p>
            </div>
            <div className="text-center">
              <Headphones size={18} className="text-indigo-400 mx-auto mb-1.5" />
              <p className="text-gray-900 dark:text-white font-bold text-base leading-none">
                {completedLessons}
              </p>
              <p className="text-gray-400 text-[10px] mt-1">Bài hoàn thành</p>
            </div>
            <div className="text-center">
              <Clock size={18} className="text-emerald-400 mx-auto mb-1.5" />
              <p className="text-gray-900 dark:text-white font-bold text-base leading-none">
                {hoursListened}
              </p>
              <p className="text-gray-400 text-[10px] mt-1">Giờ nghe</p>
            </div>
          </div>

          {/* Learning stats + weekly chart */}
          <section className="mb-5">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3">
              Thống kê học tập
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white dark:bg-neutral-900 rounded-[20px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.06)] p-3.5">
                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl flex items-center justify-center mb-2">
                  <Target size={15} />
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-lg leading-none">
                  {Math.floor(localStats.avgHoursPerDay)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Giờ/ngày trung bình
                </p>
              </div>
              <div className="bg-white dark:bg-neutral-900 rounded-[20px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.06)] p-3.5">
                <div className="w-8 h-8 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-xl flex items-center justify-center mb-2">
                  <Heart size={15} />
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-lg leading-none">
                  {favoriteIds.length}
                </p>
                <p className="text-[10px] text-gray-400 mt-1.5">Yêu thích</p>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.06)] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  Hoạt động 7 ngày qua
                </h3>
                <span className="text-[10px] text-gray-400">phút học</span>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-24 px-1">
                {weeklyActivity.map((day) => {
                  const heightPct = Math.max(
                    day.minutes > 0 ? 12 : 6,
                    Math.round((day.minutes / maxWeeklyMinutes) * 100),
                  );
                  return (
                    <div
                      key={`${day.label}-${day.isToday}`}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div className="w-full h-20 flex items-end justify-center">
                        <div
                          className={`w-[70%] max-w-[28px] rounded-t-md transition-all ${
                            day.isToday
                              ? 'bg-indigo-500'
                              : day.minutes > 0
                                ? 'bg-indigo-200 dark:bg-indigo-800'
                                : 'bg-indigo-50 dark:bg-neutral-800'
                          }`}
                          style={{ height: `${heightPct}%` }}
                          title={`${day.minutes} phút`}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-medium ${
                          day.isToday
                            ? 'text-indigo-500'
                            : 'text-gray-400'
                        }`}
                      >
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Quick settings */}
          <section className="mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white mb-3">
              Cài đặt nhanh
            </h2>
            <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.06)] overflow-hidden divide-y divide-gray-50 dark:divide-neutral-800">
              <div className="flex items-center gap-3 px-3.5 py-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                  <Bell size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    Nhắc học hằng ngày
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Thông báo lúc 20:00
                  </p>
                </div>
                <Toggle
                  checked={settings.dailyReminder}
                  onChange={(v) => updateSetting('dailyReminder', v)}
                />
              </div>

              <div className="flex items-center gap-3 px-3.5 py-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center shrink-0">
                  <Volume2 size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    Âm thanh hiệu ứng
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Âm báo khi trả lời đúng/sai
                  </p>
                </div>
                <Toggle
                  checked={settings.soundEffects}
                  onChange={(v) => updateSetting('soundEffects', v)}
                />
              </div>

              <div className="flex items-center gap-3 px-3.5 py-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-300 flex items-center justify-center shrink-0">
                  {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    Chế độ tối
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Giao diện tối dễ nhìn ban đêm
                  </p>
                </div>
                <Toggle
                  checked={theme === 'dark'}
                  onChange={() => toggleTheme()}
                />
              </div>
            </div>
          </section>

          {/* Menu links */}
          <div className="bg-white dark:bg-neutral-900 rounded-[22px] border border-white dark:border-neutral-800 shadow-[0_8px_24px_rgba(99,102,241,0.06)] overflow-hidden divide-y divide-gray-50 dark:divide-neutral-800 mb-4">
            <MenuRow
              icon={RefreshCw}
              iconBg="bg-sky-50 dark:bg-sky-950/40"
              iconColor="text-sky-500"
              label="Lịch sử học tập"
              to="/lich-su"
            />
            <MenuRow
              icon={Mic}
              iconBg="bg-violet-50 dark:bg-violet-950/40"
              iconColor="text-violet-500"
              label="Luyện nói tình huống"
              to="/luyen-noi"
            />
            <MenuRow
              icon={Clapperboard}
              iconBg="bg-fuchsia-50 dark:bg-fuchsia-950/40"
              iconColor="text-fuchsia-500"
              label="Dịch video YouTube"
              to="/dich-video"
            />
            <MenuRow
              icon={Target}
              iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              iconColor="text-emerald-500"
              label="Trình độ"
              badge={cefrBadge}
              to="/trinh-do"
            />
            <MenuRow
              icon={HelpCircle}
              iconBg="bg-amber-50 dark:bg-amber-950/40"
              iconColor="text-amber-500"
              label="Hỗ trợ"
              to="http://zalo.me/0327142982"
              external
            />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-500 border border-red-100 bg-red-50 dark:bg-red-950/30 dark:border-red-900/40 rounded-2xl text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}
