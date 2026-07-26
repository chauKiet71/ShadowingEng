import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Clapperboard,
  Loader2,
  Mic,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AdminDateRangePicker from '../../components/AdminDateRangePicker';
import {
  createDateRangeFromPreset,
  type DateRangeValue,
} from '../../lib/adminDateRange';
import { type AdminStatsResponse } from '../../lib/api';
import { peekCache } from '../../lib/prefetchCache';
import {
  AdminPrefetchKeys,
  fetchAdminStats,
} from '../../lib/prefetchAdmin';

function formatMoney(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}tr₫`;
  }
  return `${value.toLocaleString('vi-VN')}₫`;
}

function formatShortDate(value: string) {
  const [, m, d] = value.split('-');
  return `${d}/${m}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function LineChart({
  labels,
  series,
  height = 220,
}: {
  labels: string[];
  series: Array<{
    key: string;
    label: string;
    color: string;
    values: number[];
  }>;
  height?: number;
}) {
  const width = 640;
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...series.flatMap((s) => s.values));
  const labelStep = Math.max(1, Math.ceil(labels.length / 7));

  const point = (index: number, value: number) => {
    const x =
      padding.left +
      (labels.length <= 1 ? innerW / 2 : (index / (labels.length - 1)) * innerW);
    const y = padding.top + innerH - (value / maxValue) * innerH;
    return { x, y };
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = padding.top + innerH * (1 - ratio);
        return (
          <g key={ratio}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-gray-400"
              fontSize="10"
            >
              {Math.round(maxValue * ratio)}
            </text>
          </g>
        );
      })}

      {series.map((item) => {
        const path = item.values
          .map((value, index) => {
            const { x, y } = point(index, value);
            return `${index === 0 ? 'M' : 'L'}${x},${y}`;
          })
          .join(' ');
        return (
          <path
            key={item.key}
            d={path}
            fill="none"
            stroke={item.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}

      {labels.map((label, index) =>
        index % labelStep === 0 || index === labels.length - 1 ? (
          <text
            key={label}
            x={point(index, 0).x}
            y={height - 8}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize="10"
          >
            {formatShortDate(label)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function BarChart({
  labels,
  values,
  color = '#6366f1',
  height = 220,
  formatValue = (v: number) => String(v),
}: {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const width = 640;
  const padding = { top: 16, right: 16, bottom: 28, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...values);
  const gap = 4;
  const barW = labels.length
    ? Math.max(2, (innerW - gap * (labels.length - 1)) / labels.length)
    : 0;
  const labelStep = Math.max(1, Math.ceil(labels.length / 7));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 0.5, 1].map((ratio) => {
        const y = padding.top + innerH * (1 - ratio);
        return (
          <g key={ratio}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-gray-400"
              fontSize="10"
            >
              {formatValue(Math.round(maxValue * ratio))}
            </text>
          </g>
        );
      })}

      {values.map((value, index) => {
        const h = (value / maxValue) * innerH;
        const x = padding.left + index * (barW + gap);
        const y = padding.top + innerH - h;
        return (
          <rect
            key={labels[index]}
            x={x}
            y={y}
            width={barW}
            height={Math.max(value > 0 ? 2 : 0, h)}
            rx={2}
            fill={color}
            opacity={0.85}
          />
        );
      })}

      {labels.map((label, index) =>
        index % labelStep === 0 || index === labels.length - 1 ? (
          <text
            key={label}
            x={padding.left + index * (barW + gap) + barW / 2}
            y={height - 8}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize="10"
          >
            {formatShortDate(label)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function HorizontalBars({
  items,
}: {
  items: Array<{ label: string; value: number; color: string }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-semibold text-gray-900">
              {item.value.toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminStatsPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    createDateRangeFromPreset('last_30'),
  );
  const cached = peekCache<AdminStatsResponse>(
    AdminPrefetchKeys.stats(dateRange.from, dateRange.to),
  );
  const [data, setData] = useState<AdminStatsResponse | null>(() => cached ?? null);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    const hasCache = !!peekCache(
      AdminPrefetchKeys.stats(dateRange.from, dateRange.to),
    );
    if (!hasCache || force) setLoading(true);
    setError('');
    try {
      const stats = await fetchAdminStats(
        { from: dateRange.from, to: dateRange.to },
        force,
      );
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được thống kê');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    const cachedRange = peekCache<AdminStatsResponse>(
      AdminPrefetchKeys.stats(dateRange.from, dateRange.to),
    );
    if (cachedRange) {
      setData(cachedRange);
      setLoading(false);
    }
    void load(false);
  }, [load, dateRange.from, dateRange.to]);

  const labels = useMemo(
    () => data?.series.map((item) => item.date) ?? [],
    [data],
  );

  const summaryCards = data
    ? [
        {
          label: 'User mới',
          value: data.summary.newUsers.toLocaleString('vi-VN'),
          hint: `TB ${data.summary.avgDailyActive} active/ngày`,
          icon: UserPlus,
          color: 'bg-emerald-100 text-emerald-600',
        },
        {
          label: 'Doanh thu',
          value: formatMoney(data.summary.revenue),
          hint: `${data.summary.paidOrders} đơn thanh toán`,
          icon: Wallet,
          color: 'bg-amber-100 text-amber-700',
        },
        {
          label: 'Bài nghe hoàn thành',
          value: data.summary.lessonsCompleted.toLocaleString('vi-VN'),
          hint: `${data.summary.listeningMinutes} phút nghe`,
          icon: BookOpen,
          color: 'bg-sky-100 text-sky-600',
        },
        {
          label: 'Luyện nói + Dịch video',
          value: (
            data.summary.speakingSessions + data.summary.videoReady
          ).toLocaleString('vi-VN'),
          hint: `${data.summary.speakingSessions} nói · ${data.summary.videoReady} video`,
          icon: TrendingUp,
          color: 'bg-violet-100 text-violet-600',
        },
      ]
    : [];

  const funnelSteps = data
    ? [
        { label: 'Đăng ký', value: data.funnel.registered, color: '#6366f1' },
        { label: 'Có hoạt động', value: data.funnel.activated, color: '#3b82f6' },
        { label: 'Tương tác học', value: data.funnel.engaged, color: '#10b981' },
        { label: 'Thanh toán', value: data.funnel.paid, color: '#f59e0b' },
      ]
    : [];

  const featureItems = data
    ? [
        {
          label: 'Nghe (hoàn thành)',
          value: data.featureMix.listening,
          color: '#10b981',
          icon: BookOpen,
        },
        {
          label: 'Luyện nói',
          value: data.featureMix.speaking,
          color: '#6366f1',
          icon: Mic,
        },
        {
          label: 'Dịch video',
          value: data.featureMix.video,
          color: '#f43f5e',
          icon: Clapperboard,
        },
        {
          label: 'Từ vựng',
          value: data.featureMix.vocabulary,
          color: '#8b5cf6',
          icon: Users,
        },
      ]
    : [];

  return (
    <AdminLayout
      title="Thống kê"
      subtitle="Xu hướng theo thời gian — người dùng, doanh thu và mức dùng tính năng"
      actions={
        <div className="flex items-center gap-2">
          <AdminDateRangePicker value={dateRange} onChange={setDateRange} />
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
        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white border border-gray-100 p-4"
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
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}
                    >
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Người dùng theo ngày
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    User mới vs active (có tương tác)
                  </p>
                </div>
                <div className="flex gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Mới
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
              </div>
              <LineChart
                labels={labels}
                series={[
                  {
                    key: 'newUsers',
                    label: 'Mới',
                    color: '#6366f1',
                    values: data.series.map((d) => d.newUsers),
                  },
                  {
                    key: 'activeUsers',
                    label: 'Active',
                    color: '#10b981',
                    values: data.series.map((d) => d.activeUsers),
                  },
                ]}
              />
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 p-4">
              <div className="mb-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Doanh thu theo ngày
                </h2>
                <p className="text-[11px] text-gray-400">
                  Tổng đơn thanh toán thành công
                </p>
              </div>
              <BarChart
                labels={labels}
                values={data.series.map((d) => d.revenue)}
                color="#f59e0b"
                formatValue={(v) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : String(v)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Tính năng theo ngày
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Nghe hoàn thành · Luyện nói · Dịch video
                  </p>
                </div>
                <div className="flex gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Nghe
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Nói
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Video
                  </span>
                </div>
              </div>
              <LineChart
                labels={labels}
                series={[
                  {
                    key: 'lessons',
                    label: 'Nghe',
                    color: '#10b981',
                    values: data.series.map((d) => d.lessonsCompleted),
                  },
                  {
                    key: 'speaking',
                    label: 'Nói',
                    color: '#6366f1',
                    values: data.series.map((d) => d.speakingSessions),
                  },
                  {
                    key: 'video',
                    label: 'Video',
                    color: '#f43f5e',
                    values: data.series.map((d) => d.videoReady),
                  },
                ]}
              />
            </div>

            <div className="rounded-2xl bg-white border border-gray-100 p-4">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Funnel chuyển đổi
                </h2>
                <p className="text-[11px] text-gray-400">
                  Trong khoảng {dateRange.label}
                </p>
              </div>
              <HorizontalBars items={funnelSteps} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {featureItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2 text-gray-500">
                        <Icon size={14} style={{ color: item.color }} />
                        <span className="text-[11px]">{item.label}</span>
                      </div>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {item.value.toLocaleString('vi-VN')}
                      </p>
                    </div>
                  );
                })}
              </div>
              {data.summary.videoFailed > 0 && (
                <p className="mt-3 text-xs text-amber-600">
                  {data.summary.videoFailed} job dịch video thất bại trong kỳ
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 text-right">
            Cập nhật lúc {formatDateTime(data.generatedAt)}
          </p>
        </div>
      ) : null}
    </AdminLayout>
  );
}
