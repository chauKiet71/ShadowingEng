import type { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  showPlayer?: boolean;
  showNav?: boolean;
}

export default function MobileLayout({
  children,
  showNav = true,
}: MobileLayoutProps) {
  const bottomPadding = showNav ? 'pb-24' : 'pb-4';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <div className={`max-w-lg mx-auto ${bottomPadding}`}>
        {children}
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}