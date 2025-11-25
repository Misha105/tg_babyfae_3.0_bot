import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore } from '@/store';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { CalendarView } from '@/features/calendar/CalendarView';
import { GrowthScreen } from '@/features/growth/GrowthScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { BottomNav } from '@/components/layout/BottomNav';
import { Header } from '@/components/ui/Header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { initTelegram } from '@/lib/telegram/init';
import { getTelegramUserId } from '@/lib/telegram/userData';
import { processQueue } from '@/lib/api/queue';
import { TelegramViewportSync } from '@/components/TelegramViewportSync';
import '@/lib/i18n';
import '@/mock-env';

function App() {
  const profile = useStore((state) => state.profile);
  const hasHydrated = useStore((state) => state._hasHydrated);
  const syncWithServer = useStore((state) => state.syncWithServer);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'calendar' | 'growth' | 'settings'>('dashboard');

  useEffect(() => {
    initTelegram();
    
    // Sync with server on mount
    const userId = getTelegramUserId();
    if (userId) {
      syncWithServer(userId);
    }

    // Process offline queue on mount and when coming online
    processQueue();
    window.addEventListener('online', processQueue);
    
    return () => {
      window.removeEventListener('online', processQueue);
    };
  }, [syncWithServer]);

  if (!hasHydrated) {
    return <LoadingSpinner />;
  }

  const renderView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <CalendarView />;
      case 'growth':
        return <GrowthScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <Dashboard />;
    }
  };

  if (!profile) {
    return (
      <>
        <TelegramViewportSync />
        <OnboardingScreen />
      </>
    );
  }

  return (
    <AppLayout>
      <TelegramViewportSync />
      {currentTab !== 'settings' && <Header />}
      {renderView()}
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
    </AppLayout>
  );
}

export default App;
