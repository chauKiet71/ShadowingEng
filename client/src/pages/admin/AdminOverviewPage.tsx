import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Clapperboard,
  Crown,
  Loader2,
  Mic,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import type { AdminOverview } from '../../lib/api';
import { peekCache } from '../../lib/prefetchCache';
import {
  AdminPrefetchKeys,
  fetchAdminOverview,
} from '../../lib/prefetchAdmin';

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')}₫`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatRelative(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

const paymentStatusLabel: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

const paymentStatusClass: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function AdminOverviewPage() {
  const cached = peekCache<AdminOverview>(AdminPrefetchKeys.overview);
  const [data, setData] = useState<AdminOverview | null>(() => cached ?? null);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!peekCache(AdminPrefetchKeys.overview) || force) setLoading(true);
    setError('');
    try {
      const overview = await fetchAdminOverview(force);
      setData(overview);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tải được tổng quan',
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const kpis = data
    ? [
        {
          label: 'Người dùng mới hôm nay',
          value: data.kpis.usersNewToday.toLocaleString('vi-VN'),
          hint: `+${data.kpis.usersNew7d} trong 7 ngày`,
          icon: UserPlus,
          color: 'bg-emerald-100 text-emerald-600',
        },
        {
          label: 'Đang hoạt động hôm nay',
          value: data.kpis.dau.toLocaleString('vi-VN'),
          hint: `${data.kpis.usersTotal.toLocaleString('vi-VN')} tổng đăng ký`,
          icon: Activity,
          color: 'bg-sky-100 text-sky-600',
        },
        {
          label: 'Premium đang hiệu lực',
          value: data.kpis.premiumActive.toLocaleString('vi-VN'),
          hint:
            data.kpis.premiumExpiring7d > 0
              ? `${data.kpis.premiumExpiring7d} sắp hết hạn 7 ngày`
              : 'Không có gói sắp hết hạn',
          icon: Crown,
          color: 'bg-violet-100 text-violet-600',
        },
        {
          label: 'Doanh thu tháng này',
          value: formatMoney(data.kpis.revenueMonth),
          hint: `Hôm nay ${formatMoney(data.kpis.revenueToday)} · ${data.kpis.paidOrdersToday} đơn`,
          icon: Wallet,
          color: 'bg-amber-100 text-amber-700',
        },
        {
          label: 'Chuyển đổi 30 ngày',
          value: `${data.kpis.conversionRate30d}%`,
          hint: 'User mới có thanh toán / user mới',
          icon: TrendingUp,
          color: 'bg-indigo-100 text-indigo-600',
        },
        {
          label: 'Tổng người dùng',
          value: data.kpis.usersTotal.toLocaleString('vi-VN'),
          hint: 'Không tính tài khoản khách',
          icon: Users,
          color: 'bg-purple-100 text-purple-600',
        },
      ]
    : [];

  const featureCards = data
    ? [
        {
          label: 'Bài nghe hoàn thành',
          value: data.features.lessonsCompletedToday,
          hint: `${data.features.listeningMinutesToday} phút nghe · ${data.features.listeningSessionsToday} phiên`,
          icon: BookOpen,
          color: 'text-emerald-600 bg-emerald-50',
        },
        {
          label: 'Phiên luyện nói',
          value: data.features.speakingSessionsToday,
          hint: 'Tạo trong hôm nay',
          icon: Mic,
          color: 'text-indigo-600 bg-indigo-50',
        },
        {
          label: 'Dịch video thành công',
          value: data.features.videoJobsReadyToday,
          hint:
            data.features.videoJobsFailedToday > 0
              ? `${data.features.videoJobsFailedToday} thất bại hôm nay`
              : 'Không có lỗi hôm nay',
          icon: Clapperboard,
          color: 'text-rose-600 bg-rose-50',
        },
        {
          label: 'Từ vựng cập nhật',
          value: data.features.vocabUpdatedToday,
          hint: 'Tiến độ học/ôn hôm nay',
          icon: BookOpen,
          color: 'text-violet-600 bg-violet-50',
        },
      ]
    : [];

  return (
    <AdminLayout
      title="Tổng quan"
      subtitle="Sức khỏe sản phẩm hôm nay — người dùng, doanh thu và sử dụng tính năng"
      actions={
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Làm mới
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {kpis.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-2xl font-bold text-gray-900">
                        {item.value}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {item.hint}
                      </p>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}
                    >
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              Sử dụng tính năng hôm nay
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {featureCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white border border-gray-100 p-4"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}
                    >
                      <Icon size={16} />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-gray-900">
                      {item.value.toLocaleString('vi-VN')}
                    </p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">{item.hint}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl bg-white border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Giao dịch gần đây
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Chờ {data.payments.pending} · Thành công hôm nay{' '}
                    {data.payments.paidToday} · Hết hạn/hủy 7 ngày{' '}
                    {data.payments.expiredOrCancelled7d}
                  </p>
                </div>
                <Link
                  to="/admin/transactions"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-50">
                      <th className="px-4 py-2.5 font-medium">Người dùng</th>
                      <th className="px-4 py-2.5 font-medium">Gói</th>
                      <th className="px-4 py-2.5 font-medium">Số tiền</th>
                      <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                      <th className="px-4 py-2.5 font-medium">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.recent.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-400 text-sm"
                        >
                          Chưa có giao dịch
                        </td>
                      </tr>
                    ) : (
                      data.payments.recent.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-[160px]">
                              {order.userName}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {order.paymentCode}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {order.packageName}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {formatMoney(order.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                paymentStatusClass[order.status] ??
                                'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {paymentStatusLabel[order.status] ?? order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {formatDateTime(order.paidAt || order.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-gray-100 p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Nội dung
                </h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bài học</span>
                    <span className="font-semibold text-gray-900">
                      {data.content.lessonsTotal}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chủ đề</span>
                    <span className="font-semibold text-gray-900">
                      {data.content.categoriesTotal}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bài đang khóa</span>
                    <span className="font-semibold text-gray-900">
                      {data.content.lockedLessons}
                    </span>
                  </div>
                </div>
                <Link
                  to="/admin/content"
                  className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  Quản lý nội dung →
                </Link>
              </div>

              <div className="rounded-2xl bg-white border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h2 className="text-sm font-semibold text-gray-900">
                    Cần chú ý
                  </h2>
                </div>
                {data.alerts.videoFailed.length === 0 &&
                data.alerts.premiumExpiring.length === 0 ? (
                  <p className="text-sm text-gray-400">Không có cảnh báo</p>
                ) : (
                  <div className="space-y-3">
                    {data.alerts.videoFailed.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-sm">
                        <p className="font-medium text-gray-900 line-clamp-1">
                          Dịch video lỗi · {item.title}
                        </p>
                        <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">
                          {item.userName}
                          {item.errorMessage ? ` · ${item.errorMessage}` : ''}
                        </p>
                      </div>
                    ))}
                    {data.alerts.premiumExpiring.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-sm">
                        <p className="font-medium text-gray-900 line-clamp-1">
                          Premium sắp hết · {item.fullName}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {item.packageName} · hết hạn{' '}
                          {formatDateTime(item.expiresAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-100 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Hoạt động gần đây
            </h2>
            {data.activity.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có hoạt động</p>
            ) : (
              <ul className="space-y-3">
                {data.activity.map((item, index) => (
                  <li
                    key={`${item.type}-${item.at}-${index}`}
                    className="flex items-start gap-3"
                  >
                    <span
                      className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        item.type === 'payment'
                          ? 'bg-emerald-500'
                          : item.type === 'alert'
                            ? 'bg-amber-500'
                            : 'bg-primary'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {item.subtitle}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">
                      {formatRelative(item.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[11px] text-gray-400 text-right">
            Cập nhật lúc {formatDateTime(data.generatedAt)}
          </p>
        </div>
      ) : null}
    </AdminLayout>
  );
}
