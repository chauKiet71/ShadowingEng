import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Crown,
  UserCheck,
  Filter,
  Download,
  Plus,
  Eye,
  Pencil,
  MoreHorizontal,
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import UserAvatar from '../../components/UserAvatar';
import { api, type AdminUserRow } from '../../lib/api';

const tabs = [
  { label: 'Tất cả người dùng', filter: {} },
  { label: 'Đang hoạt động', filter: { status: 'ACTIVE' as const } },
  { label: 'Gói miễn phí', filter: { isPremium: false } },
  { label: 'Gói Pro', filter: { isPremium: true } },
  { label: 'Đã khóa', filter: { status: 'LOCKED' as const } },
];

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  LOCKED: 'bg-red-100 text-red-700',
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Không hoạt động',
  LOCKED: 'Đã khóa',
};

const PAGE_SIZE = 10;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getPackageLabel(user: AdminUserRow) {
  if (user.package?.name) return user.package.name;
  return user.isPremium ? 'Pro' : 'Free';
}

function getPackageBadgeClass(packageName: string) {
  if (packageName === 'Free') return 'bg-gray-100 text-gray-600';
  if (packageName === 'Pro') return 'bg-purple-100 text-purple-700';
  return 'bg-blue-100 text-blue-700';
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    newUsers: 0,
    proUsers: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, usersData] = await Promise.all([
        api.getUserStats(),
        api.getUsers({
          page,
          limit: PAGE_SIZE,
          ...tabs[activeTab].filter,
        }),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setTotal(usersData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu người dùng');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statCards = useMemo(
    () => [
      {
        label: 'Tổng người dùng',
        value: stats.total.toLocaleString('vi-VN'),
        icon: Users,
        color: 'bg-purple-100 text-purple-600',
      },
      {
        label: 'Người dùng mới',
        value: stats.newUsers.toLocaleString('vi-VN'),
        icon: UserPlus,
        color: 'bg-green-100 text-green-600',
      },
      {
        label: 'Đang sử dụng Pro',
        value: stats.proUsers.toLocaleString('vi-VN'),
        icon: Crown,
        color: 'bg-blue-100 text-blue-600',
      },
      {
        label: 'Người dùng hoạt động',
        value: stats.activeUsers.toLocaleString('vi-VN'),
        icon: UserCheck,
        color: 'bg-orange-100 text-orange-600',
      },
    ],
    [stats],
  );

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <AdminLayout
      title="Quản lý người dùng"
      subtitle="Quản lý và theo dõi toàn bộ người dùng của ứng dụng"
      actions={
        <button className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
          <Plus size={16} /> Thêm người dùng
        </button>
      }
    >
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
                <Icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex gap-1">
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
          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <Filter size={14} /> Bộ lọc
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <Download size={14} /> Xuất Excel
            </button>
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
                <th className="p-4 w-8"><input type="checkbox" className="rounded" /></th>
                <th className="p-4 font-medium">Người dùng</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Gói đăng ký</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium">Ngày tham gia</th>
                <th className="p-4 font-medium">Hoạt động cuối</th>
                <th className="p-4 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Chưa có người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const packageLabel = getPackageLabel(user);
                  return (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-4"><input type="checkbox" className="rounded" /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            name={user.fullName}
                            src={user.avatarUrl}
                            size="sm"
                          />
                          <span className="font-medium text-gray-900">{user.fullName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{user.email}</td>
                      <td className="p-4">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${getPackageBadgeClass(packageLabel)}`}
                        >
                          {packageLabel}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge[user.status]}`}
                        >
                          {statusLabel[user.status]}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="p-4 text-gray-500">{formatDate(user.lastActivity)}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                            <Eye size={16} />
                          </button>
                          <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 flex items-center justify-between border-t border-gray-50">
          <p className="text-sm text-gray-500">
            Hiển thị {rangeStart} đến {rangeEnd} trong tổng số {total.toLocaleString('vi-VN')} người dùng
          </p>
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
                <span key={`ellipsis-${index}`} className="w-8 h-8 text-sm flex items-center justify-center text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  disabled={loading}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded-lg ${
                    page === p ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
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
