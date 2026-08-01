import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, BookOpen, User, Mic } from 'lucide-react';
import {
  fetchSpeakingQuota,
  fetchSpeakingScenarios,
  fetchVocabularyOverview,
} from '../lib/prefetchFeatures';

const leftItems = [
  { to: '/', icon: Home, label: 'Trang chủ' },
  { to: '/kham-pha', icon: Compass, label: 'Khám phá' },
];

const rightItems = [
  { to: '/tu-vung', icon: BookOpen, label: 'Từ vựng' },
  { to: '/ca-nhan', icon: User, label: 'Cá nhân' },
];

function prefetchSpeakingPage() {
  void Promise.allSettled([fetchSpeakingScenarios(), fetchSpeakingQuota()]);
}

function prefetchVocabularyPage() {
  void fetchVocabularyOverview().catch(() => undefined);
}

function prefetchPrimaryTabs() {
  prefetchSpeakingPage();
  prefetchVocabularyPage();
}

function NavItem({
  to,
  icon: Icon,
  label,
  onPrefetch,
}: {
  to: string;
  icon: typeof Home;
  label: string;
  onPrefetch?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      onTouchStart={onPrefetch}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors flex-1 ${
          isActive
            ? 'text-primary'
            : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
        }`
      }
    >
      <Icon size={22} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  useEffect(() => {
    const timeoutId = window.setTimeout(prefetchPrimaryTabs, 250);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 z-50">
      <div className="max-w-lg mx-auto flex items-end justify-between px-2 pt-2 pb-2">
        {leftItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <NavItem
          to="/luyen-noi"
          icon={Mic}
          label="Luyện nói"
          onPrefetch={prefetchSpeakingPage}
        />

        {rightItems.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            onPrefetch={
              item.to === '/tu-vung' ? prefetchVocabularyPage : undefined
            }
          />
        ))}
      </div>
    </nav>
  );
}
