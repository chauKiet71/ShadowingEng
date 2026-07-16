import { NavLink } from 'react-router-dom';
import { Home, Compass, Clock, User, MessageCircle } from 'lucide-react';

const leftItems = [
  { to: '/', icon: Home, label: 'Trang chủ' },
  { to: '/kham-pha', icon: Compass, label: 'Khám phá' },
];

const rightItems = [
  { to: '/lich-su', icon: Clock, label: 'Lịch sử' },
  { to: '/ca-nhan', icon: User, label: 'Cá nhân' },
];

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors flex-1 ${
          isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
        }`
      }
    >
      <Icon size={22} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 z-50">
      <div className="max-w-lg mx-auto flex items-end justify-between px-2 pt-2 pb-2">
        {leftItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <NavLink
          to="/tro-chuyen-ai"
          className="relative flex flex-col items-center -mt-6 mx-1 w-[72px] shrink-0"
        >
          {({ isActive }) => (
            <>
              <span className="relative w-14 h-14">
                <span className="chat-ai-pulse" aria-hidden />
                <span className="chat-ai-pulse" aria-hidden />
                <span
                  className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-neutral-900 transition-transform ${
                    isActive
                      ? 'gradient-btn scale-105'
                      : 'gradient-btn hover:scale-105'
                  }`}
                >
                  <MessageCircle size={26} className="text-white" strokeWidth={2.25} />
                </span>
              </span>
              <span
                className={`text-[10px] font-semibold mt-1 ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`}
              >
                Chat AI
              </span>
            </>
          )}
        </NavLink>

        {rightItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}
