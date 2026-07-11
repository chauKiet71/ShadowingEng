import { NavLink } from 'react-router-dom';
import { Home, Compass, Clock, User } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Trang chủ' },
  { to: '/kham-pha', icon: Compass, label: 'Khám phá' },
  { to: '/lich-su', icon: Clock, label: 'Lịch sử' },
  { to: '/ca-nhan', icon: User, label: 'Cá nhân' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center py-2 px-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
