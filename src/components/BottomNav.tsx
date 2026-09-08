import React from 'react';
import { Disc, BookOpen, BarChart2, Settings } from 'lucide-react';

export type AppTab = 'counter' | 'library' | 'history' | 'settings';

interface BottomNavProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
}) => {
  const navItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'counter',
      label: 'شمارنده ذکر',
      icon: <Disc className="w-5 h-5" />,
    },
    {
      id: 'library',
      label: 'کتابخانه ذکر',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      id: 'history',
      label: 'آمار و پشتیبان',
      icon: <BarChart2 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'تنظیمات',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="منوی اصلی برنامه"
      className="w-full bg-[var(--bg)]/95 backdrop-blur-md border-t border-[var(--border)] px-2 py-1.5 sticky bottom-0 z-30 select-none"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all min-h-[52px] ${
                isActive
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] font-bold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <div className="mb-0.5">{item.icon}</div>
              <span className="text-[11px] leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
