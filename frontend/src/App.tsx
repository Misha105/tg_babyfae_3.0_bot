import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore, getCurrentStorageKey } from '@/store';
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
  
  // Get user ID once on mount - this value is stable after Telegram SDK initializes
  const userId = useMemo(() => getTelegramUserId(), []);
  
  // Compute auth error based on userId - no need for setState
  const authError = useMemo(() => {
    if (userId <= 0 && !import.meta.env.DEV) {
      return 'Не удалось получить данные пользователя Telegram. Пожалуйста, откройте приложение через Telegram.';
    }
    return null;
  }, [userId]);

  useEffect(() => {
    // Initialize Telegram SDK
    initTelegram();
    
    // Log auth status for debugging
    console.log('[App] Telegram User ID:', userId);
    console.log('[App] Storage key:', getCurrentStorageKey());
    console.log('[App] Is production:', !import.meta.env.DEV);
    
    if (userId > 0) {
      syncWithServer(userId);
    } else if (!import.meta.env.DEV) {
      console.error('[App] CRITICAL: No valid Telegram User ID in production!');
    }

    // Process offline queue on mount and when coming online
    processQueue();
    window.addEventListener('online', processQueue);
    
    return () => {
      window.removeEventListener('online', processQueue);
    };
  }, [syncWithServer, userId]);

  // Show error if authentication failed in production
  if (authError && !import.meta.env.DEV) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-900/20 p-4 rounded-full mb-4">
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Ошибка авторизации</h1>
        <p className="text-gray-400 mb-4 max-w-xs">{authError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

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
