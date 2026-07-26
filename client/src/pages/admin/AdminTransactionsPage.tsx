import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import UserAvatar from '../../components/UserAvatar';
import {
  type AdminPaymentOrderRow,
  type AdminTransactionsStats,
} from '../../lib/api';
import { peekCache } from '../../lib/prefetchCache';
import {
  AdminPrefetchKeys,
  fetchAdminTransactionStats,
  fetchAdminTransactions,
} from '../../lib/prefetchAdmin';

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;

const tabs: Array<{
  label: string;
  status?: AdminPaymentOrderRow['status'];
}> = [
  { label: 'Tất cả' },
  { label: 'Chờ thanh toán', status: 'PENDING' },
  { label: 'Đã thanh toán', status: 'PAID' },
  { label: 'Hết hạn', status: 'EXPIRED' },
  { label: 'Đã hủy', status: 'CANCELLED' },
];

const statusLabel: Record<AdminPaymentOrderRow['status'], string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

const statusClass: Record<AdminPaymentOrderRow['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

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
    second: '2-digit',
    hour12: false,
  });
}

export default function AdminTransactionsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const defaultTxParams = { page: 1, limit: 10 as number };
  const cachedStats = peekCache<AdminTransactionsStats>(
    AdminPrefetchKeys.transactionStats,
  );
  const cachedList = peekCache<{
    orders: AdminPaymentOrderRow[];
    total: number;
    page: number;
    limit: number;
  }>(AdminPrefetchKeys.transactions(defaultTxParams));

  const [orders, setOrders] = useState<AdminPaymentOrderRow[]>(
    () => cachedList?.orders ?? [],
  );
  const [total, setTotal] = useState(() => cachedList?.total ?? 0);
  const [stats, setStats] = useState<AdminTransactionsStats | null>(
    () => cachedStats ?? null,
  );
  const [loading, setLoading] = useState(() => !cachedList || !cachedStats);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadData = useCallback(async (force = false) => {
    const listParams = {
      page,
      limit: pageSize,
      status: tabs[activeTab].status,
      search: search || undefined,
    };
    const hasCache =
      !!peekCache(AdminPrefetchKeys.transactionStats) &&
      !!peekCache(AdminPrefetchKeys.transactions(listParams));
    if (!hasCache || force) setLoading(true);
    setError('');
    try {
      const [statsData, listData] = await Promise.all([
        fetchAdminTransactionStats(force),
        fetchAdminTransactions(listParams, force),
      ]);
      setStats(statsData);
      setOrders(listData.orders);
      setTotal(listData.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tải được giao dịch',
      );
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, search]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'Chờ thanh toán',
        value: stats.pending.toLocaleString('vi-VN'),
        hint: 'Đơn đang mở',
        icon: Clock3,
        color: 'bg-amber-100 text-amber-600',
      },
      {
        label: 'Doanh thu hôm nay',
        value: formatMoney(stats.revenueToday),
        hint: `${stats.paidToday} đơn thành công`,
        icon: CheckCircle2,
        color: 'bg-emerald-100 text-emerald-600',
      },
      {
        label: 'Doanh thu tháng này',
        value: formatMoney(stats.revenueMonth),
        hint: `${stats.paidMonth} đơn`,
        icon: Wallet,
        color: 'bg-violet-100 text-violet-600',
      },
      {
        label: 'Hết hạn / hủy (7 ngày)',
        value: stats.expiredOrCancelled7d.toLocaleString('vi-VN'),
        hint: `${stats.paidTotal} đơn đã thanh toán tổng`,
        icon: XCircle,
        color: 'bg-red-100 text-red-600',
      },
    ];
  }, [stats]);

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i += 1
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <AdminLayout
      title="Giao dịch"
      subtitle="Theo dõi đơn thanh toán SePay và trạng thái nâng cấp Premium"
      actions={
        <button
          type="button"
          onClick={() => void loadData(true)}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, hint, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}
              >
                <Icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-50 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex gap-1 flex-wrap">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setActiveTab(i);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === i
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm mã, email, tên, gói..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 text-gray-500 text-left">
                <th className="p-4 font-medium">Mã đơn</th>
                <th className="p-4 font-medium">Người dùng</th>
                <th className="p-4 font-medium">Gói</th>
                <th className="p-4 font-medium">Số tiền</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium">Tạo lúc</th>
                <th className="p-4 font-medium">Thanh toán</th>
                <th className="p-4 font-medium">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    <Loader2
                      className="inline-block animate-spin text-primary mr-2"
                      size={18}
                    />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Chưa có giao dịch nào.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <Fragment key={order.id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-medium text-gray-900">
                          {order.paymentCode}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono">
                          {order.id.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <UserAvatar
                            name={order.user.fullName}
                            src={order.user.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {order.user.fullName}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {order.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700">{order.package.name}</td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-900">
                          {formatMoney(order.amount)}
                        </p>
                        {order.paidAmount != null &&
                          order.paidAmount !== order.amount && (
                            <p className="text-[11px] text-gray-400">
                              Nhận {formatMoney(order.paidAmount)}
                            </p>
                          )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${statusClass[order.status]}`}
                        >
                          {statusLabel[order.status]}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="p-4 text-gray-500 whitespace-nowrap">
                        {order.status === 'PENDING'
                          ? `Hết hạn ${formatDateTime(order.expiresAt)}`
                          : formatDateTime(order.paidAt)}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((prev) =>
                              prev === order.id ? null : order.id,
                            )
                          }
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {expandedId === order.id ? 'Thu gọn' : 'Xem webhook'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={8} className="px-4 py-3">
                          {order.events.length === 0 ? (
                            <p className="text-xs text-gray-400">
                              Chưa có sự kiện webhook SePay
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {order.events.map((event) => (
                                <div
                                  key={event.id}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
                                >
                                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    <span className="font-semibold text-gray-800">
                                      {event.status}
                                    </span>
                                    <span className="text-gray-500 font-mono">
                                      {event.sepayTransactionId}
                                    </span>
                                    <span className="text-gray-400">
                                      {formatDateTime(event.createdAt)}
                                    </span>
                                  </div>
                                  {event.reason && (
                                    <p className="text-gray-500 mt-1">
                                      {event.reason}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 flex items-center justify-between border-t border-gray-50 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                disabled={loading}
                onChange={(event) => {
                  setPageSize(
                    Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number],
                  );
                  setPage(1);
                }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary disabled:opacity-50"
                aria-label="Số dòng mỗi trang"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>/ trang</span>
            </label>
            <p className="text-sm text-gray-500">
              {rangeStart}–{rangeEnd} / {total.toLocaleString('vi-VN')} giao dịch
            </p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 text-sm rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              ←
            </button>
            {pageNumbers.map((p, index) =>
              p === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="w-8 h-8 text-sm flex items-center justify-center text-gray-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  disabled={loading}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded-lg ${
                    page === p
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 text-sm rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
