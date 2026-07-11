import type { ReactNode } from 'react';
import BottomNav from './BottomNav';
import MiniPlayer from './MiniPlayer';
import { useHistory } from '../contexts/HistoryContext';

interface MobileLayoutProps {
  children: ReactNode;
  showPlayer?: boolean;
  showNav?: boolean;
}

export default function MobileLayout({
  children,
  showPlayer = true,
  showNav = true,
}: MobileLayoutProps) {
  const { currentLearningEntry } = useHistory();
  const hasPlayer = showPlayer && !!currentLearningEntry;
  const bottomPadding = showNav ? (hasPlayer ? 'pb-36' : 'pb-24') : 'pb-4';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className={`max-w-lg mx-auto ${bottomPadding}`}>
        {children}
      </div>
      {showPlayer && <MiniPlayer />}
      {showNav && <BottomNav />}
    </div>
  );
}