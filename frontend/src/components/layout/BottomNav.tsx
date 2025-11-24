import React from 'react';
import { Home, Calendar, Settings, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BottomNavProps {
  currentTab: 'dashboard' | 'calendar' | 'growth' | 'settings';
  onTabChange: (tab: 'dashboard' | 'calendar' | 'growth' | 'settings') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const { t } = useTranslation();

  const tabs = [
    { id: 'dashboard', icon: Home, label: t('nav.dashboard') },
    { id: 'calendar', icon: Calendar, label: t('nav.calendar') },
    { id: 'growth', icon: TrendingUp, label: t('nav.growth') },
    { id: 'settings', icon: Settings, label: t('nav.settings') },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              currentTab === tab.id ? 'text-blue-500' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <tab.icon size={24} />
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
