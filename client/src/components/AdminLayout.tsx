import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, CreditCard, BarChart3,
  Bell, Settings, ScrollText, Crown, Menu, Search, LogOut,
} from 'lucide-react';
import Logo from './Logo';
import UserAvatar from './UserAvatar';
import { useAuth } from '../contexts/AuthContext';

const sidebarItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Tổng quan', end: true },
  { to: '/admin/users', icon: Users, label: 'Người dùng' },
  { to: '/admin/content', icon: FileText, label: 'Nội dung' },
  { to: '/admin/packages', icon: CreditCard, label: 'Gói đăng ký' },
  { to: '/admin/transactions', icon: ScrollText, label: 'Giao dịch' },
  { to: '/admin/stats', icon: BarChart3, label: 'Thống kê' },
  { to: '/admin/settings', icon: Settings, label: 'Cài đặt' },
];

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.fullName ?? 'Admin';

  const handleLogout = () => {
    logout();
    navigate('/dang-nhap', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col fixed h-full z-20">
        <div className="p-5 border-b border-gray-50">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {sidebarItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-50">
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl p-3 text-white mb-3">
            <Crown size={18} className="mb-1" />
            <p className="text-xs font-semibold">Nâng cấp gói Pro</p>
            <button className="mt-2 text-[10px] bg-white/20 px-2 py-1 rounded-lg">Nâng cấp ngay</button>
          </div>
          <div className="flex items-center gap-2 px-2 mb-3">
            <UserAvatar name={displayName} src={user?.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-[10px] text-gray-400">Quản trị viên</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-red-500 border border-red-100 bg-red-50 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-60">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
          <button className="text-gray-500 lg:hidden"><Menu size={20} /></button>
          <div className="flex-1 relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button className="relative text-gray-500">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">5</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-red-500 border border-red-100 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
          <div className="flex items-center gap-2">
            <UserAvatar name={displayName} src={user?.avatarUrl} size="sm" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-400">Quản trị viên</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
